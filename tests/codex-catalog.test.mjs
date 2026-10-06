import test from "node:test";
import assert from "node:assert/strict";
import { createCodexDshCatalogLoader } from "../packages/dsh-plugin/src/codex-transport.mjs";
import { createCodexDriver, createCodexPiAiExecutor } from "../modules/provider-codex/src/driver.mjs";
import { commonAccountModels } from "../packages/providers/src/provider-utils.mjs";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { createProvider } from "@earendil-works/pi-ai";
import { stream, streamSimple } from "@earendil-works/pi-ai/api/openai-codex-responses";

const account = (id) => ({ accountId: id, auth: { credentialRef: `ref:${id}` }, refresh: {} });
const secretStore = { read: async (ref) => ({ accountId: ref.slice(4), access: `token:${ref.slice(4)}`, refresh: "refresh", expiresAt: "2099-01-01T00:00:00.000Z" }) };
const row = (slug) => ({ slug, display_name: slug, visibility: "list", supported_in_api: true, context_window: 272000,
  input_modalities: ["text", "image"], supported_reasoning_levels: [{ effort: "ultra", description: "Ultra" }], default_reasoning_level: "ultra" });
const response = (models, status = 200) => ({ ok: status === 200, status, text: async () => JSON.stringify({ models }) });

test("automatic account rotation advertises only shared capacities, inputs and reasoning tiers", () => {
  const first = { id: "shared", contextWindow: 200000, maxTokens: 32000, inputModalities: ["text", "image"], reasoning: { defaultEffort: "ultra", efforts: [{ id: "high" }, { id: "ultra" }] } };
  const second = { id: "shared", contextWindow: 100000, maxTokens: 16000, inputModalities: ["text"], reasoning: { efforts: [{ id: "high" }] } };
  assert.deepEqual(commonAccountModels([[first, { id: "exclusive" }], [second]]), [{
    id: "shared", contextWindow: 100000, maxTokens: 16000, inputModalities: ["text"], reasoning: { efforts: [{ id: "high" }] },
  }]);
  assert.equal(first.contextWindow, 200000);
});

test("Codex live directory follows account, refreshes, and never substitutes another account's cache", async () => {
  let calls = 0;
  let failed = false;
  const loader = createCodexDshCatalogLoader({ clientVersion: "0.159.2", fetchImpl: async (url, init) => {
    calls++;
    assert.equal(url, "https://chatgpt.com/backend-api/codex/models?client_version=0.159.2");
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.authorization, `Bearer token:${init.headers["chatgpt-account-id"]}`);
    return response([row("gpt-6-astra"), row(`new-${init.headers["chatgpt-account-id"]}`), { ...row("hidden"), visibility: "hide" }, { ...row("disabled"), supported_in_api: false }], failed ? 503 : 200);
  } });
  const context = { accounts: [account("a"), account("b")], secretStore, policy: "manual", defaultAccountId: "a", now: new Date(0) };
  assert.deepEqual((await loader(context)).models.map((model) => model.id), ["gpt-6-astra", "new-a"]);
  await loader({ ...context, now: new Date(299999) });
  assert.equal(calls, 1);
  await loader({ ...context, now: new Date(300000) });
  assert.equal(calls, 2);
  assert.deepEqual((await loader({ ...context, policy: "round_robin" })).models.map((model) => model.id), ["gpt-6-astra"]);
  failed = true;
  const stale = await loader({ ...context, force: true });
  assert.deepEqual(stale.models.map((model) => model.id), ["gpt-6-astra", "new-a"]);
  assert.match(stale.diagnostic, /503.*last successful/);
  assert.deepEqual((await loader({ ...context, accounts: [account("c")], defaultAccountId: "c" })).models, []);
  assert.deepEqual((await loader({ accounts: [] })).models, []);
  assert.deepEqual((await loader(context)).models, []);
});

test("browser-only Codex login uses official release metadata without sending OAuth to the registry", async () => {
  const urls = [];
  const loader = createCodexDshCatalogLoader({ home: "./nonexistent-codex-test-home", env: {}, fetchImpl: async (url, init) => {
    urls.push(url);
    if (url === "https://registry.npmjs.org/@openai/codex/latest") {
      assert.equal(init.headers, undefined);
      return { ok: true, status: 200, text: async () => JSON.stringify({ version: "0.159.2" }) };
    }
    assert.match(url, /client_version=0\.159\.2$/);
    return response([row("future-model")]);
  } });
  const result = await loader({ accounts: [account("a")], secretStore });
  assert.equal(urls.length, 2);
  assert.deepEqual(result.models.map((model) => model.id), ["future-model"]);
});

test("a new Codex directory model reaches the adapter without a bundled entry or invented output cap", async () => {
  let transportModel;
  let streamed;
  const loader = createCodexDshCatalogLoader({ clientVersion: "0.159.2", fetchImpl: async () => response([row("gpt-6.1-sol")]) });
  const executor = createCodexPiAiExecutor({
    PiAiAdapter: class { stream(request) { streamed = request; return "stream"; } },
    createProvider: (provider) => { transportModel = provider.models[0]; return provider; },
    openAICodexResponsesApi: () => ({}),
    modelResolver: () => { throw new Error("must not need bundled catalog"); },
  });
  const driver = createCodexDriver({ catalogLoader: loader, requestExecutor: executor });
  const request = { model: "gpt-6.1-sol", reasoningEffort: "ultra", messages: [] };
  assert.equal(await driver.invoke(request, { account: account("a") }, { secretStore }), "stream");
  assert.deepEqual(streamed, { ...request, reasoningEffort: "high" });
  assert.equal(request.reasoningEffort, "ultra");
  assert.equal(transportModel.id, "gpt-6.1-sol");
  assert.equal(transportModel.contextWindow, 272000);
  assert.equal(transportModel.maxTokens, undefined);
  assert.deepEqual(transportModel.input, ["text", "image"]);
  assert.equal(transportModel.thinkingLevelMap.ultra, "ultra");
  assert.equal(transportModel.thinkingLevelMap.high, "ultra");
});

test("real PiAI request construction preserves live effort wire values without network inference", async (t) => {
  let networkCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    networkCalls++;
    throw new Error("Network disabled in this test");
  });
  const payloads = [];
  const apiKey = `mock.${Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "mock-account" } })).toString("base64url")}.mock`;
  const catalogModel = Object.freeze({
    id: "live-model", contextWindow: 272000, inputModalities: ["text"], reasoning: true,
    thinkingLevelMap: Object.freeze({ ultra: "ultra", minimal: "low", future: "future-wire-value" }),
  });
  const executor = createCodexPiAiExecutor({
    PiAiAdapter,
    createProvider,
    openAICodexResponsesApi: () => ({
      stream,
      streamSimple: (model, context, options) => streamSimple(model, context, {
        ...options, transport: "sse",
        onPayload(body) {
          payloads.push(body);
          throw new Error("Stop after request construction");
        },
      }),
    }),
  });
  for (const [effort, wire] of [["ultra", "ultra"], ["minimal", "low"], ["future", "future-wire-value"], ["off", undefined], [undefined, undefined]]) {
    const request = { provider: "openai-codex", model: "live-model", messages: [], ...(effort ? { reasoningEffort: effort } : {}) };
    const output = await executor({ request, credential: { access: apiKey }, catalogModel });
    const chunks = [];
    for await (const chunk of output) chunks.push(chunk);
    assert.match(chunks.at(-1).reason.failure.message, /Stop after request construction/);
    assert.equal(payloads.at(-1).reasoning?.effort, wire);
    assert.equal(Object.hasOwn(payloads.at(-1), "max_output_tokens"), false);
    assert.equal(request.reasoningEffort, effort);
  }
  await assert.rejects(executor({
    request: { provider: "openai-codex", model: "live-model", messages: [], reasoningEffort: "not-advertised" },
    credential: { access: apiKey }, catalogModel,
  }), { code: "UNSUPPORTED_REASONING_EFFORT" });
  assert.equal(payloads.length, 5);
  assert.equal(catalogModel.thinkingLevelMap.high, undefined);
  assert.equal(networkCalls, 0);
});
