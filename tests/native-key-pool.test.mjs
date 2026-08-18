import test from "node:test";
import assert from "node:assert/strict";

import { NativeKeyPoolHost } from "../packages/dsh-plugin/src/native-key-pool-host.mjs";

function createMemoryHost({ providerId, profile, adapterConfig, values }) {
  const listeners = new Map();
  const llm = {
    adapters: new Map([[providerId, { adapter: { config: adapterConfig } }]]),
    listConfigurableProviders: () => [{
      provider: providerId,
      settingsNs: "llm-pi-ai",
      settingsPath: ["providers", providerId],
    }],
  };
  const settings = {
    get: () => ({ providers: { [providerId]: profile } }),
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
  return { ctx, llm, credentials, stateStore, listeners };
}

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
