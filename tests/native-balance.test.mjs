import assert from "node:assert/strict";
import test from "node:test";
import { usageModuleFor } from "../packages/dsh-plugin/src/native-usage.mjs";
import { NativeKeyPoolHost } from "../packages/dsh-plugin/src/native-key-pool-host.mjs";
import { NativeKeyPoolController } from "../packages/dsh-plugin/src/native-key-pool.mjs";
import { selectQuotaIndicator } from "../packages/dsh-plugin/src/quota-display.mjs";

const fixtures = [
  { baseURL: "https://api.deepseek.com/v1", id: "deepseek-balance", url: "https://api.deepseek.com/user/balance", body: { is_available: true, balance_infos: [{ currency: "CNY", total_balance: "12.34" }] }, remaining: "12.34", unit: "CNY" },
  { baseURL: "https://openrouter.ai", id: "openrouter-credits", url: "https://openrouter.ai/api/v1/credits", body: { data: { total_credits: 20, total_usage: 3.5 } }, remaining: 16.5, unit: "USD" },
  { baseURL: "https://api.moonshot.cn/v1", id: "moonshot-balance", url: "https://api.moonshot.cn/v1/users/me/balance", body: { code: 0, status: true, data: { available_balance: 4.25, voucher_balance: 3, cash_balance: 1.25 } }, remaining: 4.25, unit: "CNY" },
  { baseURL: "https://api.moonshot.ai/v1", id: "moonshot-balance", url: "https://api.moonshot.ai/v1/users/me/balance", body: { code: 0, status: true, data: { available_balance: 0, voucher_balance: 0, cash_balance: -1 } }, remaining: 0, unit: "USD" },
  { baseURL: "https://api.stepfun.com/v1", id: "stepfun-balance", url: "https://api.stepfun.com/v1/accounts", body: { object: "account", type: "prepaid", balance: 0, total_cash_balance: 100, total_voucher_balance: 20 }, remaining: 0, unit: "CNY" },
  { baseURL: "https://api.novita.ai/v3/openai", id: "novita-balance", url: "https://api.novita.ai/openapi/v1/billing/balance/detail", body: { availableBalance: "1000000", cashBalance: "800000", creditLimit: "200000" }, remaining: 100, unit: "USD" },
];

for (const fixture of fixtures) {
  test(`custom route detects and reads ${fixture.baseURL} without rewriting credential origin`, async (t) => {
    const profile = { baseURL: fixture.baseURL };
    const module = usageModuleFor("custom-route", profile);
    assert.equal(module.id, fixture.id);
    t.mock.method(globalThis, "fetch", async (url, init) => {
      assert.equal(String(url), fixture.url);
      assert.equal(init.headers.Authorization, "Bearer fixture-key");
      assert.equal(init.redirect, "error");
      assert.ok(init.signal instanceof AbortSignal);
      return Response.json(fixture.body);
    });
    const result = await module.fetch({ providerId: "custom-route", profile, apiKey: "fixture-key" });
    assert.equal(result.status, "ok");
    assert.equal(result.quota.windows[0].remaining, fixture.remaining);
    assert.equal(result.quota.windows[0].unit, fixture.unit);
    if (fixture.id !== "openrouter-credits") assert.equal(result.quota.windows[0].limit, null);
    // The compact composer control shows money only for windows tagged as a balance.
    assert.equal(selectQuotaIndicator(result.quota.windows).type, "balance");
  });
}

test("custom endpoint detection requires exact official origin and documented path", async (t) => {
  t.mock.method(globalThis, "fetch", () => assert.fail("unknown endpoints must not receive credentials"));
  for (const baseURL of [
    "https://api.deepseek.com.evil.test/v1", "https://api.deepseek.com:8443/v1",
    "https://proxy.example/deepseek/v1", "http://api.deepseek.com/v1", "https://api.deepseek.com/v1/other",
    "https://api.deepseek.com/v1?proxy=1", "https://user:password@api.deepseek.com/v1",
    "https://api.kimi.com/coding", "https://opencode.ai/zen/v1", "not a URL",
  ]) {
    const module = usageModuleFor("custom-route", { baseURL });
    assert.match(module.id, /^unsupported-/);
    assert.equal((await module.fetch({ providerId: "custom-route" })).status, "unsupported");
  }
  assert.match(usageModuleFor("kimi-coding").id, /^unsupported-/);
  assert.equal(usageModuleFor("custom", { baseURL: "https://opencode.ai/zen/go/v1" }).id, "opencode-go-usage");
});

test("Moonshot built-in IDs choose the corresponding platform and currency", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(String(url));
    return Response.json({ code: 0, status: true, data: { available_balance: 10, cash_balance: 8, voucher_balance: 2 } });
  });
  for (const [providerId, origin, unit] of [["moonshotai", "https://api.moonshot.ai", "USD"], ["moonshotai-cn", "https://api.moonshot.cn", "CNY"]]) {
    const result = await usageModuleFor(providerId).fetch({ providerId, apiKey: "fixture-key" });
    assert.equal(urls.at(-1), `${origin}/v1/users/me/balance`);
    assert.equal(result.quota.windows.length, 3);
    assert.equal(result.quota.windows[0].unit, unit);
  }
});

test("invalid balance payloads are errors, not empty success or invented zero", async (t) => {
  let body;
  t.mock.method(globalThis, "fetch", async () => Response.json(body));
  for (const [providerId, payload] of [
    ["deepseek", {}], ["deepseek", { balance_infos: [] }],
    ["deepseek", { balance_infos: [{ total_balance: "NaN" }] }],
    ["openrouter", { data: {} }], ["openrouter", { data: { total_credits: "bad", total_usage: 2 } }],
    ["moonshotai", { status: false, code: 1, data: { available_balance: 100 } }],
    ["moonshotai", { status: true, code: 0, data: { available_balance: null } }],
    ["stepfun", { balance: "" }], ["novita", { availableBalance: "Infinity" }],
  ]) {
    body = payload;
    await assert.rejects(() => usageModuleFor(providerId).fetch({ providerId, apiKey: "fixture-key" }), /有效余额/);
  }
});

test("DeepSeek retains valid balance components and drops invalid numeric fields", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    balance_infos: [{ currency: "CNY", total_balance: "0.0000", granted_balance: "bad", topped_up_balance: "" }],
  }));
  const result = await usageModuleFor("deepseek").fetch({ providerId: "deepseek", apiKey: "fixture-key" });
  assert.equal(result.quota.windows.length, 1);
  assert.equal(result.quota.windows[0].remaining, "0.0000");
});

test("balance read timeout covers response body and does not reveal credentials", async (t) => {
  const timeout = new AbortController();
  t.mock.method(AbortSignal, "timeout", (ms) => { assert.equal(ms, 12_000); return timeout.signal; });
  let bodyStarted;
  const ready = new Promise((resolve) => { bodyStarted = resolve; });
  t.mock.method(globalThis, "fetch", async (_url, init) => ({
    ok: true,
    text: () => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
      bodyStarted();
    }),
  }));
  const pending = usageModuleFor("deepseek").fetch({ providerId: "deepseek", apiKey: "fixture-key" });
  await ready;
  timeout.abort(new Error("expired"));
  await assert.rejects(pending, /查询超时/);
});

test("upstream error details never expose the supplied API key", async (t) => {
  const apiKey = "unusual-secret-without-known-prefix";
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: `invalid: ${apiKey}` } }, { status: 401 }));
  await assert.rejects(() => usageModuleFor("deepseek").fetch({ providerId: "deepseek", apiKey }), (error) => {
    assert.equal(error.status, 401);
    assert.ok(!error.message.includes(apiKey));
    assert.match(error.message, /redacted/);
    return true;
  });
});

function memoryHost() {
  const profile = { apiKeyEnv: "KEY_A", baseURL: "https://api.deepseek.com/v1" };
  const values = new Map([["KEY_A", "fixture-a"], ["KEY_B", "fixture-b"]]);
  const ctx = {
    llm: { adapters: new Map(), listConfigurableProviders: () => [{ provider: "custom", settingsNs: "llm-pi-ai", settingsPath: ["custom"] }] },
    settings: { describe: () => [{ ns: "llm-pi-ai", value: { custom: profile } }] },
    credentials: { describe: async (ref) => ({ configured: values.has(ref), writable: true }), resolve: async (ref) => ({ value: values.get(ref) }) },
  };
  const host = new NativeKeyPoolHost(ctx, { stateStore: { load: async () => ({}), save: async (value) => value } });
  return { host, profile, values };
}

test("cached balance follows selected key and invalidates on endpoint changes", async (t) => {
  const { host, profile, values } = memoryHost();
  t.after(() => host.dispose());
  t.mock.method(globalThis, "fetch", async (_url, init) => Response.json({ balance_infos: [{ currency: "CNY", total_balance: init.headers.Authorization.endsWith("fixture-a") ? "10" : "20" }] }));
  await host.start();
  await host.register("custom", "KEY_B", "Second key");
  await host.refreshUsage("custom");
  assert.equal((await host.status("custom")).quota.windows[0].remaining, "10");
  profile.apiKeyEnv = "KEY_B";
  assert.equal((await host.status("custom")).quota.windows[0].remaining, "20");
  values.delete("KEY_B");
  const unconfigured = await host.status("custom");
  assert.equal(unconfigured.quota, null);
  assert.equal(unconfigured.keys.find((row) => row.ref === "KEY_B").quota, undefined);
  values.set("KEY_B", "fixture-b");
  profile.baseURL = "https://proxy.example/v1";
  const changed = await host.status("custom");
  assert.equal(changed.quotaSupported, false);
  assert.equal(changed.quota, null);
  assert.ok(changed.keys.every((row) => !row.quota));
});

test("client honors explicit null quota and does not keep the prior key balance", async (t) => {
  const profile = { apiKeyEnv: "KEY_A", baseURL: "https://api.deepseek.com/v1" };
  const api = {
    llm: { providers: async () => ({ providers: [{ provider: "custom", settingsNs: "llm-pi-ai", settingsPath: ["custom"] }] }) },
    settings: { describe: async () => ({ namespaces: [{ ns: "llm-pi-ai", value: { custom: structuredClone(profile) } }] }) },
    credentials: { describe: async () => ({ credentials: {} }) },
  };
  const remote = { nativeKeyStatus: async () => ({ quota: { remaining: 10 }, usage: { status: "ok" } }) };
  const controller = new NativeKeyPoolController(api, remote);
  await controller.load("custom");
  assert.equal(controller.store.getSnapshot().quota.remaining, 10);
  remote.nativeKeyStatus = async () => ({ quota: null, usage: null });
  await controller.load("custom");
  assert.equal(controller.store.getSnapshot().quota, null);
  controller.setState({ quota: { remaining: 10 }, usage: { status: "ok" } });
  profile.apiKeyEnv = "KEY_B";
  remote.nativeKeyStatus = async () => { throw new Error("offline"); };
  await controller.load("custom");
  assert.equal(controller.store.getSnapshot().quota, null);
  assert.equal(controller.store.getSnapshot().usage, null);
});
