import test from "node:test";
import assert from "node:assert/strict";

import { NativeKeyPoolHost } from "../packages/dsh-plugin/src/native-key-pool-host.mjs";

function mergePlain(under, over) {
  const merged = { ...under };
  for (const [key, value] of Object.entries(over)) {
    merged[key] = key in merged && merged[key] && typeof merged[key] === "object" && !Array.isArray(merged[key])
      && value && typeof value === "object" && !Array.isArray(value)
      ? mergePlain(merged[key], value)
      : value;
  }
  return merged;
}

function createMemoryHost({ providerId, profile, adapterConfig, adapterMethods = {}, values, extraProviders = null }) {
  const listeners = new Map();
  const llm = {
    adapters: new Map([[providerId, { adapter: { config: adapterConfig, ...adapterMethods } }]]),
    listConfigurableProviders: () => [{
      provider: providerId,
      settingsNs: "llm-pi-ai",
      settingsPath: ["providers", providerId],
    }],
  };
  const namespace = {
    providers: {
      ...(extraProviders ?? {}),
      ...(profile ? { [providerId]: profile } : {}),
    },
  };
  const settings = {
    get: () => namespace,
    // `llm-pi-ai` is a `settings.update` (merge) namespace: plain objects merge
    // recursively, so one preset write must never drop a sibling route.
    async update(ns, patch) {
      if (ns !== "llm-pi-ai") throw new Error(`unexpected namespace ${ns}`);
      const merged = mergePlain(namespace, patch);
      for (const key of Object.keys(namespace)) delete namespace[key];
      Object.assign(namespace, merged);
    },
  };
  const credentials = {
    async describe(ref) {
      return {
        configured: values.has(ref),
        source: "test",
        writable: true,
      };
    },
    async resolve(ref) {
      return values.has(ref) ? { value: values.get(ref) } : undefined;
    },
    async set(ref, value) {
      values.set(ref, value);
    },
  };
  const stateStore = {
    state: {},
    async load() {
      return this.state;
    },
    async save(next) {
      this.state = { ...this.state, ...next };
      return this.state;
    },
  };
  const ctx = {
    llm,
    settings,
    credentials,
    get(name) {
      return this[name];
    },
    on(name, callback) {
      listeners.set(name, callback);
      return () => listeners.delete(name);
    },
    logger: () => ({ warn() {}, error() {} }),
  };
  return { ctx, llm, credentials, settings, namespace, stateStore, listeners };
}

test("native key pool imports a domestic coding-plan preset without touching sibling routes", async () => {
  const values = new Map([["DEEPSEEK_KEY_A", "secret-a"]]);
  const { ctx, stateStore } = createMemoryHost({
    providerId: "glm-coding-plan",
    profile: null,
    extraProviders: { deepseek: { apiKeyEnv: "DEEPSEEK_KEY_A" } },
    adapterConfig: { async resolveApiKey(_provider, profile) { return values.get(profile.apiKeyEnv); } },
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();

  const before = (await host.listKeyPresets()).presets.find((preset) => preset.id === "glm-coding-plan");
  assert.equal(before.declared, false);
  assert.equal(before.credentialConfigured, false);
  assert.equal(before.baseURL, "https://open.bigmodel.cn/api/coding/paas/v4");
  assert.ok(before.modelCount > 0);

  const imported = await host.importKeyPreset("glm-coding-plan", { apiKey: "bigmodel-secret" });
  assert.equal(imported.credentialWritten, true);
  assert.equal(imported.credentialConfigured, true);
  assert.equal(imported.declared, true);
  assert.equal(imported.declaration, "written");
  assert.equal(values.get("GLM_CODING_PLAN_API_KEY"), "bigmodel-secret");

  const declared = ctx.settings.get("llm-pi-ai").providers["glm-coding-plan"];
  assert.equal(declared.apiKeyEnv, "GLM_CODING_PLAN_API_KEY");
  assert.equal(declared.baseURL, "https://open.bigmodel.cn/api/coding/paas/v4");
  assert.equal(declared.api, "openai-completions");
  assert.ok(declared.models.length > 0);
  assert.equal(ctx.settings.get("llm-pi-ai").providers.deepseek.apiKeyEnv, "DEEPSEEK_KEY_A");

  const again = await host.importKeyPreset("glm-coding-plan");
  assert.equal(again.credentialWritten, false);
  assert.equal(again.credentialConfigured, true);
  assert.equal(again.declaration, "already-declared");

  const status = await host.status("glm-coding-plan");
  assert.ok(status.keys.some((entry) => entry.ref === "GLM_CODING_PLAN_API_KEY"));
  assert.equal(stateStore.state.nativeKeyPools["glm-coding-plan"].keys.length, 1);
  host.dispose();
});

test("native key pool rejects an unknown preset id", async () => {
  const values = new Map();
  const { ctx, stateStore } = createMemoryHost({
    providerId: "glm-coding-plan",
    profile: null,
    adapterConfig: { async resolveApiKey() { return undefined; } },
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  await assert.rejects(() => host.importKeyPreset("not-a-preset", { apiKey: "x" }), /未知的国产套餐预设/);
  host.dispose();
});

test("native API-key pool rotates pi-ai credentials at request resolution", async () => {
  const values = new Map([
    ["DEEPSEEK_KEY_A", "secret-a"],
    ["DEEPSEEK_KEY_B", "secret-b"],
  ]);
  const calls = [];
  const adapterConfig = {
    async resolveApiKey(provider, profile) {
      calls.push([provider, profile.apiKeyEnv]);
      return values.get(profile.apiKeyEnv);
    },
  };
  const { ctx, llm, stateStore } = createMemoryHost({
    providerId: "deepseek",
    profile: { apiKeyEnv: "DEEPSEEK_KEY_A" },
    adapterConfig,
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  await host.register("deepseek", "DEEPSEEK_KEY_B", "备用 Key");
  await host.setPolicy("deepseek", "round_robin");

  const wrapped = llm.adapters.get("deepseek").adapter.config.resolveApiKey;
  assert.equal(await wrapped("deepseek", { apiKeyEnv: "DEEPSEEK_KEY_A" }), "secret-a");
  assert.equal(await wrapped("deepseek", { apiKeyEnv: "DEEPSEEK_KEY_A" }), "secret-b");
  assert.equal(await wrapped("deepseek", { apiKeyEnv: "DEEPSEEK_KEY_A" }), "secret-a");
  assert.deepEqual(calls, []);

  const status = await host.status("deepseek");
  assert.equal(status.runtimeMode, "request-key-pool");
  assert.equal(status.policy, "round_robin");
  assert.deepEqual(status.keys.map((entry) => entry.ref), ["DEEPSEEK_KEY_A", "DEEPSEEK_KEY_B"]);
  assert.equal(stateStore.state.nativeKeyPools.deepseek.keys.length, 2);
  host.dispose();
});

test("native API-key pool applies a custom context limit before the request starts", async () => {
  const values = new Map([["DEEPSEEK_KEY_A", "secret-a"]]);
  const { ctx, llm, stateStore } = createMemoryHost({
    providerId: "deepseek",
    profile: { apiKeyEnv: "DEEPSEEK_KEY_A" },
    adapterConfig: { async resolveApiKey(_provider, profile) { return values.get(profile.apiKeyEnv); } },
    values,
  });
  const received = [];
  const host = new NativeKeyPoolHost(ctx, {
    stateStore,
    contextWindowOverrides: {
      hasAny() { return true; },
      resolve(providerId, modelId, scope) {
        assert.equal(providerId, "deepseek");
        assert.equal(modelId, "custom-model");
        assert.equal(scope.keyRef, "DEEPSEEK_KEY_A");
        return 1000000;
      },
    },
  });
  llm.stream = (request) => host.stream(request, async function* () {
    received.push(request);
    yield { type: "text-delta", index: 0, text: "ok" };
    yield { type: "finish", reason: { kind: "stop" } };
  });
  await host.start();
  const options = Object.freeze({
    provider: "deepseek",
    model: "custom-model",
    modelContext: Object.freeze({ maxTokens: 4096 }),
  });
  for await (const _chunk of host.stream(options, async function* () {
    throw new Error("immutable request should be re-entered with a copied request");
  })) {}
  assert.deepEqual(options.modelContext, { maxTokens: 4096 });
  assert.equal(received.length, 1);
  assert.notEqual(received[0], options);
  assert.deepEqual(received[0].modelContext, { maxTokens: 4096, contextWindow: 1000000 });
  host.dispose();
});

test("native API-key pool applies a custom context limit to model metadata", async () => {
  const values = new Map([["OPENROUTER_API_KEY", "secret-a"]]);
  const baseModel = {
    provider: "openrouter",
    id: "stealth/ox-alpha",
    name: "ox-alpha",
    contextWindow: 262144,
  };
  const { ctx, llm, stateStore } = createMemoryHost({
    providerId: "openrouter",
    profile: { apiKeyEnv: "OPENROUTER_API_KEY" },
    adapterConfig: { async resolveApiKey(_provider, profile) { return values.get(profile.apiKeyEnv); } },
    adapterMethods: {
      modelOf(_snapshot, provider, model) {
        return { ...baseModel, provider, id: model };
      },
      async resolveModel(provider, model) {
        return {
          provider,
          id: model,
          name: "ox-alpha",
          context: { contextWindow: 262144 },
        };
      },
      async prepareCall(provider, model) {
        return {
          model: {
            provider,
            id: model,
            name: "ox-alpha",
            context: { contextWindow: 262144 },
          },
          stream() {},
        };
      },
    },
    values,
  });
  const host = new NativeKeyPoolHost(ctx, {
    stateStore,
    contextWindowOverrides: {
      hasAny(providerId, modelId) {
        return providerId === "openrouter" && modelId === "stealth/ox-alpha";
      },
      resolve(providerId, modelId, scope) {
        assert.equal(providerId, "openrouter");
        assert.equal(modelId, "stealth/ox-alpha");
        assert.equal(scope.keyRef, "OPENROUTER_API_KEY");
        return 1000000;
      },
    },
  });
  await host.start();

  const adapter = llm.adapters.get("openrouter").adapter;
  const resolved = await adapter.resolveModel("openrouter", "stealth/ox-alpha");
  const prepared = await adapter.prepareCall("openrouter", "stealth/ox-alpha");
  const internal = adapter.modelOf({}, "openrouter", "stealth/ox-alpha");

  assert.equal(resolved.context.contextWindow, 1000000);
  assert.equal(prepared.model.context.contextWindow, 1000000);
  assert.equal(internal.contextWindow, 1000000);
  host.dispose();
  assert.equal((await adapter.resolveModel("openrouter", "stealth/ox-alpha")).context.contextWindow, 262144);
});

test("native API-key pool does not crash when an optional host seam is absent", async () => {
  const ctx = {
    get() { return undefined; },
    logger: () => ({ warn() {}, error() {} }),
  };
  const stateStore = {
    async load() { return {}; },
    async save(value) { return value; },
  };
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  assert.equal((await host.status("deepseek")).keys.length, 0);
  host.dispose();
});

test("native API-key pool preserves the direct DeepSeek connection resolver", async () => {
  const values = new Map([
    ["DEEPSEEK_KEY_A", "secret-a"],
    ["DEEPSEEK_KEY_B", "secret-b"],
  ]);
  const calls = [];
  const adapterConfig = {
    options: () => ({ apiKeyEnv: "DEEPSEEK_KEY_A" }),
    resolveUserId: () => "test-user",
    async resolveApiKey(connection) {
      calls.push(connection.apiKeyEnv);
      return values.get(connection.apiKeyEnv);
    },
  };
  const { ctx, llm, stateStore } = createMemoryHost({
    providerId: "deepseek-official",
    profile: { apiKeyEnv: "DEEPSEEK_KEY_A" },
    adapterConfig,
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  await host.register("deepseek-official", "DEEPSEEK_KEY_B", "备用 Key");
  await host.setPolicy("deepseek-official", "round_robin");

  const wrapped = llm.adapters.get("deepseek-official").adapter.config.resolveApiKey;
  assert.equal(await wrapped({ apiKeyEnv: "DEEPSEEK_KEY_A" }), "secret-a");
  assert.equal(await wrapped({ apiKeyEnv: "DEEPSEEK_KEY_A" }), "secret-b");
  assert.deepEqual(calls, []);
  host.dispose();
});

test("failover keeps the primary Key for healthy requests", async () => {
  const values = new Map([
    ["DEEPSEEK_KEY_A", "secret-a"],
    ["DEEPSEEK_KEY_B", "secret-b"],
  ]);
  const { ctx, llm, stateStore } = createMemoryHost({
    providerId: "deepseek-official",
    profile: { apiKeyEnv: "DEEPSEEK_KEY_A" },
    adapterConfig: {
      options: () => ({ apiKeyEnv: "DEEPSEEK_KEY_A" }),
      resolveUserId: () => "test-user",
      async resolveApiKey(connection) {
        return values.get(connection.apiKeyEnv);
      },
    },
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  await host.register("deepseek-official", "DEEPSEEK_KEY_B", "备用 Key");
  await host.setPolicy("deepseek-official", "failover");

  const wrapped = llm.adapters.get("deepseek-official").adapter.config.resolveApiKey;
  // Failover must pin healthy requests to the primary Key instead of rotating
  // through the pool on every call (round_robin behaviour).
  assert.equal(await wrapped({ apiKeyEnv: "DEEPSEEK_KEY_A" }), "secret-a");
  assert.equal(await wrapped({ apiKeyEnv: "DEEPSEEK_KEY_A" }), "secret-a");
  assert.equal(await wrapped({ apiKeyEnv: "DEEPSEEK_KEY_A" }), "secret-a");
  host.dispose();
});

test("failover retries a retryable stream exception before visible output", async () => {
  const values = new Map([
    ["DEEPSEEK_KEY_A", "secret-a"],
    ["DEEPSEEK_KEY_B", "secret-b"],
  ]);
  const { ctx, stateStore } = createMemoryHost({
    providerId: "deepseek",
    profile: { apiKeyEnv: "DEEPSEEK_KEY_A" },
    adapterConfig: { async resolveApiKey(_provider, profile) { return values.get(profile.apiKeyEnv); } },
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  await host.register("deepseek", "DEEPSEEK_KEY_B", "备用 Key");
  await host.setPolicy("deepseek", "failover");

  let calls = 0;
  const chunks = [];
  for await (const chunk of host.stream({ provider: "deepseek" }, () => (async function* () {
    calls += 1;
    if (calls === 1) {
      const error = new Error("quota exhausted");
      error.rateLimited = true;
      throw error;
    }
    yield { type: "block-start", index: 0, blockType: "text" };
    yield { type: "text-delta", index: 0, text: "ok" };
    yield { type: "finish", reason: { kind: "stop" } };
  })())) chunks.push(chunk);

  assert.equal(calls, 2);
  assert.equal(chunks.find((chunk) => chunk.type === "text-delta")?.text, "ok");
  host.dispose();
});

test("failover state is isolated between concurrent streams", async () => {
  const values = new Map([
    ["DEEPSEEK_KEY_A", "secret-a"],
    ["DEEPSEEK_KEY_B", "secret-b"],
  ]);
  const { ctx, llm, stateStore } = createMemoryHost({
    providerId: "deepseek",
    profile: { apiKeyEnv: "DEEPSEEK_KEY_A" },
    adapterConfig: { async resolveApiKey(_provider, profile) { return values.get(profile.apiKeyEnv); } },
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  await host.register("deepseek", "DEEPSEEK_KEY_B", "备用 Key");
  await host.setPolicy("deepseek", "failover");
  const wrapped = llm.adapters.get("deepseek").adapter.config.resolveApiKey;
  let calls = 0;
  const run = async () => {
    const keys = [];
    for await (const chunk of host.stream({ provider: "deepseek" }, () => (async function* () {
      const key = await wrapped("deepseek", { apiKeyEnv: "DEEPSEEK_KEY_A" });
      keys.push(key);
      calls += 1;
      if (calls <= 2) {
        const error = new Error("rate limited");
        error.rateLimited = true;
        throw error;
      }
      yield { type: "text-delta", index: 0, text: "ok" };
      yield { type: "finish", reason: { kind: "stop" } };
    })())) {
      if (chunk.type === "text-delta") keys.push(chunk.text);
    }
    return keys;
  };
  const results = await Promise.all([run(), run()]);
  assert.deepEqual(results.map((result) => result.slice(0, 2)), [["secret-a", "secret-b"], ["secret-a", "secret-b"]]);
  host.dispose();
});

test("failover drops a failed partial stream before trying the next Key", async () => {
  const values = new Map([
    ["DEEPSEEK_KEY_A", "secret-a"],
    ["DEEPSEEK_KEY_B", "secret-b"],
  ]);
  const { ctx, stateStore } = createMemoryHost({
    providerId: "deepseek",
    profile: { apiKeyEnv: "DEEPSEEK_KEY_A" },
    adapterConfig: {
      async resolveApiKey(_provider, profile) {
        return values.get(profile.apiKeyEnv);
      },
    },
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  await host.register("deepseek", "DEEPSEEK_KEY_B", "备用 Key");
  await host.setPolicy("deepseek", "failover");

  let calls = 0;
  const chunks = [];
  for await (const chunk of host.stream({ provider: "deepseek" }, () => (async function* () {
    calls += 1;
    if (calls === 1) {
      yield { type: "block-start", index: 0, blockType: "text" };
      yield { type: "finish", reason: { kind: "error" } };
      return;
    }
    yield { type: "block-start", index: 0, blockType: "text" };
    yield { type: "text-delta", index: 0, text: "ok" };
    yield { type: "block-end", index: 0, block: { type: "text", text: "ok" } };
    yield { type: "finish", reason: { kind: "stop" } };
  })())) chunks.push(chunk);

  assert.equal(calls, 2);
  assert.equal(chunks.some((chunk) => chunk.reason?.kind === "error"), false);
  assert.equal(chunks.find((chunk) => chunk.type === "text-delta")?.text, "ok");
  host.dispose();
});

test("native key pool refreshes OpenCode Go usage and keeps it on the next status", async () => {
  const originalFetch = globalThis.fetch;
  const values = new Map([["OPENCODE_GO_API_KEY", "sk-opencode-test"]]);
  const { ctx, stateStore } = createMemoryHost({
    providerId: "opencode-go",
    profile: { apiKeyEnv: "OPENCODE_GO_API_KEY" },
    adapterConfig: {
      async resolveApiKey(_provider, profile) {
        return values.get(profile.apiKeyEnv);
      },
    },
    values,
  });
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://opencode.ai/zen/go/v1/usage");
    return new Response(JSON.stringify({
      usage: {
        rolling: { status: "ok", percent: 20, resetsAt: "2026-08-18T12:00:00.000Z" },
        weekly: { status: "ok", percent: 10, resetsAt: "2026-08-24T00:00:00.000Z" },
        monthly: { status: "ok", percent: 5, resetsAt: "2026-09-18T00:00:00.000Z" },
      },
    }), { status: 200 });
  };
  try {
    const host = new NativeKeyPoolHost(ctx, { stateStore });
    await host.start();
    const refreshed = await host.refreshUsage("opencode-go");
    assert.equal(refreshed.usage.status, "ok");
    assert.equal(refreshed.quota.windows[0].remaining, 80);
    assert.equal(refreshed.keys[0].quota.windows.length, 3);
    const status = await host.status("opencode-go");
    assert.equal(status.quota.windows[0].remaining, 80);
    assert.equal(status.usage.status, "ok");
    host.dispose();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("failover does not rotate Keys for known non-retryable stream failures", async () => {
  const values = new Map([
    ["DEEPSEEK_KEY_A", "secret-a"],
    ["DEEPSEEK_KEY_B", "secret-b"],
  ]);
  const { ctx, stateStore } = createMemoryHost({
    providerId: "deepseek",
    profile: { apiKeyEnv: "DEEPSEEK_KEY_A" },
    adapterConfig: {
      async resolveApiKey(_provider, profile) {
        return values.get(profile.apiKeyEnv);
      },
    },
    values,
  });
  const host = new NativeKeyPoolHost(ctx, { stateStore });
  await host.start();
  await host.register("deepseek", "DEEPSEEK_KEY_B", "备用 Key");
  await host.setPolicy("deepseek", "failover");

  let calls = 0;
  const chunks = [];
  for await (const chunk of host.stream({ provider: "deepseek" }, () => (async function* () {
    calls += 1;
    yield { type: "finish", reason: { kind: "error", failure: { code: "INVALID_ARGUMENT", status: 400, message: "unsupported model" } } };
  })())) chunks.push(chunk);

  // A request-shape error fails identically on every key: no rotation.
  assert.equal(calls, 1);
  assert.equal(chunks.find((chunk) => chunk.type === "finish")?.reason?.failure?.code, "INVALID_ARGUMENT");
  host.dispose();
});
