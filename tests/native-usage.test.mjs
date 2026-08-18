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
    assert.equal(result.quota.windows.length, 3);
    assert.equal(result.quota.windows[1].name, "赠送余额");
    assert.equal(result.quota.windows[2].name, "充值余额");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DeepSeek official uses the official balance URL when the DSH adapter has no baseURL", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({
      is_available: true,
      balance_infos: [{ currency: "CNY", total_balance: "1.00" }],
    }), { status: 200 });
  };
  try {
    const result = await usageModuleFor("deepseek-official").fetch({
      providerId: "deepseek-official",
      profile: {},
      apiKey: "official-key",
    });
    assert.equal(calls[0], "https://api.deepseek.com/user/balance");
    assert.equal(result.status, "ok");
    assert.equal(result.quota.windows[0].remaining, "1.00");
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

test("OpenCode Go maps official rolling/weekly/monthly usage windows as remaining percent", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), authorization: init.headers.Authorization });
    return new Response(JSON.stringify({
      usage: {
        rolling: { status: "ok", percent: 4, resetsAt: "2026-08-13T16:27:38.287Z" },
        weekly: { status: "ok", percent: 3, resetsAt: "2026-08-17T00:00:00.287Z" },
        monthly: { status: "ok", percent: 1, resetsAt: "2026-09-13T06:06:01.287Z" },
      },
    }), { status: 200 });
  };
  try {
    const result = await usageModuleFor("opencode-go").fetch({
      providerId: "opencode-go",
      profile: null,
      apiKey: "sk-opencode-test",
    });
    assert.equal(calls[0].url, "https://opencode.ai/zen/go/v1/usage");
    assert.equal(calls[0].authorization, "Bearer sk-opencode-test");
    assert.equal(result.status, "ok");
    assert.equal(result.quota.windows.length, 3);
    assert.equal(result.quota.windows[0].name, "5 小时额度");
    assert.equal(result.quota.windows[0].remaining, 96);
    assert.equal(result.quota.windows[0].limit, 100);
    assert.equal(result.quota.windows[0].resetAt, "2026-08-13T16:27:38.287Z");
    assert.equal(result.quota.windows[1].remaining, 97);
    assert.equal(result.quota.windows[2].remaining, 99);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenCode Go usage URL follows a custom official HTTPS origin", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://proxy.example.test/zen/go/v1/usage");
    return new Response(JSON.stringify({
      usage: { rolling: { status: "ok", percent: 10 } },
    }), { status: 200 });
  };
  try {
    const result = await usageModuleFor("opencode-go").fetch({
      providerId: "opencode-go",
      profile: { baseURL: "https://proxy.example.test/zen/go" },
      apiKey: "sk-opencode-test",
    });
    assert.equal(result.quota.windows[0].remaining, 90);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenCode Zen remains unsupported instead of inventing a quota", async () => {
  const result = await usageModuleFor("opencode").fetch({ providerId: "opencode" });
  assert.equal(result.status, "unsupported");
  assert.match(result.message, /没有公开/);
  assert.equal(result.quota, undefined);
});
