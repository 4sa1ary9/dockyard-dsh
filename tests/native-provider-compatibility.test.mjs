import test, { after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { createNativeKeyApi, NativeKeyPoolController } from "../packages/dsh-plugin/src/native-key-pool.mjs";
import { NativeKeyPoolHost } from "../packages/dsh-plugin/src/native-key-pool-host.mjs";
import { usageModuleFor } from "../packages/dsh-plugin/src/native-usage.mjs";

// All configuration, credential metadata and credential values below are synthetic.
// Neither controller storage nor Host credentials can reach a real user profile.
const PROVIDER_ID = "compat-custom-route";
const KEY_REF = "COMPAT_API_KEY";
const FAKE_KEY = "fixture-only-not-a-real-api-key";
const localValues = new Map();
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key) => localValues.get(key) ?? null,
    setItem: (key, value) => localValues.set(key, String(value)),
    removeItem: (key) => localValues.delete(key),
  },
});
beforeEach((t) => {
  localValues.clear();
  t.mock.method(globalThis, "fetch", async () => {
    assert.fail("A compatibility test attempted an unmocked network request");
  });
});
after(() => {
  if (originalLocalStorage) Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  else delete globalThis.localStorage;
});

const ok = (value) => ({ ok: true, value });
const failed = (message) => ({ ok: false, error: { code: "gateway/test-failure", message } });
const credentialInfo = () => ({ configured: true, writable: true });

function createModernRemotes() {
  const settingsNs = "compat-custom-settings";
  const settingsPath = ["profiles", PROVIDER_ID];
  const catalog = [{ provider: PROVIDER_ID, displayName: "Compatibility route", settingsNs, settingsPath }];
  const namespace = {
    ns: settingsNs,
    revision: 7,
    value: { profiles: { [PROVIDER_ID]: { apiKeyEnv: KEY_REF, baseURL: "https://api.deepseek.com/v1" } } },
  };
  const settingsValue = {
    writable: true,
    hasDocument: true,
    namespaces: [
      { ns: "llm-pi-ai", revision: 1, value: { profiles: { [PROVIDER_ID]: { apiKeyEnv: "WRONG_NAMESPACE_KEY" } } } },
      namespace,
    ],
  };
  const results = {
    settings: ok(settingsValue),
    set: ok(credentialInfo()),
    unset: ok({ configured: false, writable: true }),
    mutate: ok({ ...namespace, revision: 8 }),
  };
  const calls = [];
  const record = (method, args, arity) => {
    assert.equal(args.length, arity, `${method} must receive exactly ${arity} positional arguments`);
    calls.push({ method, args });
  };
  const remote = {
    llm: {
      async listConfigurableProviders(...args) {
        assert.equal(this, remote.llm);
        record("llm.listConfigurableProviders", args, 0);
        return ok(catalog);
      },
    },
    settings: {
      async describe(...args) {
        assert.equal(this, remote.settings);
        record("settings.describe", args, 0);
        return results.settings;
      },
      async mutate(...args) {
        assert.equal(this, remote.settings);
        record("settings.mutate", args, 3);
        return results.mutate;
      },
    },
    credentials: {
      async describe(...args) {
        assert.equal(this, remote.credentials);
        record("credentials.describe", args, 1);
        const [refs] = args;
        assert.ok(Array.isArray(refs), "credentials.describe receives an array, not { refs }");
        assert.ok(refs.length <= 64);
        for (const ref of refs) assert.match(ref, /^[A-Za-z_][A-Za-z0-9_]*$/);
        return ok(Object.fromEntries(refs.map((ref) => [ref, credentialInfo()])));
      },
      async set(...args) {
        assert.equal(this, remote.credentials);
        record("credentials.set", args, 2);
        return results.set;
      },
      async unset(...args) {
        assert.equal(this, remote.credentials);
        record("credentials.unset", args, 1);
        return results.unset;
      },
    },
  };
  return { remote, calls, catalog, namespace, settingsValue, results };
}

test("adapter uses exact modern positional methods and preserves settings/write envelopes", async () => {
  const { remote, calls, catalog, namespace, results } = createModernRemotes();
  const api = createNativeKeyApi(remote);
  const refs = [KEY_REF, "COMPAT_SECOND_KEY"];
  const ops = [{ op: "set", path: ["profiles", PROVIDER_ID, "apiKeyEnv"], value: refs[1] }];

  // The controller has a local object-shaped API; generated Remotes do not.
  assert.deepEqual(await api.llm.providers({}), { providers: catalog });
  assert.strictEqual(await api.settings.describe({}), results.settings);
  assert.deepEqual(await api.credentials.describe({ refs }), {
    credentials: Object.fromEntries(refs.map((ref) => [ref, credentialInfo()])),
  });
  assert.strictEqual(await api.credentials.set({ ref: refs[1], value: FAKE_KEY }), results.set);
  assert.strictEqual(await api.credentials.unset({ ref: refs[1] }), results.unset);
  assert.strictEqual(await api.settings.mutate({ ns: namespace.ns, ops, expectedRevision: 7 }), results.mutate);
  assert.deepEqual(calls, [
    { method: "llm.listConfigurableProviders", args: [] },
    { method: "settings.describe", args: [] },
    { method: "credentials.describe", args: [refs] },
    { method: "credentials.set", args: [refs[1], FAKE_KEY] },
    { method: "credentials.unset", args: [refs[1]] },
    { method: "settings.mutate", args: [namespace.ns, ops, 7] },
  ]);
});

test("adapter batches every credential reference exactly once at the 64-ref boundary", async (t) => {
  for (const count of [0, 1, 64, 65, 128, 129]) {
    await t.test(`${count} refs`, async () => {
      const { remote, calls } = createModernRemotes();
      const refs = Array.from({ length: count }, (_, index) => `COMPAT_KEY_${index}`);
      const originalRefs = [...refs];
      const described = await createNativeKeyApi(remote).credentials.describe({ refs });
      const batches = calls.map(({ args }) => args[0]);
      assert.deepEqual(batches.map((batch) => batch.length), Array.from(
        { length: Math.ceil(count / 64) }, (_, index) => Math.min(64, count - index * 64),
      ));
      assert.deepEqual(batches.flat(), originalRefs);
      assert.deepEqual(refs, originalRefs, "batching must not consume the caller's array");
      assert.deepEqual(described, {
        credentials: Object.fromEntries(originalRefs.map((ref) => [ref, credentialInfo()])),
      });
    });
  }
});

test("adapter rejects catalog and credential error envelopes, including code-only errors", async () => {
  for (const envelope of [failed("wire read failed"), { ok: false, error: { code: "gateway/read-failed" } }]) {
    const api = createNativeKeyApi({
      llm: { listConfigurableProviders: async () => envelope },
      credentials: { describe: async () => envelope },
    });
    const expectedMessage = envelope.error.message ?? envelope.error.code;
    await assert.rejects(() => api.llm.providers({}), { message: expectedMessage });
    await assert.rejects(() => api.credentials.describe({ refs: [KEY_REF] }), { message: expectedMessage });
  }
});

test("adapter never returns a partial credential map after a later batch fails", async () => {
  const calls = [];
  const refs = Array.from({ length: 129 }, (_, index) => `COMPAT_KEY_${index}`);
  const api = createNativeKeyApi({
    credentials: {
      async describe(...args) {
        assert.equal(args.length, 1);
        const [batch] = args;
        calls.push(batch);
        return calls.length === 2
          ? failed("second credential batch failed")
          : ok(Object.fromEntries(batch.map((ref) => [ref, credentialInfo()])));
      },
    },
  });
  await assert.rejects(() => api.credentials.describe({ refs }), /second credential batch failed/);
  assert.deepEqual(calls, [refs.slice(0, 64), refs.slice(64, 128)]);
});

test("adapter passes through failed settings and write envelopes for controller handling", async () => {
  const failure = failed("write or settings read rejected");
  const api = createNativeKeyApi({
    settings: { describe: async () => failure, mutate: async () => failure },
    credentials: { set: async () => failure, unset: async () => failure },
  });
  assert.strictEqual(await api.settings.describe({}), failure);
  assert.strictEqual(await api.credentials.set({ ref: KEY_REF, value: FAKE_KEY }), failure);
  assert.strictEqual(await api.credentials.unset({ ref: KEY_REF }), failure);
  assert.strictEqual(await api.settings.mutate({ ns: "custom", ops: [], expectedRevision: 0 }), failure);
});

test("controller load/refresh leave idle on missing APIs, clear the action, and permit retry", async (t) => {
  for (const operation of ["load", "refresh"]) {
    for (const missing of ["api", "llm.providers", "settings.describe"]) {
      await t.test(`${operation}: missing ${missing}`, async () => {
        const { remote, calls } = createModernRemotes();
        const api = createNativeKeyApi(remote);
        let refreshCalls = 0;
        const controller = new NativeKeyPoolController(api, {
          nativeKeyStatus: async () => ok({ quotaSupported: true }),
          nativeKeyRefresh: async (request) => {
            assert.deepEqual(request, { providerId: PROVIDER_ID });
            refreshCalls += 1;
            return ok({ usage: { status: "ok" }, quotaSupported: true });
          },
        });
        let restore;
        if (missing === "api") {
          controller.api = undefined;
          restore = () => { controller.api = api; };
        } else {
          const [namespace, method] = missing.split(".");
          const original = api[namespace][method];
          api[namespace][method] = undefined;
          restore = () => { api[namespace][method] = original; };
        }
        assert.equal(controller.store.getSnapshot().status, "idle");
        assert.equal(await controller[operation](PROVIDER_ID), null);
        const errorState = controller.store.getSnapshot();
        assert.equal(errorState.status, "error");
        assert.equal(errorState.providerId, PROVIDER_ID);
        assert.equal(errorState.action, null);
        assert.equal(errorState.quotaRefreshing, false);
        assert.match(errorState.error, /configuration.*unavailable/i);
        assert.deepEqual(calls, [], "missing dependencies must fail before starting Remote reads");
        assert.equal(refreshCalls, 0);

        restore();
        const ready = await controller[operation](PROVIDER_ID);
        assert.equal(ready.status, "ready");
        assert.equal(ready.action, null);
        assert.equal(ready.error, null);
        assert.equal(ready.native, true);
        assert.equal(ready.apiKeyRef, KEY_REF);
        assert.equal(ready.namespace.ns, "compat-custom-settings");
        assert.equal(ready.keys[0].configured, true);
        assert.equal(refreshCalls, operation === "refresh" ? 1 : 0);
      });
    }
  }
});

test("controller surfaces each modern Remote read failure instead of accepting its envelope as data", async (t) => {
  for (const [namespace, method] of [["llm", "listConfigurableProviders"], ["settings", "describe"], ["credentials", "describe"]]) {
    await t.test(`${namespace}.${method}`, async () => {
      const { remote } = createModernRemotes();
      const message = `${namespace}.${method} failed remotely`;
      remote[namespace][method] = async () => failed(message);
      const controller = new NativeKeyPoolController(createNativeKeyApi(remote), {});
      assert.equal(await controller.load(PROVIDER_ID), null);
      assert.equal(controller.store.getSnapshot().status, "error");
      assert.equal(controller.store.getSnapshot().action, null);
      assert.equal(controller.store.getSnapshot().error, message);
    });
  }
});

test("controller surfaces modern set, unset, and mutate failures rather than reporting success", async (t) => {
  for (const [namespace, method, action] of [
    ["credentials", "set", (controller) => controller.addKey(PROVIDER_ID, FAKE_KEY)],
    ["credentials", "unset", (controller) => controller.removeKey(PROVIDER_ID, KEY_REF)],
    ["settings", "mutate", (controller) => controller.selectKey(PROVIDER_ID, KEY_REF)],
  ]) {
    await t.test(`${namespace}.${method}`, async () => {
      const { remote } = createModernRemotes();
      const message = `${namespace}.${method} rejected remotely`;
      let rejectedCalls = 0;
      remote[namespace][method] = async () => {
        rejectedCalls += 1;
        return failed(message);
      };
      const controller = new NativeKeyPoolController(createNativeKeyApi(remote), {});
      assert.equal((await controller.load(PROVIDER_ID)).status, "ready");
      assert.equal(await action(controller), null);
      assert.equal(rejectedCalls, 1);
      const state = controller.store.getSnapshot();
      assert.equal(state.status, "error");
      assert.equal(state.action, null);
      assert.equal(state.message, null);
      assert.ok(state.error.includes(message), state.error);
      assert.equal(JSON.stringify([...localValues]).includes(FAKE_KEY), false);
    });
  }
});

function createMemoryHost({ settingsNs, profile }) {
  const values = new Map([[KEY_REF, FAKE_KEY]]);
  const calls = { settings: [], describe: [], resolve: [] };
  const listeners = new Map();
  const llm = {
    adapters: new Map([[PROVIDER_ID, { adapter: { config: {} } }]]),
    listConfigurableProviders: () => [{ provider: PROVIDER_ID, settingsNs, settingsPath: ["profiles", PROVIDER_ID] }],
  };
  const settings = {
    describe(...args) {
      assert.deepEqual(args, [{ redactSecrets: true }]);
      calls.settings.push(args);
      return [
        { ns: "unrelated-settings", value: { profiles: { [PROVIDER_ID]: { apiKeyEnv: "WRONG_KEY" } } } },
        { ns: settingsNs, value: { profiles: { [PROVIDER_ID]: profile } } },
      ];
    },
  };
  const credentials = {
    async describe(ref) {
      assert.equal(typeof ref, "string", "the Host credential service accepts a single ref, unlike the Client Remote");
      calls.describe.push(ref);
      return { configured: values.has(ref), source: "test", writable: true };
    },
    async resolve(ref) {
      calls.resolve.push(ref);
      return values.has(ref) ? { value: values.get(ref) } : undefined;
    },
  };
  const stateStore = {
    state: {},
    async load() { return this.state; },
    async save(next) { this.state = { ...this.state, ...structuredClone(next) }; return this.state; },
  };
  const ctx = {
    llm,
    settings,
    credentials,
    get(name) { return this[name]; },
    on(name, callback) { listeners.set(name, callback); return () => listeners.delete(name); },
  };
  return { ctx, stateStore, calls, listeners };
}

async function startMemoryHost(t, options) {
  const memory = createMemoryHost(options);
  assert.equal(Object.hasOwn(memory.ctx.settings, "get"), false);
  const host = new NativeKeyPoolHost(memory.ctx, {
    stateStore: memory.stateStore,
    logger: { warn() {}, error() {} },
  });
  t.after(() => {
    host.dispose();
    assert.equal(memory.listeners.size, 0);
  });
  await host.start();
  return { ...memory, host };
}

test("describe-only Host loads apiKeyEnv across settings namespaces without resolving unsupported credentials", async (t) => {
  for (const settingsNs of ["llm-pi-ai", "custom-provider-settings", "another-vendor-config"]) {
    await t.test(settingsNs, async (t) => {
      const { host, calls, stateStore } = await startMemoryHost(t, {
        settingsNs,
        profile: { apiKeyEnv: KEY_REF, baseURL: "https://unsupported.example.test/v1" },
      });
      const status = await host.status(PROVIDER_ID);
      assert.equal(status.activeRef, KEY_REF);
      assert.equal(status.keys.length, 1);
      assert.equal(status.keys[0].ref, KEY_REF);
      assert.equal(status.keys[0].configured, true);
      assert.equal(status.keys[0].active, true);
      assert.equal(status.quotaSupported, false);
      assert.equal(status.usage.status, "unsupported");
      const refreshed = await host.refreshUsage(PROVIDER_ID);
      assert.equal(refreshed.quotaSupported, false);
      assert.equal(refreshed.usage.status, "unsupported");
      assert.ok(calls.settings.length > 0);
      assert.ok(calls.describe.length > 0);
      assert.ok(calls.describe.every((ref) => ref === KEY_REF));
      assert.deepEqual(calls.resolve, [], "unsupported quota must not resolve even the synthetic value");
      assert.equal(JSON.stringify(stateStore.state).includes(FAKE_KEY), false);
    });
  }
});

// Raw /user/balance response shape, not pre-normalized Dockyard quota data.
const DEEPSEEK_BALANCE_FIXTURE = {
  is_available: true,
  balance_infos: [{ currency: "CNY", total_balance: "12.34", granted_balance: "2.00", topped_up_balance: "10.34" }],
};

test("custom-ID Host status recognizes official DeepSeek and refresh parses the raw balance fixture", async (t) => {
  for (const baseURL of ["https://api.deepseek.com", "https://api.deepseek.com/v1", "https://api.deepseek.com/v1/"]) {
    await t.test(baseURL, async (t) => {
      const requests = [];
      t.mock.method(globalThis, "fetch", async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(JSON.stringify(DEEPSEEK_BALANCE_FIXTURE), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });
      const { host, calls, stateStore } = await startMemoryHost(t, {
        settingsNs: "custom-deepseek-settings",
        profile: { apiKeyEnv: KEY_REF, baseURL },
      });
      const status = await host.status(PROVIDER_ID);
      assert.equal(status.quotaSupported, true);
      assert.equal(status.activeRef, KEY_REF);
      assert.equal(status.keys[0].configured, true);
      assert.equal(status.usage, null, "status is metadata-only before an explicit refresh");
      assert.equal(status.quota, null);
      assert.deepEqual(calls.resolve, []);
      assert.deepEqual(requests, []);

      const refreshed = await host.refreshUsage(PROVIDER_ID);
      assert.equal(refreshed.providerId, PROVIDER_ID);
      assert.equal(refreshed.quotaSupported, true);
      assert.equal(refreshed.usage.status, "ok");
      assert.equal(refreshed.usage.source, "DeepSeek /user/balance");
      assert.equal(refreshed.usage.available, true);
      assert.deepEqual(refreshed.usage.details, [{
        currency: "CNY", totalBalance: "12.34", grantedBalance: "2.00", toppedUpBalance: "10.34",
      }]);
      assert.deepEqual(refreshed.quota.windows.map(({ id, remaining, limit, unit, resetAt }) => ({ id, remaining, limit, unit, resetAt })), [
        { id: "balance-CNY", remaining: "12.34", limit: null, unit: "CNY", resetAt: null },
        { id: "granted-CNY", remaining: "2.00", limit: null, unit: "CNY", resetAt: null },
        { id: "topped-up-CNY", remaining: "10.34", limit: null, unit: "CNY", resetAt: null },
      ]);
      assert.deepEqual(refreshed.keys[0].quota, refreshed.quota);
      assert.deepEqual(calls.resolve, [KEY_REF]);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, "https://api.deepseek.com/user/balance");
      assert.equal(requests[0].init.method, "GET");
      assert.equal(requests[0].init.headers.Authorization, `Bearer ${FAKE_KEY}`);
      assert.equal(requests[0].init.redirect, "error");
      assert.ok(requests[0].init.signal instanceof AbortSignal);
      assert.equal(JSON.stringify({ status, refreshed, stored: stateStore.state }).includes(FAKE_KEY), false);
    });
  }
});

test("usageModuleFor recognizes only exact official DeepSeek origins and documented roots for a custom ID", () => {
  for (const baseURL of ["https://api.deepseek.com", "https://api.deepseek.com/", "https://api.deepseek.com/v1", "https://api.deepseek.com/v1/"]) {
    assert.equal(usageModuleFor(PROVIDER_ID, { baseURL }).id, "deepseek-balance", baseURL);
  }
  for (const baseURL of [
    "https://api.deepseek.com.evil.example/v1",
    "https://example.test/api.deepseek.com/v1",
    "http://api.deepseek.com/v1",
    "https://api.deepseek.com:444/v1",
    "https://api.deepseek.com/undocumented",
    "https://api.deepseek.com/v1?route=other",
    "https://api.deepseek.com/v1#other",
    "https://user:fixture-password@api.deepseek.com/v1",
  ]) {
    assert.ok(usageModuleFor(PROVIDER_ID, { baseURL }).id.startsWith("unsupported-"), baseURL);
  }
  assert.ok(usageModuleFor(PROVIDER_ID).id.startsWith("unsupported-"));
});
