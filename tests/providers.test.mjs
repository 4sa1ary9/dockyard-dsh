import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { dirname, join } from "node:path";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { MemorySecretStore } from "../packages/vault/src/index.mjs";
import { createCliOAuthAuthorizer } from "../packages/oauth/src/cli-oauth-authorizer.mjs";
import { createCliStatusAuthorizer } from "../packages/oauth/src/cli-status-authorizer.mjs";
import { createCodexDriver, createCodexPiAiExecutor } from "../modules/provider-codex/src/index.mjs";
import {
  createAntigravityCatalogLoader,
  createAntigravityCliExecutor,
  createAntigravityDriver,
  createAntigravityOAuthAuthorizer,
  createAntigravityNativeQuotaReader,
  enrichAntigravityModelCatalog,
  extractAntigravityAccountEmail,
  antigravityRequestPrompt,
  parseAntigravityNativeQuota,
  parseAntigravityModelCatalog,
  resolveAntigravityInvocationModel,
  resolveAntigravityNativeInvocationModel,
} from "../modules/provider-antigravity/src/index.mjs";
import {
  createGrokCatalogLoader,
  createGrokCliExecutor,
  createGrokDriver,
  grokRequestPromptBlocks,
  parseGrokAuth,
  parseGrokModelCatalog,
} from "../modules/provider-grok/src/index.mjs";
import {
  createClaudeCatalogLoader,
  createClaudeCliExecutor,
  parseClaudeAuthStatus,
} from "../modules/provider-claude/src/index.mjs";
import {
  createCursorCatalogLoader,
  createCursorCliExecutor,
  parseCursorAuthStatus,
} from "../modules/provider-cursor/src/index.mjs";
import { codexModelToDshCatalog } from "../packages/dsh-plugin/src/codex-transport.mjs";

function jwt(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() { return JSON.stringify(body); },
  };
}

test("Codex driver imports local OAuth and parses live multi-window quota", async () => {
  const home = await mkdtemp(join(tmpdir(), "dockyard-codex-"));
  try {
    const authPath = join(home, "auth.json");
    const access = jwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      "https://api.openai.com/auth": { chatgpt_account_id: "acct-live", chatgpt_plan_type: "pro" },
      "https://api.openai.com/profile": { email: "live@example.test", name: "Live User" },
    });
    await writeFile(authPath, JSON.stringify({
      tokens: { access_token: access, refresh_token: "refresh-live", account_id: "acct-live" },
      last_refresh: "2026-08-14T12:00:00.000Z",
    }));
    const driver = createCodexDriver({
      authFilePath: authPath,
      usageUrls: ["https://provider.test/primary", "https://provider.test/fallback"],
      fetchImpl: async (url) => url.endsWith("primary")
        ? response(403, {})
        : response(200, {
          account_id: "acct-live",
          email: "live@example.test",
          plan_type: "pro",
          rate_limit: {
            primary_window: { used_percent: 20, reset_at: 1_900_000_000_000 },
            secondary_window: { used_percent: 5, reset_after_seconds: 300 },
          },
        }),
    });
    const secretStore = new MemorySecretStore();
    const discovered = await driver.discover({ now: new Date("2026-08-14T12:00:00.000Z") });
    assert.equal(discovered.candidates.length, 1);
    const account = await driver.importAccount(discovered.candidates[0], { secretStore, now: new Date("2026-08-14T12:00:00.000Z") });
    const quota = await driver.getQuota(account, { secretStore, now: new Date("2026-08-14T12:00:00.000Z") });
    assert.equal(quota.subscription.plan, "pro");
    assert.equal(quota.identity.email, "live@example.test");
    assert.equal(quota.quota.remaining, 80);
    assert.equal(quota.quota.unit, "percent");
    assert.equal(quota.quota.windows.length, 2);
    assert.equal((await driver.getCatalog()).models.length, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("Codex PiAI transport forwards DSH durable attachments", async () => {
  let adapterOptions;
  let streamedRequest;
  class StubPiAiAdapter {
    constructor(options) {
      adapterOptions = options;
    }

    stream(request) {
      streamedRequest = request;
      return "stream-result";
    }
  }
  const executor = createCodexPiAiExecutor({
    PiAiAdapter: StubPiAiAdapter,
    createProvider: (options) => options,
    openAICodexResponsesApi: () => ({}),
    modelResolver: () => ({
      name: "Live Codex",
      contextWindow: 272_000,
      maxTokens: 128_000,
      input: ["text", "image"],
    }),
  });
  const attachments = { id: "durable-attachments" };
  const request = { model: "live-codex", input: [{ type: "text", text: "hello" }] };
  const result = await executor({
    request,
    credential: { access: "oauth-access" },
    context: { attachments },
  });

  assert.equal(result, "stream-result");
  assert.equal(streamedRequest, request);
  assert.equal(adapterOptions.resolveAttachments(), attachments);
});

test("Codex preserves a 401 OAuth signal across quota endpoint fallback", async () => {
  const access = jwt({
    exp: Math.floor(Date.now() / 1000) + 3600,
    "https://api.openai.com/auth": { chatgpt_account_id: "acct-stale", chatgpt_plan_type: "plus" },
    "https://api.openai.com/profile": { email: "stale@example.test", name: "Stale User" },
  });
  const driver = createCodexDriver({
    usageUrls: ["https://provider.test/primary", "https://provider.test/fallback"],
    fetchImpl: async (url) => url.endsWith("primary") ? response(401, {}) : response(403, {}),
  });
  const secretStore = new MemorySecretStore();
  const [account] = await driver.importSource({
    content: JSON.stringify({
      tokens: { access_token: access, refresh_token: "refresh-stale", account_id: "acct-stale" },
    }),
  }, { secretStore });

  await assert.rejects(
    driver.getQuota(account, { secretStore }),
    (error) => {
      assert.equal(error.authExpired, true);
      assert.equal(error.authForbidden, false);
      assert.match(error.message, /reauthorization required/);
      return true;
    },
  );
});

test("CLI OAuth authorizer waits for the official login process and imports its isolated profile", async () => {
  const authState = JSON.stringify({ login: "completed" });
  const childScript = [
    "const { writeFileSync } = require('node:fs');",
    "const { join } = require('node:path');",
    `writeFileSync(join(process.env.DOCKYARD_TEST_OAUTH_HOME, 'auth.json'), ${JSON.stringify(authState)});`,
    "console.error('https://provider.test/oauth/authorize\\u001b[0m');",
  ].join(" ");
  const authorizer = createCliOAuthAuthorizer({
    providerId: "test-provider",
    cliPath: process.execPath,
    loginArgs: ["-e", childScript],
    environmentKey: "DOCKYARD_TEST_OAUTH_HOME",
    importCredentials: async (raw) => [{
      providerId: "test-provider",
      accountId: raw.login,
      credentialRef: "keychain://test-provider/login",
    }],
  });
  const started = await authorizer.begin();
  assert.equal(started.status, "pending");
  let result = await authorizer.poll(started.sessionId, {});
  for (let attempt = 0; result.status === "pending" && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    result = await authorizer.poll(started.sessionId, {});
  }
  assert.equal(result.status, "completed");
  assert.equal(result.accounts[0].accountId, "completed");
  assert.equal(result.authorizationUrl, "https://provider.test/oauth/authorize");
});

test("CLI OAuth authorizer can keep a provider profile and report CLI-owned browser flow", async () => {
  const home = await mkdtemp(join(tmpdir(), "dockyard-provider-oauth-"));
  try {
    const authState = JSON.stringify({ login: "provider-profile" });
    const childScript = [
      "const { writeFileSync } = require('node:fs');",
      "const { join } = require('node:path');",
      `writeFileSync(join(process.env.DOCKYARD_TEST_OAUTH_HOME, 'auth.json'), ${JSON.stringify(authState)});`,
      "console.error('https://provider.test/oauth/authorize\\u001b[0m');",
    ].join(" ");
    const authorizer = createCliOAuthAuthorizer({
      providerId: "test-provider-profile",
      cliPath: process.execPath,
      loginArgs: ["-e", childScript],
      environmentKey: "DOCKYARD_TEST_OAUTH_HOME",
      profileDirectory: home,
      browserOpened: true,
      importCredentials: async (raw) => [{
        providerId: "test-provider-profile",
        accountId: raw.login,
        credentialRef: "keychain://test-provider-profile/login",
      }],
    });
    const started = await authorizer.begin();
    assert.equal(started.status, "pending");
    assert.equal(started.browserOpened, true);
    let result = await authorizer.poll(started.sessionId, {});
    for (let attempt = 0; result.status === "pending" && attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      result = await authorizer.poll(started.sessionId, {});
    }
    assert.equal(result.status, "completed");
    assert.equal(result.browserOpened, true);
    assert.equal(result.accounts[0].accountId, "provider-profile");
    assert.equal(result.authorizationUrl, "https://provider.test/oauth/authorize");
    assert.equal(await readFile(join(home, "auth.json"), "utf8"), authState);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("CLI status authorizer reports a browser already opened by the provider CLI", async () => {
  const childScript = "console.error('https://provider.test/oauth/authorize');";
  const authorizer = createCliStatusAuthorizer({
    providerId: "test-status-provider",
    cliPath: process.execPath,
    loginArgs: ["-e", childScript],
    browserOpened: true,
    importStatus: async () => [{
      providerId: "test-status-provider",
      accountId: "active-account",
    }],
  });
  const started = await authorizer.begin();
  assert.equal(started.browserOpened, true);
  let result = await authorizer.poll(started.sessionId, {});
  for (let attempt = 0; result.status === "pending" && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    result = await authorizer.poll(started.sessionId, {});
  }
  assert.equal(result.status, "completed");
  assert.equal(result.browserOpened, true);
  assert.equal(result.accounts[0].accountId, "active-account");
  assert.equal(result.authorizationUrl, "https://provider.test/oauth/authorize");
});

test("Antigravity OAuth authorizer captures agy's browser URL and imports its isolated token", async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = { writable: true, write() {} };
  child.kill = () => true;
  const authorizer = createAntigravityOAuthAuthorizer({
    cliPath: "agy",
    spawnImpl: (_command, _args, options) => {
      queueMicrotask(async () => {
        child.stderr.emit("data", "https://accounts.google.com/o/oauth2/auth?state=test&code_challenge=test\n");
        await mkdir(dirname(options.env.DOCKYARD_ANTIGRAVITY_TOKEN_FILE), { recursive: true });
        await writeFile(options.env.DOCKYARD_ANTIGRAVITY_TOKEN_FILE, JSON.stringify({ access_token: "isolated-token" }));
      });
      return child;
    },
  });
  const started = await authorizer.begin({ accounts: [] });
  assert.equal(started.status, "pending");
  let result = await authorizer.poll(started.sessionId, { accounts: [] });
  for (let attempt = 0; result.status === "pending" && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    result = await authorizer.poll(started.sessionId, { accounts: [] });
  }
  assert.equal(result.status, "completed");
  assert.equal(result.authorizationUrl, "https://accounts.google.com/o/oauth2/auth?state=test&code_challenge=test");
  assert.equal(result.accounts[0].resources.sessionPersistence, "captured");
  assert.equal(started.browserOpened, true);
});

test("Antigravity OAuth authorizer reports submitted codes as processing", async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  const writes = [];
  child.stdin = { writable: true, write(value) { writes.push(value); } };
  child.kill = () => true;
  const authorizer = createAntigravityOAuthAuthorizer({
    cliPath: "agy",
    spawnImpl: () => child,
  });
  const started = await authorizer.begin();
  const submitted = await authorizer.submitAuthorizationCode(started.sessionId, "fresh-code");
  assert.equal(submitted.status, "processing");
  assert.match(submitted.instructions, /正在等待官方登录完成/);
  assert.deepEqual(writes, ["fresh-code\n"]);
  await authorizer.cancel(started.sessionId);
});

test("Antigravity driver uses official CLI data without requiring token storage", async () => {
  const commandRunner = async (_command, args) => {
    const command = args[1];
    if (command === "/quota") return { output: JSON.stringify({ status: "SUCCESS", command: { data: { groups: [{ name: "Live group", buckets: [{ id: "window-live", name: "Live window", remaining_fraction: 0.75, reset_time: 1_900_000_000_000 }] }] } }, response: "" }), errorOutput: "" };
    if (command === "/credits") return { output: JSON.stringify({ status: "SUCCESS", command: { data: { remaining_credits: 4, upgrade_uri: "https://provider.test/upgrade" } }, response: "" }), errorOutput: "" };
    if (args[0] === "models") return { output: "Fetching available models...\nmodel-from-provider\tLive model\n", errorOutput: "" };
    throw new Error("unexpected command");
  };
  const driver = createAntigravityDriver({ commandRunner, tokenResolver: () => null });
  const secretStore = new MemorySecretStore();
  const discovered = await driver.discover({ now: new Date("2026-08-14T12:00:00.000Z") });
  assert.equal(discovered.candidates.length, 1);
  const account = await driver.importAccount(discovered.candidates[0], { secretStore });
  const quota = await driver.getQuota(account, { secretStore, now: new Date("2026-08-14T12:00:00.000Z") });
  assert.equal(quota.quota.remaining, 0.75);
  assert.equal(quota.resources, undefined);
  assert.equal(quota.credits.remaining, 4);
  assert.deepEqual((await driver.getCatalog()).models, [{ id: "model-from-provider", name: "Live model" }]);
});

test("Antigravity account discovery keeps provider identity and captures distinct local sessions", async () => {
  const commandRunner = async () => ({
    output: JSON.stringify({
      status: "SUCCESS",
      command: { data: { groups: [{ buckets: [{ id: "window-live", remaining_fraction: 0.75 }] }] } },
      response: "",
    }),
    errorOutput: "applyAuthResult: email=first@example.test",
  });
  const driver = createAntigravityDriver({
    commandRunner,
    tokenResolver: () => ({ token: "session-token-first" }),
  });
  const discovered = await driver.discover({ now: new Date("2026-08-14T12:00:00.000Z") });
  const candidate = discovered.candidates[0];
  assert.equal(extractAntigravityAccountEmail("OAuth: authenticated successfully as first@example.test"), "first@example.test");
  assert.equal(candidate.email, "first@example.test");
  assert.equal(candidate.displayName, "first@example.test");
  assert.equal(candidate.resources.sessionPersistence, "captured");
  assert.equal(candidate.resources.identitySource, "official_cli_auth_status");

  const secretStore = new MemorySecretStore();
  const account = await driver.importAccount(candidate, { secretStore });
  assert.deepEqual(await secretStore.read(account.credentialRef), {
    type: "official_cli_session",
    providerId: "antigravity",
    access: "session-token-first",
  });

  const second = createAntigravityDriver({
    commandRunner: async () => ({
      output: JSON.stringify({ status: "SUCCESS", command: { data: { groups: [{ buckets: [{ id: "window-live", remaining_fraction: 0.75 }] }] } } }),
      errorOutput: "applyAuthResult: email=second@example.test",
    }),
    tokenResolver: () => ({ token: "session-token-second" }),
  });
  const secondCandidate = (await second.discover({ now: new Date("2026-08-14T12:00:00.000Z") })).candidates[0];
  assert.notEqual(secondCandidate.accountId, candidate.accountId);
  assert.notEqual(secondCandidate.resources.sessionFingerprint, candidate.resources.sessionFingerprint);
});

test("Antigravity refreshAccount reuses the live quota response", async () => {
  const calls = [];
  const commandRunner = async (_command, args) => {
    const command = args[1];
    calls.push(command);
    if (command === "/quota") {
      return { output: JSON.stringify({ status: "SUCCESS", command: { data: { groups: [{ name: "Live group", buckets: [{ id: "window-live", name: "Live window", remaining_fraction: 0.8, reset_time: 1_900_000_000_000 }] }] } }, response: "" }), errorOutput: "" };
    }
    if (command === "/credits") {
      return { output: JSON.stringify({ status: "SUCCESS", command: { data: { remaining_credits: 5 } }, response: "" }), errorOutput: "" };
    }
    throw new Error(`unexpected command: ${command}`);
  };
  const driver = createAntigravityDriver({ commandRunner, tokenResolver: () => null });
  const discovered = await driver.discover({ now: new Date("2026-08-14T12:00:00.000Z") });
  const account = await driver.importAccount(discovered.candidates[0], { secretStore: new MemorySecretStore() });
  calls.length = 0;

  const refreshed = await driver.refreshAccount(account, { now: new Date("2026-08-14T12:00:00.000Z") });
  assert.equal(refreshed.quota.remaining, 0.8);
  assert.equal(refreshed.credits.remaining, 5);
  assert.deepEqual(calls.sort(), ["/credits", "/quota"]);
});

test("Antigravity does not fall back to the global CLI quota for a selected account", async () => {
  let cliCalls = 0;
  const driver = createAntigravityDriver({
    quotaReader: async () => {
      throw new Error("selected account quota unavailable");
    },
    commandRunner: async () => {
      cliCalls += 1;
      throw new Error("global CLI must not be used");
    },
  });
  await assert.rejects(
    () => driver.refreshAccount({
      accountId: "account-a",
      auth: { credentialRef: "keychain://account-a" },
    }),
    /selected account quota unavailable/,
  );
  assert.equal(cliCalls, 0);
});

test("Antigravity native quota reader uses the first-party summary endpoint", async () => {
  let request;
  const reader = createAntigravityNativeQuotaReader({
    endpoint: "https://provider.test/v1internal:retrieveUserQuotaSummary",
    project: null,
    tokenResolver: () => ({ token: "oauth-token" }),
    fetchImpl: async (url, init) => {
      request = { url, init };
      return {
        status: 200,
        ok: true,
        async json() {
          return {
            quotaGroups: [{
              name: "Live group",
              buckets: [{ id: "weekly", name: "Weekly", remainingFraction: 0.91, resetTime: 1_900_000_000_000 }],
            }],
            remainingCredits: 7,
          };
        },
      };
    },
  });
  const raw = await reader({});
  const quota = parseAntigravityNativeQuota(raw, new Date("2026-08-14T12:00:00.000Z"));
  assert.equal(request.url, "https://provider.test/v1internal:retrieveUserQuotaSummary");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.authorization, "Bearer oauth-token");
  assert.deepEqual(JSON.parse(request.init.body), {});
  assert.equal(quota.windows[0].remaining, 0.91);
  assert.equal(quota.windows[0].source, "antigravity_native");
  assert.equal(quota.credits.remaining, 7);
});

test("Antigravity catalog stays mounted when the optional CLI is unavailable", async () => {
  let calls = 0;
  const loader = createAntigravityCatalogLoader({
    cacheTtlMs: 60_000,
    commandRunner: async () => {
      calls += 1;
      const error = new Error("spawn agy ENOENT");
      error.code = "ENOENT";
      throw error;
    },
  });

  const first = await loader();
  const second = await loader();
  assert.deepEqual(first.models, []);
  assert.equal(first.source, "antigravity_cli_not_found");
  assert.match(first.diagnostics[0], /spawn agy ENOENT/);
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test("provider model metadata exposes only returned reasoning tiers", () => {
  assert.deepEqual(parseAntigravityModelCatalog([
    "Fetching available models...",
    "gemini-live-low\tGemini Live (Low)",
    "gemini-live-medium\tGemini Live (Medium)",
    "gemini-live-high\tGemini Live (High)",
    "claude-live\tClaude Live (Thinking)",
  ].join("\n")), [
    {
      id: "gemini-live-low",
      name: "Gemini Live (Low)",
      reasoning: {
        efforts: [
          { id: "low", name: "Low" },
          { id: "medium", name: "Medium" },
          { id: "high", name: "High" },
        ],
        defaultEffort: "low",
      },
    },
    {
      id: "gemini-live-medium",
      name: "Gemini Live (Medium)",
      reasoning: {
        efforts: [
          { id: "low", name: "Low" },
          { id: "medium", name: "Medium" },
          { id: "high", name: "High" },
        ],
        defaultEffort: "medium",
      },
    },
    {
      id: "gemini-live-high",
      name: "Gemini Live (High)",
      reasoning: {
        efforts: [
          { id: "low", name: "Low" },
          { id: "medium", name: "Medium" },
          { id: "high", name: "High" },
        ],
        defaultEffort: "high",
      },
    },
    { id: "claude-live", name: "Claude Live (Thinking)" },
  ]);

  assert.deepEqual(codexModelToDshCatalog({
    id: "live-gpt",
    name: "Live GPT",
    reasoning: true,
    thinkingLevelMap: { minimal: "low", xhigh: "xhigh", off: "none" },
  }).reasoning, {
    efforts: [
      { id: "minimal", name: "Minimal", description: "provider value: low" },
      { id: "xhigh", name: "Xhigh" },
    ],
  });
});

test("Antigravity capacity metadata is enriched only from a live-compatible registry family", () => {
  const live = parseAntigravityModelCatalog([
    "gemini-3.6-flash-high\tGemini 3.6 Flash (High)",
    "gemini-3.6-flash-medium\tGemini 3.6 Flash (Medium)",
  ].join("\n"));
  assert.deepEqual(enrichAntigravityModelCatalog(live, [{
    id: "gemini-3.6-flash",
    contextWindow: 1048576,
    maxTokens: 65536,
    input: ["text", "image"],
  }]), [
    {
      id: "gemini-3.6-flash-high",
      name: "Gemini 3.6 Flash (High)",
      reasoning: {
        efforts: [
          { id: "high", name: "High" },
          { id: "medium", name: "Medium" },
        ],
        defaultEffort: "high",
      },
      contextWindow: 1048576,
      maxTokens: 65536,
      inputModalities: ["text", "image"],
    },
    {
      id: "gemini-3.6-flash-medium",
      name: "Gemini 3.6 Flash (Medium)",
      reasoning: {
        efforts: [
          { id: "high", name: "High" },
          { id: "medium", name: "Medium" },
        ],
        defaultEffort: "medium",
      },
      contextWindow: 1048576,
      maxTokens: 65536,
      inputModalities: ["text", "image"],
    },
  ]);
  assert.deepEqual(enrichAntigravityModelCatalog(live, [{ id: "gemini-3.7-flash" }])[0].contextWindow, undefined);
});

test("Antigravity prompt keeps the newest messages inside returned model capacity", () => {
  const prompt = antigravityRequestPrompt({
    modelContext: { contextWindow: 16, maxTokens: 1 },
    messages: [
      { role: "user", content: "old ".repeat(100) },
      { role: "assistant", content: "previous answer" },
      { role: "user", content: "new" },
    ],
  });
  assert.equal(prompt.includes("old ".repeat(10)), false);
  assert.equal(prompt.includes("new"), true);
});

test("Antigravity executor calls the official CLI with the selected model and effort", async () => {
  let command;
  const executor = createAntigravityCliExecutor({
    cliPath: "agy-test",
    env: { PATH: "/provider/bin" },
    streamCommandRunner: async function* (path, args, options) {
      command = { path, args, options };
      yield JSON.stringify({ event: "content_block_delta", delta: { text_delta: "provider" } });
      yield JSON.stringify({ event: "content_block_delta", delta: { text_delta: " response" } });
      yield JSON.stringify({
        event: "result",
        result: {
          status: "SUCCESS",
          response: "provider response",
          usage: { input_tokens: 3, output_tokens: 2 },
        },
      });
    },
  });
  const stream = await executor({
    request: {
      model: "gemini-live-medium",
      reasoningEffort: "medium",
      system: "Be concise.",
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
    },
  });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.deepEqual(command.args.slice(-7), ["--model", "gemini-live-medium", "--effort", "medium", "--sandbox", "--output-format", "stream-json"]);
  assert.equal(command.args[0], "-p");
  assert.match(command.args[1], /system:\nBe concise\./);
  assert.deepEqual(chunks, [
    { type: "block-start", index: 0, blockType: "text" },
    { type: "text-delta", index: 0, text: "provider" },
    { type: "text-delta", index: 0, text: " response" },
    { type: "block-end", index: 0, block: { type: "text", text: "provider response" } },
    { type: "usage", usage: { inputTokens: 3, outputTokens: 2 } },
    { type: "finish", reason: { kind: "stop" } },
  ]);
});

test("Antigravity maps a native run_command event into DSH bash", async () => {
  const executor = createAntigravityCliExecutor({
    cliPath: "agy-test",
    streamCommandRunner: async function* () {
      yield JSON.stringify({
        event: "step_update",
        step_update: {
          state: "ACTIVE",
          step_type: "tool",
          tool_name: "run_command",
          tool_info: { parameters: { CommandLine: "pwd", Cwd: "/tmp" } },
        },
      });
      throw new Error("the bridge should stop after forwarding the tool call");
    },
  });
  const stream = await executor({
    request: {
      model: "gemini-live-medium",
      tools: [{ name: "bash", description: "Execute bash", parameters: {} }],
      messages: [{ role: "user", content: [{ type: "text", text: "check" }] }],
    },
  });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.deepEqual(chunks, [
    { type: "block-start", index: 0, blockType: "text" },
    { type: "block-end", index: 0, block: { type: "text", text: "" } },
    { type: "block-start", index: 1, blockType: "tool-call" },
    {
      type: "block-end",
      index: 1,
      block: {
        type: "tool-call",
        id: chunks[3].block.id,
        name: "bash",
        arguments: JSON.stringify({ command: "pwd", description: "Run the requested command", workdir: "/tmp" }),
      },
    },
    { type: "finish", reason: { kind: "tool-calls" } },
  ]);
});

test("Antigravity maps a selected effort to the exact returned model row", async () => {
  const catalogLoader = async () => ({
    models: [
      {
        id: "gemini-live-high",
        name: "Gemini Live (High)",
        reasoning: { efforts: [{ id: "high", name: "High" }, { id: "medium", name: "Medium" }], defaultEffort: "high" },
      },
      {
        id: "gemini-live-medium",
        name: "Gemini Live (Medium)",
        reasoning: { efforts: [{ id: "high", name: "High" }, { id: "medium", name: "Medium" }], defaultEffort: "medium" },
      },
    ],
  });
  assert.deepEqual(await resolveAntigravityInvocationModel({
    catalogLoader,
    model: "gemini-live-medium",
    reasoningEffort: "high",
  }), { model: "gemini-live-high", reasoningEffort: undefined });
  assert.deepEqual(await resolveAntigravityNativeInvocationModel({
    catalogLoader,
    model: "gemini-live-medium",
    reasoningEffort: "medium",
  }), { model: "gemini-live-medium", reasoningEffort: "medium" });

  let calls = 0;
  const cachedLoader = createAntigravityCatalogLoader({
    cacheTtlMs: 60_000,
    commandRunner: async () => {
      calls += 1;
      return { output: "live-model\tLive model\n", errorOutput: "" };
    },
  });
  await cachedLoader();
  await cachedLoader();
  assert.equal(calls, 1);
});

test("Grok imports every OAuth account in a provider source without exposing tokens", async () => {
  const home = await mkdtemp(join(tmpdir(), "dockyard-grok-"));
  try {
    const raw = {
      "https://auth.x.ai::account-a": {
        key: "access-a",
        refresh_token: "refresh-a",
        user_id: "grok-account-a",
        email: "a@example.test",
        first_name: "Account A",
        expires_at: "2026-08-15T12:00:00.000Z",
        oidc_issuer: "https://auth.x.ai",
        oidc_client_id: "client-a",
      },
      "https://auth.x.ai::account-b": {
        key: "access-b",
        refresh_token: "refresh-b",
        user_id: "grok-account-b",
        email: "b@example.test",
        expires_at: "2026-08-15T12:00:00.000Z",
        oidc_issuer: "https://auth.x.ai",
        oidc_client_id: "client-b",
      },
    };
    assert.deepEqual(parseGrokAuth(raw).map(({ access: _access, refresh: _refresh, ...value }) => value), [
      {
        accountId: "grok-account-a",
        email: "a@example.test",
        displayName: "Account A",
        plan: null,
        expiresAt: "2026-08-15T12:00:00.000Z",
        createdAt: null,
        scopes: [],
        issuer: "https://auth.x.ai",
        clientId: "client-a",
        authMode: null,
        scopeKey: "https://auth.x.ai::account-a",
      },
      {
        accountId: "grok-account-b",
        email: "b@example.test",
        displayName: "b@example.test",
        plan: null,
        expiresAt: "2026-08-15T12:00:00.000Z",
        createdAt: null,
        scopes: [],
        issuer: "https://auth.x.ai",
        clientId: "client-b",
        authMode: null,
        scopeKey: "https://auth.x.ai::account-b",
      },
    ]);
    const driver = createGrokDriver({
      authFilePath: join(home, "auth.json"),
      grokHome: home,
      catalogLoader: async () => ({ models: [] }),
    });
    const secretStore = new MemorySecretStore();
    const imported = await driver.importSource({ content: JSON.stringify(raw), fileName: "auth.json" }, { secretStore });
    assert.deepEqual(imported.map((account) => account.accountId), ["grok-account-a", "grok-account-b"]);
    assert.equal(imported[0].auth.credentialRef, undefined);
    assert.equal((await secretStore.read(imported[0].credentialRef)).access, "access-a");
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("Grok model metadata comes from the provider cache, including returned reasoning tiers", () => {
  assert.deepEqual(parseGrokModelCatalog("", {
    models: {
      "grok-live": {
        info: {
          model: "grok-live",
          name: "Grok Live",
          context_window: 123456,
          reasoning_effort: "high",
          reasoning_efforts: [
            { id: "low", value: "low", label: "Low Effort" },
            { id: "high", value: "high", label: "High Effort", description: "provider returned", default: true },
          ],
        },
      },
    },
  }), [{
    id: "grok-live",
    name: "Grok Live",
    reasoning: {
      efforts: [
        { id: "low", name: "Low Effort" },
        { id: "high", name: "High Effort", description: "provider returned" },
      ],
      defaultEffort: "high",
    },
    contextWindow: 123456,
  }]);
});

test("Grok catalog loader caches a local provider response", async () => {
  let reads = 0;
  const loader = createGrokCatalogLoader({
    grokHome: "/provider/grok",
    readJson: async (path) => {
      reads += 1;
      assert.match(path, /models_cache\.json$/);
      return { models: { "grok-live": { info: { model: "grok-live" } } } };
    },
    cacheTtlMs: 60_000,
  });
  const first = await loader();
  const second = await loader();
  assert.deepEqual(first.models, [{ id: "grok-live", name: "grok-live" }]);
  assert.strictEqual(first, second);
  assert.equal(reads, 1);
});

test("Claude subscription status rejects API keys and maps live registry metadata", async () => {
  const apiKey = parseClaudeAuthStatus(JSON.stringify({
    loggedIn: true,
    authMethod: "api_key",
    apiProvider: "firstParty",
    apiKeySource: "ANTHROPIC_API_KEY",
  }));
  assert.equal(apiKey.isApiKey, true);
  assert.equal(apiKey.isSubscription, false);

  const subscription = parseClaudeAuthStatus(JSON.stringify({
    loggedIn: true,
    authMethod: "oauth",
    apiProvider: "firstParty",
    email: "claude@example.test",
    plan: "max",
  }));
  assert.equal(subscription.isSubscription, true);
  assert.equal(subscription.email, "claude@example.test");

  const loader = createClaudeCatalogLoader({
    registryLoader: async () => [
      {
        id: "claude-live",
        name: "Claude Live",
        provider: "anthropic",
        api: "anthropic-messages",
        input: ["text", "image"],
        contextWindow: 200_000,
        maxTokens: 32_000,
        thinkingLevelMap: { off: {}, low: {}, high: {} },
      },
      { id: "unrelated", provider: "other" },
    ],
  });
  assert.deepEqual((await loader()).models, [{
    id: "claude-live",
    name: "Claude Live",
    inputModalities: ["text", "image"],
    contextWindow: 200_000,
    maxTokens: 32_000,
    reasoning: {
      efforts: [{ id: "low", name: "Low" }, { id: "high", name: "High" }],
    },
  }]);
});

test("Claude catalog collapses duplicate registry aliases", async () => {
  const loader = createClaudeCatalogLoader({
    registryLoader: async () => [
      { id: "claude-live", name: "Claude Live", provider: "anthropic", contextWindow: 200_000 },
      { id: "claude-live", name: "Claude Live", api: "anthropic-messages", maxTokens: 32_000 },
    ],
  });
  assert.deepEqual((await loader()).models, [{
    id: "claude-live",
    name: "Claude Live",
    contextWindow: 200_000,
    maxTokens: 32_000,
  }]);
});

test("Claude official CLI executor preserves streaming output and selected model tier", async () => {
  const calls = [];
  const executor = createClaudeCliExecutor({
    cliPath: "claude",
    streamCommandRunner: async function* (command, args, options) {
      calls.push({ command, args, options });
      yield JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "Hel" } } });
      yield JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "lo" } } });
      yield JSON.stringify({ type: "result", result: "Hello", usage: { input_tokens: 2, output_tokens: 3 } });
    },
  });
  const stream = await executor({
    request: {
      model: "claude-live",
      reasoningEffort: "high",
      messages: [{ role: "user", content: "Say hello" }],
    },
  });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "claude");
  assert.deepEqual(calls[0].args.slice(0, 4), ["-p", "user:\nSay hello", "--output-format", "stream-json"]);
  assert.ok(calls[0].args.includes("--model") && calls[0].args.includes("claude-live"));
  assert.ok(calls[0].args.includes("--effort") && calls[0].args.includes("high"));
  assert.deepEqual(chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => chunk.text), ["Hel", "lo"]);
  assert.deepEqual(chunks.find((chunk) => chunk.type === "usage")?.usage, { inputTokens: 2, outputTokens: 3 });
});

test("text-only subscription CLIs reject images instead of dropping them", async () => {
  const imageRequest = {
    messages: [{
      role: "user",
      content: [{ type: "text", text: "Inspect this" }, { type: "image", attachment: { attachmentId: "img-1" } }],
    }],
  };
  const executor = createClaudeCliExecutor({ cliPath: "claude" });
  await assert.rejects(
    () => executor({ request: imageRequest }),
    (error) => error.code === "UNSUPPORTED_CONTENT" && /image attachments/.test(error.message),
  );
});

test("text-only subscription CLIs can continue after an earlier failed image turn", async () => {
  const calls = [];
  const executor = createClaudeCliExecutor({
    cliPath: "claude",
    streamCommandRunner: async function* (command, args) {
      calls.push({ command, args });
      yield JSON.stringify({ type: "text_delta", text: "continued" });
    },
  });
  const stream = await executor({
    request: {
      messages: [
        { role: "user", content: [{ type: "image", attachment: { attachmentId: "failed-image" } }] },
        { role: "assistant", content: "The image turn failed." },
        { role: "user", content: "Continue with text only." },
      ],
    },
  });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.equal(calls.length, 1);
  assert.match(calls[0].args[1], /previous image attachment omitted by native CLI/);
  assert.equal(chunks.find((chunk) => chunk.type === "text-delta")?.text, "continued");
});

test("Grok ACP prompt preserves durable image bytes and media type", async () => {
  const blocks = await grokRequestPromptBlocks({
    system: "Use the image.",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "What is here?" },
        { type: "image", attachment: { attachmentId: "img-1", mediaType: "image/png" } },
      ],
    }],
  }, {
    async readImage(ref) {
      assert.equal(ref.attachmentId, "img-1");
      return { ref: { mediaType: "image/png" }, data: Uint8Array.from([1, 2, 3]) };
    },
  });
  assert.deepEqual(blocks.at(-1), { type: "image", data: "AQID", mimeType: "image/png" });
});

test("Grok image requests use the native ACP executor", async () => {
  let textExecutorCalled = false;
  let acpRequest;
  const executor = createGrokCliExecutor({
    streamCommandRunner: async function* () {
      textExecutorCalled = true;
    },
    acpExecutor: async ({ request }) => {
      acpRequest = request;
      return (async function* () {
        yield { type: "text-delta", index: 0, text: "image ok" };
        yield { type: "finish", reason: { kind: "stop" } };
      })();
    },
  });
  const stream = await executor({
    request: {
      model: "grok-vision-live",
      messages: [{ role: "user", content: [{ type: "image", data: "AQID", mimeType: "image/png" }] }],
    },
  });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.equal(textExecutorCalled, false);
  assert.equal(acpRequest.model, "grok-vision-live");
  assert.equal(chunks[0].text, "image ok");
});

test("Cursor status/catalog are sourced from the official CLI response", async () => {
  const output = JSON.stringify({
    loggedIn: true,
    email: "cursor@example.test",
    plan: "pro",
    models: [{ id: "cursor-live", name: "Cursor Live", contextWindow: 128_000, maxTokens: 16_000 }],
  });
  const status = parseCursorAuthStatus(output);
  assert.equal(status.loggedIn, true);
  assert.equal(status.email, "cursor@example.test");
  assert.equal(status.models[0].id, "cursor-live");
  const loader = createCursorCatalogLoader({
    commandRunner: async (command, args) => {
      assert.equal(command, "cursor-agent");
      assert.deepEqual(args, ["status"]);
      return { output, errorOutput: "" };
    },
  });
  assert.deepEqual((await loader()).models, [{
    id: "cursor-live",
    name: "Cursor Live",
    contextWindow: 128_000,
    maxTokens: 16_000,
  }]);
});

test("Cursor official CLI executor passes the selected model and normalizes stream-json", async () => {
  const calls = [];
  const executor = createCursorCliExecutor({
    cliPath: "cursor-agent",
    streamCommandRunner: async function* (command, args, options) {
      calls.push({ command, args, options });
      yield JSON.stringify({ type: "text_delta", text: "Cursor response" });
      yield JSON.stringify({ type: "result", result: "Cursor response", usage: { input_tokens: 4, output_tokens: 5 } });
    },
  });
  const stream = await executor({
    request: { model: "cursor-live", messages: [{ role: "user", content: "Hello" }] },
  });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.equal(calls[0].command, "cursor-agent");
  assert.deepEqual(calls[0].args.slice(0, 4), ["-p", "user:\nHello", "--output-format", "stream-json"]);
  assert.ok(calls[0].args.includes("--model") && calls[0].args.includes("cursor-live"));
  assert.deepEqual(chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => chunk.text), ["Cursor response"]);
  assert.deepEqual(chunks.find((chunk) => chunk.type === "usage")?.usage, { inputTokens: 4, outputTokens: 5 });
});

test("Grok OAuth account execution uses an isolated official CLI profile", async () => {
  const home = await mkdtemp(join(tmpdir(), "dockyard-grok-exec-"));
  const secretStore = new MemorySecretStore();
  let profileDir = null;
  try {
    const driver = createGrokDriver({
      grokHome: home,
      commandRunner: async () => ({ output: "", errorOutput: "" }),
      catalogLoader: async () => ({ models: [] }),
      requestExecutor: async ({ context }) => {
        profileDir = context.env.GROK_HOME;
        const raw = JSON.parse(await readFile(join(profileDir, "auth.json"), "utf8"));
        assert.equal(raw["grok-account"].key, "access-token");
        return (async function* () {
          yield { type: "text-delta", index: 0, text: "ok" };
          yield { type: "finish", reason: { kind: "stop" } };
        })();
      },
    });
    const [account] = await driver.importSource({
      content: JSON.stringify({
        "grok-account": {
          key: "access-token",
          refresh_token: "refresh-token",
          user_id: "grok-account",
        },
      }),
    }, { secretStore });
    const stream = await driver.stream({ messages: [{ role: "user", content: "Hi" }] }, { account }, { secretStore });
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(chunks[0].text, "ok");
    assert.ok(profileDir);
    await assert.rejects(readFile(join(profileDir, "auth.json")));
  } finally {
    await rm(home, { recursive: true, force: true });
    if (profileDir) await rm(profileDir, { recursive: true, force: true });
  }
});

test("Grok official CLI executor keeps streaming-json and live model selection", async () => {
  const calls = [];
  const executor = createGrokCliExecutor({
    cliPath: "grok",
    streamCommandRunner: async function* (command, args, options) {
      calls.push({ command, args, options });
      yield JSON.stringify({ type: "text_delta", text: "Grok response" });
      yield JSON.stringify({ type: "result", result: "Grok response" });
    },
  });
  const stream = await executor({
    request: { model: "grok-live", messages: [{ role: "user", content: "Hello" }], reasoningEffort: "high" },
  });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.equal(calls[0].command, "grok");
  assert.deepEqual(calls[0].args.slice(0, 4), ["--single", "user:\nHello", "--output-format", "streaming-json"]);
  assert.ok(calls[0].args.includes("--model") && calls[0].args.includes("grok-live"));
  assert.ok(calls[0].args.includes("--reasoning-effort") && calls[0].args.includes("high"));
  assert.deepEqual(chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => chunk.text), ["Grok response"]);
});
