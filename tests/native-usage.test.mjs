import test from "node:test";
import assert from "node:assert/strict";

import { usageModuleFor } from "../packages/dsh-plugin/src/native-usage.mjs";

test("DeepSeek usage module maps the official balance response without inventing a limit", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({
      is_available: true,
      balance_infos: [{
        currency: "CNY",
        total_balance: "12.34",
        granted_balance: "2.00",
        topped_up_balance: "10.34",
      }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const result = await usageModuleFor("deepseek").fetch({
      providerId: "deepseek",
      profile: null,
      apiKey: "test-key",
    });
    assert.equal(calls[0].url, "https://api.deepseek.com/user/balance");
    assert.equal(calls[0].init.headers.Authorization, "Bearer test-key");
    assert.equal(result.status, "ok");
    assert.equal(result.available, true);
    assert.deepEqual(result.details[0], {
      currency: "CNY",
      totalBalance: "12.34",
      grantedBalance: "2.00",
      toppedUpBalance: "10.34",
    });
    assert.equal(result.quota.windows[0].remaining, "12.34");
    assert.equal(result.quota.windows[0].limit, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenRouter usage module maps the official credits response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://openrouter.ai/api/v1/credits");
    return new Response(JSON.stringify({
      data: { total_credits: 20, total_usage: 3.5 },
    }), { status: 200 });
  };
  try {
    const result = await usageModuleFor("openrouter").fetch({
      providerId: "openrouter",
      profile: null,
      apiKey: "test-key",
    });
    assert.equal(result.status, "ok");
    assert.equal(result.quota.windows[0].remaining, 16.5);
    assert.equal(result.quota.windows[0].limit, 20);
    assert.equal(result.details.totalUsage, 3.5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("usage modules reject plaintext remote custom endpoints before sending the API key", async () => {
  await assert.rejects(
    () => usageModuleFor("deepseek").fetch({
      providerId: "deepseek",
      profile: { baseURL: "http://provider.test/user" },
      apiKey: "test-key",
    }),
    /must use HTTPS/,
  );
});

test("OpenCode Go reports the missing official usage endpoint instead of a fake percentage", async () => {
  const result = await usageModuleFor("opencode-go").fetch({ providerId: "opencode-go" });
  assert.equal(result.status, "unsupported");
  assert.match(result.message, /没有公开/);
  assert.equal(result.quota, undefined);
});
