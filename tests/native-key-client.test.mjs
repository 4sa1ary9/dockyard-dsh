import assert from "node:assert/strict";
import test, { after } from "node:test";
import { NativeKeyPoolController } from "../packages/dsh-plugin/src/native-key-pool.mjs";

const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null, setItem() {} } });
after(() => {
  if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
  else delete globalThis.localStorage;
});

function setup({ mutateFails = false, describeFails = false } = {}) {
  const secrets = new Map();
  const value = { a: { apiKeyEnv: "OLD" }, b: { apiKeyEnv: "B" } };
  const api = {
    llm: { providers: async () => ({ providers: ["a", "b"].map((provider) => ({ provider, settingsNs: "llm-pi-ai", settingsPath: [provider] })) }) },
    settings: {
      describe: async () => {
        if (describeFails && secrets.size) throw new Error("offline");
        return { namespaces: [{ ns: "llm-pi-ai", revision: 1, value: structuredClone(value) }] };
      },
      mutate: async ({ ops }) => {
        if (mutateFails) throw new Error("revision mismatch");
        value[ops[0].path[0]].apiKeyEnv = ops[0].value;
      },
    },
    credentials: {
      describe: async () => ({ credentials: {} }),
      set: async ({ ref, value }) => { secrets.set(ref, value); },
      unset: async ({ ref }) => { secrets.delete(ref); },
    },
  };
  const controller = new NativeKeyPoolController(api, { nativeKeyRegister: async () => { throw new Error("registration failed"); } });
  return { controller, secrets, value };
}

test("first native refresh loads configuration and fetches live quota immediately", async () => {
  const { controller } = setup();
  const requests = [];
  controller.remote.nativeKeyRefresh = async (request) => {
    requests.push(request);
    return { quota: { remaining: 42 } };
  };
  const state = await controller.refresh("a");
  assert.deepEqual(requests, [{ providerId: "a" }]);
  assert.equal(state.quota.remaining, 42);
  assert.equal(state.status, "ready");
});

test("local configured keys are visible while the host pool is still loading", async () => {
  const { controller } = setup();
  controller.api.credentials.describe = async () => ({ credentials: { OLD: { configured: true, writable: true } } });
  let release;
  let started;
  const requested = new Promise((resolve) => { started = resolve; });
  controller.remote.nativeKeyStatus = () => new Promise((resolve) => { release = resolve; started(); });
  const pending = controller.load("a");
  await requested;
  const loading = controller.store.getSnapshot();
  assert.equal(loading.status, "ready");
  assert.equal(loading.keys.length, 1);
  assert.equal(loading.keys[0].configured, true);
  assert.equal(loading.action, "refresh");
  release({ keys: [] });
  await pending;
});

test("same-provider reload preserves known keys and a failed host read stays visible", async () => {
  const { controller } = setup();
  await controller.load("a");
  const previous = controller.store.getSnapshot();
  controller.setState({ quota: { remaining: 42 } });
  controller.remote.nativeKeyStatus = async () => { throw new Error("host unavailable"); };
  const pending = controller.load("a");
  assert.deepEqual(controller.store.getSnapshot().keys, previous.keys);
  assert.equal(controller.store.getSnapshot().quota.remaining, 42);
  const state = await pending;
  assert.equal(state.status, "ready");
  assert.equal(state.error, "host unavailable");
  assert.equal(state.keys.length, 1);
});

test("unsupported quota does not start a quota refresh", async () => {
  const { controller } = setup();
  controller.remote.nativeKeyStatus = async () => ({ quotaSupported: false, usage: { status: "unsupported" } });
  controller.remote.nativeKeyRefresh = async () => { assert.fail("unsupported provider has no quota endpoint"); };
  const state = await controller.refresh("a");
  assert.equal(state.quotaSupported, false);
  assert.equal(state.quotaRefreshing, false);
  assert.equal(state.usage.status, "unsupported");
});

test("a stalled read times out without hiding the configured key", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const { controller } = setup();
  let started;
  const requested = new Promise((resolve) => { started = resolve; });
  controller.remote.nativeKeyStatus = () => { started(); return new Promise(() => {}); };
  const pending = controller.load("a");
  await requested;
  context.mock.timers.tick(20_000);
  await new Promise(setImmediate);
  assert.equal(controller.store.getSnapshot().action, null);
  const state = await pending;
  assert.equal(state.status, "ready");
  assert.equal(state.action, null);
  assert.equal(state.keys.length, 1);
  assert.match(state.error, /timed out/i);
});

test("all prerequisite configuration reads time out and keep known keys available for retry", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  for (const [domain, method] of [["llm", "providers"], ["settings", "describe"], ["credentials", "describe"]]) {
    const { controller } = setup();
    await controller.load("a");
    const original = controller.api[domain][method];
    let started;
    const requested = new Promise((resolve) => { started = resolve; });
    controller.api[domain][method] = () => { started(); return new Promise(() => {}); };
    const pending = controller.load("a");
    await requested;
    context.mock.timers.tick(20_000);
    await new Promise(setImmediate);
    assert.equal(controller.store.getSnapshot().action, null, `${domain}.${method} must finish`);
    assert.equal(await pending, null);
    assert.equal(controller.store.getSnapshot().keys.length, 1);
    assert.match(controller.store.getSnapshot().error, /timed out/i);
    controller.api[domain][method] = original;
    const retried = await controller.load("a");
    assert.equal(retried.status, "ready");
    assert.equal(retried.error, null);
  }
});

test("quota refresh has its own pending state and clears it on failure", async () => {
  const { controller } = setup();
  let reject;
  let started;
  const requested = new Promise((resolve) => { started = resolve; });
  controller.remote.nativeKeyRefresh = () => new Promise((_, fail) => { reject = fail; started(); });
  const pending = controller.refresh("a");
  await requested;
  assert.equal(controller.store.getSnapshot().quotaRefreshing, true);
  assert.equal(controller.store.getSnapshot().action, "refresh");
  assert.equal(controller.store.getSnapshot().keys.length, 1);
  reject(new Error("quota unavailable"));
  const state = await pending;
  assert.equal(state.quotaRefreshing, false);
  assert.equal(state.action, null);
  assert.equal(state.error, "quota unavailable");
});

test("DSH account providers remain a normal unsupported state with their settings metadata", async () => {
  const { controller } = setup();
  controller.api.llm.providers = async () => ({ providers: [{ provider: "deepseek", settingsNs: "llm-deepseek", settingsPath: [] }] });
  controller.api.settings.describe = async () => ({ namespaces: [{ ns: "llm-deepseek", value: { models: {} } }] });
  assert.equal(await controller.refresh("deepseek"), null);
  const state = controller.store.getSnapshot();
  assert.equal(state.status, "unsupported");
  assert.equal(state.native, false);
  assert.equal(state.action, null);
  assert.equal(state.error, null);
  assert.equal(state.namespace.ns, "llm-deepseek");
  assert.deepEqual(state.profile, { models: {} });
});

test("late native quota cannot overwrite a switched provider", async () => {
  for (const background of [false, true]) {
    const { controller } = setup();
    let resolve;
    let started;
    const refreshing = new Promise((done) => { started = done; });
    controller.remote.nativeKeyRefresh = () => new Promise((done) => { resolve = done; started(); });
    await controller.load("a");
    const pending = controller.refresh("a", { background });
    await refreshing;
    await controller.load("b");
    resolve({ keys: [{ ref: "A" }], quota: { remaining: 1 } });
    assert.equal(await pending, null);
    assert.equal(controller.store.getSnapshot().providerId, "b");
    assert.equal(controller.store.getSnapshot().quota, null);
  }
});

test("switching native providers supersedes an unfinished configuration refresh", async () => {
  const { controller } = setup();
  const providers = controller.api.llm.providers;
  let release;
  controller.api.llm.providers = () => new Promise((resolve) => { release = resolve; });
  const pending = controller.refresh("a");
  assert.equal(controller.store.getSnapshot().action, "refresh");
  controller.api.llm.providers = providers;
  const state = await controller.refresh("b");
  assert.equal(state.providerId, "b");
  assert.equal(state.status, "ready");
  release(await providers());
  assert.equal(await pending, null);
  assert.equal(controller.store.getSnapshot().providerId, "b");
  assert.equal(controller.store.getSnapshot().apiKeyRef, "B");
});

test("provider switching cannot interrupt a key write's configuration load", async () => {
  const { controller, value } = setup();
  const providers = controller.api.llm.providers;
  let release;
  controller.api.llm.providers = () => new Promise((resolve) => { release = resolve; });
  controller.remote.nativeKeyRegister = async () => ({});
  const pending = controller.addKey("a", "fake-secret");
  assert.equal(controller.store.getSnapshot().action, "add");
  assert.equal(await controller.refresh("b"), null);
  assert.equal(controller.store.getSnapshot().providerId, "a");
  controller.api.llm.providers = providers;
  release(await providers());
  const state = await pending;
  assert.equal(state.providerId, "a");
  assert.notEqual(value.a.apiKeyEnv, "OLD");
  assert.equal(value.b.apiKeyEnv, "B");
});

test("background refresh keeps UI state and yields to a user policy action", async () => {
  const { controller } = setup();
  await controller.load("a");
  controller.setState({ message: "saved", keys: [{ ref: "OLD" }] });
  let resolve;
  controller.remote.nativeKeyRefresh = () => new Promise((done) => { resolve = done; });
  const pending = controller.refresh("a", { background: true });
  assert.equal(controller.store.getSnapshot().message, "saved");
  assert.equal(controller.store.getSnapshot().keys[0].ref, "OLD");
  await controller.setPolicy("a", "failover");
  resolve({ policy: "manual", keys: [] });
  assert.equal(await pending, null);
  assert.equal(controller.store.getSnapshot().policy, "failover");
  controller.setState({ action: "add" });
  assert.equal(await controller.refresh("a", { background: true }), null);
});

test("retrying a failed policy update clears the previous error", async () => {
  const { controller } = setup();
  await controller.load("a");
  controller.remote.nativeKeySetPolicy = async () => { throw new Error("policy update failed"); };
  assert.equal(await controller.setPolicy("a", "failover"), null);
  assert.equal(controller.store.getSnapshot().error, "policy update failed");
  controller.remote.nativeKeySetPolicy = async () => ({});
  const state = await controller.setPolicy("a", "round_robin");
  assert.equal(state.policy, "round_robin");
  assert.equal(state.error, null);
  assert.ok(state.message);
});

test("failed add removes an unused secret but keeps a selected or unverified secret", async () => {
  for (const options of [{ mutateFails: true }, {}, { mutateFails: true, describeFails: true }]) {
    const { controller, secrets, value } = setup(options);
    await controller.load("a");
    assert.equal(await controller.addKey("a", "fake-secret"), null);
    const retained = Boolean(!options.mutateFails || options.describeFails);
    assert.equal(secrets.size, retained ? 1 : 0);
    if (!options.mutateFails) assert.ok(secrets.has(value.a.apiKeyEnv));
    assert.equal(controller.store.getSnapshot().error.includes("was kept"), retained);
  }
});
