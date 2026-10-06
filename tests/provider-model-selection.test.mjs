import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { readFile } from "node:fs/promises";
import { createSnapshotStore } from "@deepseek-ai/dsh-client-store";

import { chooseProviderModel, ProviderModelSelectionController } from "../packages/dsh-plugin/src/model-selection.mjs";

const group = (id, ...models) => ({ id, name: id, models: models.map((id) => ({ id, name: id })) });
const ready = (groups, current = { provider: "old", model: "old-model", reasoningEffort: "old-effort" }) => ({
  current, groups, failures: [], status: "ready", error: null,
});

function fixture(state, options = {}) {
  const calls = [];
  const directory = {
    store: createSnapshotStore(state),
    load: async () => directory.store.getSnapshot(),
    select: async (selection) => {
      calls.push(selection);
      directory.store.set({ ...directory.store.getSnapshot(), current: selection });
      return { ok: true, value: undefined };
    },
  };
  const controller = new ProviderModelSelectionController(directory, options);
  return { directory, controller, calls };
}

test("provider-owned current ID wins, then last selection, public default, and first model", () => {
  const groups = [group("other", "outside"), group("target", "first", "default", "last", "shared")];
  const options = {
    providerId: "target", groups, current: { provider: "other", model: "shared", reasoningEffort: "invalid" },
    lastModel: "last", defaultSelection: { provider: "target", model: "default" },
  };
  assert.deepEqual(chooseProviderModel(options), { provider: "target", model: "shared" });
  assert.deepEqual(chooseProviderModel({ ...options, current: { model: "outside" } }), { provider: "target", model: "last" });
  assert.deepEqual(chooseProviderModel({ ...options, current: null, lastModel: "removed" }), { provider: "target", model: "default" });
  assert.deepEqual(chooseProviderModel({ ...options, current: null, lastModel: "removed", defaultSelection: { provider: "other", model: "outside" } }), { provider: "target", model: "first" });
  assert.equal(chooseProviderModel({ ...options, providerId: "missing" }), null);
  assert.equal(chooseProviderModel({ ...options, groups: [group("target", "", "   ")] }), null);
});

test("provider change submits exactly one complete valid pair without stale reasoning effort", async () => {
  const { controller, calls } = fixture(ready([group("target", "shared")], { provider: "old", model: "shared", reasoningEffort: "old-effort" }), {
    loadCatalog: () => assert.fail("valid current model should not need a second catalog request"),
  });
  assert.deepEqual(await controller.selectProvider("target"), { provider: "target", model: "shared" });
  assert.deepEqual(calls, [{ provider: "target", model: "shared" }]);
  assert.deepEqual(controller.store.getSnapshot(), { providerId: "target", pending: false, error: null });
});

test("last selections survive returning to a provider and a control remount but stay session-scoped", async () => {
  const state = ready([group("alpha", "first", "chosen"), group("beta", "only")], { provider: "alpha", model: "chosen" });
  const { controller, directory, calls } = fixture(state);
  await controller.selectProvider("beta");
  const remounted = new ProviderModelSelectionController(directory);
  await remounted.selectProvider("alpha");
  assert.deepEqual(calls, [{ provider: "beta", model: "only" }, { provider: "alpha", model: "chosen" }]);
  const secondSession = fixture(ready(state.groups));
  await secondSession.controller.selectProvider("alpha");
  assert.deepEqual(secondSession.calls, [{ provider: "alpha", model: "first" }]);
});

test("real catalog default is considered before the first model and is validated against its group", async () => {
  for (const defaultSelection of [{ provider: "target", model: "preferred" }, { provider: "target", model: "removed" }]) {
    const state = ready([group("target", "first", "preferred")]);
    let reads = 0;
    const { controller, calls } = fixture(state, { loadCatalog: async () => {
      reads++;
      return { ok: true, value: { groups: state.groups, default: defaultSelection, failures: [] } };
    } });
    await controller.selectProvider("target");
    assert.equal(reads, 1);
    assert.deepEqual(calls, [{ provider: "target", model: defaultSelection.model === "preferred" ? "preferred" : "first" }]);
  }
});

test("async directory loading finishes before choosing a model, including initially absent groups", async () => {
  const loading = Promise.withResolvers();
  const { directory, controller, calls } = fixture(ready([]));
  directory.load = () => loading.promise;
  const selecting = controller.selectProvider("target");
  assert.equal(controller.store.getSnapshot().pending, true);
  assert.deepEqual(calls, []);
  directory.store.set(ready([group("target", "late-model")]));
  loading.resolve(directory.store.getSnapshot());
  await selecting;
  assert.deepEqual(calls, [{ provider: "target", model: "late-model" }]);
});

test("fresh public catalog may supply models not yet projected into the directory", async () => {
  const loading = Promise.withResolvers();
  const { controller, calls } = fixture(ready([]), { loadCatalog: () => loading.promise });
  const selecting = controller.selectProvider("target");
  await setImmediate();
  assert.deepEqual(calls, []);
  loading.resolve({ ok: true, value: { groups: [group("target", "late-default")], default: { provider: "target", model: "late-default" }, failures: [] } });
  await selecting;
  assert.deepEqual(calls, [{ provider: "target", model: "late-default" }]);
});

test("empty catalogs stop immediately with an error and never submit an invalid provider/model", async () => {
  for (const groups of [[], [group("target")], [group("unrelated", "other")]]) {
    const { controller, calls } = fixture(ready(groups));
    assert.equal(await controller.selectProvider("target"), null);
    assert.equal(controller.store.getSnapshot().pending, false);
    assert.match(controller.store.getSnapshot().error, /No available models/);
    assert.deepEqual(calls, []);
  }
});

test("catalog, provider-local, and RemoteResult selection failures are exposed and permit retry", async () => {
  const { directory, controller, calls } = fixture(ready([group("target", "model")]));
  directory.load = async () => { throw new Error("catalog unavailable"); };
  await controller.selectProvider("target");
  assert.match(controller.store.getSnapshot().error, /catalog unavailable/);
  assert.equal(controller.store.getSnapshot().pending, false);
  assert.deepEqual(calls, []);
  directory.load = async () => directory.store.getSnapshot();
  const originalSelect = directory.select;
  directory.select = async () => ({ ok: false, error: { code: "session/writer-held", message: "Session is in use" } });
  await controller.selectProvider("target");
  assert.match(controller.store.getSnapshot().error, /Session is in use/);
  assert.equal(controller.store.getSnapshot().pending, false);
  directory.select = originalSelect;
  await controller.selectProvider("target");
  assert.equal(controller.store.getSnapshot().error, null);
  assert.deepEqual(calls, [{ provider: "target", model: "model" }]);

  const empty = fixture({ ...ready([]), failures: [{ id: "target", message: "Sign in to load models" }] });
  await empty.controller.selectProvider("target");
  assert.equal(empty.controller.store.getSnapshot().error, "Sign in to load models");
  const remoteFailure = fixture(ready([]), { loadCatalog: async () => ({ ok: false, error: { message: "Host offline" } }) });
  await remoteFailure.controller.selectProvider("target");
  assert.equal(remoteFailure.controller.store.getSnapshot().error, "Host offline");
});

test("superseded catalog responses cannot submit stale selections or errors", async () => {
  for (const reject of [false, true]) {
    const loading = Promise.withResolvers();
    const { directory, controller, calls } = fixture(ready([group("alpha", "a"), group("beta", "b")]));
    let loads = 0;
    directory.load = () => ++loads === 1 ? loading.promise : Promise.resolve(directory.store.getSnapshot());
    const first = controller.selectProvider("alpha");
    const second = controller.selectProvider("beta");
    assert.equal(await first, null, "old UI promise settles without waiting for its stale RPC");
    await second;
    if (reject) loading.reject(new Error("late failure")); else loading.resolve(directory.store.getSnapshot());
    await setImmediate();
    assert.deepEqual(calls, [{ provider: "beta", model: "b" }]);
    assert.deepEqual(controller.store.getSnapshot(), { providerId: "beta", pending: false, error: null });
  }
});

test("once submitted, Host writes serialize; queued intermediate provider intents are discarded", async () => {
  const firstWrite = Promise.withResolvers();
  const { directory, controller } = fixture(ready([group("alpha", "a"), group("beta", "b"), group("gamma", "c")]));
  const calls = [];
  directory.select = async (selection) => {
    calls.push(selection);
    if (selection.provider === "alpha") await firstWrite.promise;
    directory.store.set({ ...directory.store.getSnapshot(), current: selection });
    return { ok: true };
  };
  const first = controller.selectProvider("alpha");
  await setImmediate();
  assert.equal(calls.length, 1);
  const second = controller.selectProvider("beta");
  await setImmediate();
  const third = controller.selectProvider("gamma");
  await setImmediate();
  assert.deepEqual(calls, [{ provider: "alpha", model: "a" }]);
  firstWrite.resolve();
  await Promise.all([first, second, third]);
  assert.deepEqual(calls, [{ provider: "alpha", model: "a" }, { provider: "gamma", model: "c" }]);
  assert.deepEqual(directory.store.getSnapshot().current, { provider: "gamma", model: "c" });
  assert.equal(controller.store.getSnapshot().pending, false);
});

test("queued selection revalidates a refreshed catalog rather than submitting a removed model", async () => {
  const firstWrite = Promise.withResolvers();
  const { directory, controller } = fixture(ready([group("alpha", "a"), group("beta", "old") ]));
  const calls = [];
  directory.select = async (selection) => {
    calls.push(selection);
    if (selection.provider === "alpha") await firstWrite.promise;
    return { ok: true };
  };
  const first = controller.selectProvider("alpha");
  await setImmediate();
  const second = controller.selectProvider("beta");
  await setImmediate();
  directory.store.set(ready([group("alpha", "a"), group("beta", "new")]));
  firstWrite.resolve();
  await Promise.all([first, second]);
  assert.deepEqual(calls, [{ provider: "alpha", model: "a" }, { provider: "beta", model: "new" }]);
});

test("stalled catalogs and writes time out visibly, and late catalogs do not select afterwards", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const stage of ["load", "select"]) {
    const blocked = Promise.withResolvers();
    const { directory, controller, calls } = fixture(ready([group("target", "model")]), { timeoutMs: 50 });
    directory[stage] = () => blocked.promise;
    const selecting = controller.selectProvider("target");
    await setImmediate();
    t.mock.timers.tick(50);
    assert.equal(await selecting, null);
    assert.equal(controller.store.getSnapshot().pending, false);
    assert.match(controller.store.getSnapshot().error, /timed out/);
    blocked.resolve(stage === "load" ? directory.store.getSnapshot() : { ok: true });
    await setImmediate();
    assert.deepEqual(calls, []);
    assert.match(controller.store.getSnapshot().error, /timed out/);
  }
});

test("unmount/session change cancels a pending directory read without writing the old session", async () => {
  const blocked = Promise.withResolvers();
  const { controller, directory, calls } = fixture(ready([group("target", "model")]));
  directory.load = () => blocked.promise;
  const selecting = controller.selectProvider("target");
  controller.cancel();
  await selecting;
  blocked.resolve(directory.store.getSnapshot());
  await setImmediate();
  assert.deepEqual(calls, []);
  assert.equal(controller.store.getSnapshot().pending, false);
});

test("manual model and reasoning selections share the provider write queue and validate advertised values", async () => {
  const blocked = Promise.withResolvers();
  const groups = [group("alpha", "a", "other"), group("beta", "b")];
  groups[0].models[1].reasoning = { efforts: [{ id: "high" }] };
  const { controller, directory } = fixture(ready(groups));
  const calls = [];
  directory.select = async (selection) => {
    calls.push(selection);
    if (calls.length === 1) await blocked.promise;
    directory.store.set({ ...directory.store.getSnapshot(), current: selection });
    return { ok: true };
  };
  const manual = controller.selectModel({ provider: "alpha", model: "other", reasoningEffort: "high" });
  await setImmediate();
  const auto = controller.selectProvider("beta");
  await setImmediate();
  assert.equal(calls.length, 1);
  blocked.resolve();
  await Promise.all([manual, auto]);
  assert.deepEqual(calls, [{ provider: "alpha", model: "other", reasoningEffort: "high" }, { provider: "beta", model: "b" }]);
  assert.equal(await controller.selectModel({ provider: "alpha", model: "missing" }), null);
  assert.equal(await controller.selectModel({ provider: "alpha", model: "other", reasoningEffort: "invalid" }), null);
  assert.equal(calls.length, 2);
  assert.match(controller.store.getSnapshot().error, /reasoning effort/);
});

test("a manual choice supersedes delayed automatic selection and is remembered", async () => {
  const loading = Promise.withResolvers();
  const { directory, controller, calls } = fixture(ready([group("target", "first", "chosen"), group("other", "model")]));
  let loads = 0;
  directory.load = () => ++loads === 1 ? loading.promise : Promise.resolve(directory.store.getSnapshot());
  const automatic = controller.selectProvider("target");
  await controller.selectModel({ provider: "target", model: "chosen" });
  loading.resolve(directory.store.getSnapshot());
  await automatic;
  await controller.selectProvider("other");
  await controller.selectProvider("target");
  assert.deepEqual(calls, [{ provider: "target", model: "chosen" }, { provider: "other", model: "model" }, { provider: "target", model: "chosen" }]);
});

test("a remounted controller waits for the previous control's submitted write", async () => {
  const blocked = Promise.withResolvers();
  const { directory, controller } = fixture(ready([group("alpha", "a"), group("beta", "b")]));
  const calls = [];
  directory.select = async (selection) => {
    calls.push(selection);
    if (calls.length === 1) await blocked.promise;
    directory.store.set({ ...directory.store.getSnapshot(), current: selection });
    return { ok: true };
  };
  const first = controller.selectProvider("alpha");
  await setImmediate();
  controller.cancel();
  const remounted = new ProviderModelSelectionController(directory);
  const second = remounted.selectProvider("beta");
  await setImmediate();
  assert.equal(calls.length, 1);
  blocked.resolve();
  await Promise.all([first, second]);
  assert.deepEqual(calls, [{ provider: "alpha", model: "a" }, { provider: "beta", model: "b" }]);
});

test("an unresolved timed-out write remains a barrier without leaving new selection UI pending forever", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const blocked = Promise.withResolvers();
  const { directory, controller } = fixture(ready([group("alpha", "a"), group("beta", "b")]), { timeoutMs: 50 });
  const calls = [];
  directory.select = async (selection) => {
    calls.push(selection);
    if (calls.length === 1) await blocked.promise;
    return { ok: true };
  };
  const first = controller.selectProvider("alpha");
  await setImmediate();
  t.mock.timers.tick(50);
  await first;
  const second = controller.selectProvider("beta");
  await setImmediate();
  assert.equal(calls.length, 1);
  t.mock.timers.tick(50);
  await second;
  assert.equal(controller.store.getSnapshot().pending, false);
  assert.match(controller.store.getSnapshot().error, /timed out/);
  blocked.resolve();
  await setImmediate();
  assert.equal(calls.length, 1, "timed-out queued intent must not write on late release");
  await controller.selectProvider("beta");
  assert.deepEqual(calls, [{ provider: "alpha", model: "a" }, { provider: "beta", model: "b" }]);
});

test("a delayed current projection does not erase a successful manual choice", async () => {
  const state = ready([group("alpha", "first", "chosen"), group("beta", "b")], { provider: "alpha", model: "first" });
  const { directory, controller } = fixture(state);
  const calls = [];
  directory.select = async (selection) => {
    calls.push(selection);
    // Host success is returned before the durable current projection arrives.
    return { ok: true };
  };
  await controller.selectModel({ provider: "alpha", model: "chosen" });
  await controller.selectProvider("beta");
  directory.store.set({ ...state, current: { provider: "beta", model: "b" } });
  await controller.selectProvider("alpha");
  assert.deepEqual(calls, [{ provider: "alpha", model: "chosen" }, { provider: "beta", model: "b" }, { provider: "alpha", model: "chosen" }]);
});

test("retry repeats the failed manual model intent rather than choosing a fallback model", async () => {
  const { directory, controller, calls } = fixture(ready([group("target", "first", "chosen")]));
  const successfulSelect = directory.select;
  directory.select = async () => ({ ok: false, error: { message: "Try again" } });
  await controller.selectModel({ provider: "target", model: "chosen" });
  assert.equal(controller.store.getSnapshot().error, "Try again");
  directory.select = successfulSelect;
  await controller.retry();
  assert.deepEqual(calls, [{ provider: "target", model: "chosen" }]);
  assert.equal(controller.store.getSnapshot().error, null);
});

test("client provider navigation calls selection, surfaces status, and preserves settings-only navigation", async () => {
  // Keep the production wiring covered without introducing a browser/renderer
  // dependency into this Node-only repository test suite.
  const source = await readFile(new URL("../packages/dsh-plugin/src/dockyard-client.mjs", import.meta.url), "utf8");
  const account = source.slice(source.indexOf("function DockyardAccountControl("));
  assert.match(account, /const selectProvider = \(selectedProviderId\) => \{[\s\S]*?modelSelector\.selectProvider\(selectedProviderId\)/);
  assert.match(account, /modelSelector\.remember\(directoryState\.current\)/);
  assert.match(account, /modelSelector\.cancel\(\)/);
  assert.match(source, /const loadModelCatalog = .*modelCatalog\(\)/);
  assert.match(source, /modelSelector\.selectModel\(selection\)/);
  assert.match(source, /role: state\.error \? "alert" : "status"/);
  assert.match(source, /h\(ModelSelectionStatus, \{ state: selectionStatus, onRetry:/);
  assert.match(source, /modelSelector\.retry\(\)/);
  const settings = source.slice(source.indexOf("function SubscriptionSettingsSection("), source.indexOf("function DockyardPopup("));
  assert.match(settings, /onSelectProvider: setSelectedProviderId/);
  assert.doesNotMatch(settings, /selectProvider\(/);
});
