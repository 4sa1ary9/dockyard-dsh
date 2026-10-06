import test from "node:test";
import assert from "node:assert/strict";
import { createClaudeCatalogLoader, createClaudeDriver } from "../modules/provider-claude/src/driver.mjs";

const account = (id) => ({ accountId: id, auth: { credentialRef: `ref:${id}` } });
const secretStore = { read: async (ref) => ({ type: "oauth", providerId: "claude", accountId: ref.slice(4), access: `token:${ref.slice(4)}` }) };
const response = (models, status = 200) => ({ ok: status === 200, status, text: async () => JSON.stringify({ model_selector_config: [{ id: "cc", models }] }) });

test("Claude discovers new account models and preserves server capabilities and exclusions", async () => {
  const loader = createClaudeCatalogLoader({
    registryLoader: async () => [
      { provider: "anthropic", id: "new-model", contextWindow: 100, maxTokens: 10, input: ["text", "image"] },
      { provider: "anthropic", id: "registry-only" },
      { provider: "gateway", id: "fresh-model", maxTokens: 999 },
    ],
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://api.anthropic.com/api/model_selector/cc");
      assert.equal(init.method, "GET");
      assert.equal(init.headers.authorization, "Bearer token:a");
      assert.equal(init.redirect, "error");
      return response([
        { id: "new-model", name: "New", capabilities: { mm_images: false }, runtime: { max_input_tokens: 200, max_output_tokens: 20, effort_levels: ["low", "high"] } },
        { id: "fresh-model", thinking: { effort_options: [{ id: "high", name: "High" }] }, badge: { message: "Requires usage credits" } },
        { id: "blocked", disabled: true },
        { id: "retired", section: "deprecated" },
        { id: "invalid", disabled: "false" },
      ]);
    },
  });
  const result = await loader({ accounts: [account("a")], secretStore });
  assert.deepEqual(result.models.map((model) => model.id), ["new-model", "fresh-model"]);
  assert.equal(result.models[0].contextWindow, 200);
  assert.equal(result.models[0].maxTokens, 20);
  assert.deepEqual(result.models[0].inputModalities, ["text"]);
  assert.deepEqual(result.models[0].reasoning.efforts.map((effort) => effort.id), ["low", "high"]);
  assert.equal(result.models[1].maxTokens, undefined);
  assert.match(result.models[1].description, /usage credits/);
});

test("Claude refreshes after five minutes or force and isolates stale cache by account", async () => {
  let calls = 0;
  let failed = false;
  const loader = createClaudeCatalogLoader({ fetchImpl: async () => {
    calls++;
    return response([{ id: "new-model" }], failed ? 503 : 200);
  } });
  const context = { accounts: [account("a")], secretStore, now: new Date(0) };
  await loader(context);
  await loader({ ...context, now: new Date(299_999) });
  assert.equal(calls, 1);
  await loader({ ...context, now: new Date(300_000) });
  assert.equal(calls, 2);
  failed = true;
  const stale = await loader({ ...context, force: true });
  assert.deepEqual(stale.models.map((model) => model.id), ["new-model"]);
  assert.match(stale.diagnostics[0], /HTTP 503.*上次成功/);
  const other = await loader({ ...context, accounts: [account("b")] });
  assert.deepEqual(other.models, []);
  assert.equal(other.diagnostics.length, 1);
  assert.deepEqual((await loader({ ...context, accounts: [] })).models, []);
  const reconnected = await loader(context);
  assert.deepEqual(reconnected.models, []);
});

test("manual catalog follows default account; automatic catalog uses the pool intersection", async () => {
  const called = [];
  const loader = createClaudeCatalogLoader({ fetchImpl: async (_, init) => {
    called.push(init.headers.authorization);
    const ownModel = init.headers.authorization.endsWith(":a") ? "a-only" : "b-only";
    return response([{ id: "shared" }, { id: ownModel }]);
  } });
  const context = { accounts: [account("a"), account("b")], secretStore };
  const manual = await loader({ ...context, policy: "manual", defaultAccountId: "b" });
  assert.deepEqual(manual.models.map((model) => model.id), ["shared", "b-only"]);
  assert.deepEqual(called, ["Bearer token:b"]);
  const automatic = await loader({ ...context, policy: "round_robin" });
  assert.deepEqual(automatic.models.map((model) => model.id), ["shared"]);
  const missing = await loader({ ...context, policy: "manual", defaultAccountId: "missing" });
  assert.deepEqual(missing.models, []);
});

test("Claude never substitutes registry or machine credentials for missing pool credentials", async () => {
  let calls = 0;
  const loader = createClaudeCatalogLoader({
    registryLoader: () => [{ id: "registry-only", provider: "anthropic" }],
    fetchImpl: async () => { calls++; return response([{ id: "wrong-account" }]); },
  });
  assert.deepEqual((await loader()).models, []);
  for (const credential of [null, { type: "api_key", access: "key" }, { access: "token", accountId: "b" }]) {
    const result = await loader({ accounts: [account("a")], secretStore: { read: async () => credential } });
    assert.deepEqual(result.models, []);
    assert.match(result.diagnostics[0], /账号凭据不可用/);
  }
  assert.equal(calls, 0);
});

test("valid empty account catalog revokes cached models; malformed responses retain them with diagnostics", async () => {
  let body = { model_selector_config: [{ id: "cc", models: [{ id: "old" }] }] };
  const loader = createClaudeCatalogLoader({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify(body) }) });
  const context = { accounts: [account("a")], secretStore, force: true };
  await loader(context);
  body = {};
  assert.deepEqual((await loader(context)).models.map((model) => model.id), ["old"]);
  body = { model_selector_config: [{ id: "cc", models: [] }] };
  const revoked = await loader(context);
  assert.deepEqual(revoked.models, []);
  assert.deepEqual(revoked.diagnostics, []);
});

test("Claude driver passes account context and refreshes only the pool credential", async () => {
  const calls = [];
  const driver = createClaudeDriver({
    browserOAuth: false,
    commandRunner: async () => { throw new Error("must not invoke machine CLI"); },
    fetchImpl: async (url) => { calls.push(url); return response([{ id: "account-model" }]); },
  });
  const result = await driver.getCatalog({
    accounts: [account("a")], policy: "manual", defaultAccountId: "a",
    secretStore: { read: async (ref) => {
      assert.equal(ref, "ref:a");
      return { access: "pool-token", refresh: "pool-refresh", accountId: "a", expiresAt: "2099-01-01T00:00:00.000Z" };
    } },
  });
  assert.deepEqual(result.models.map((model) => model.id), ["account-model"]);
  assert.deepEqual(calls, ["https://api.anthropic.com/api/model_selector/cc"]);
});
