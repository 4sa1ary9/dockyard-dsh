import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import {
  createAntigravityNativeExecutor,
  createAntigravityProjectResolver,
} from "../modules/provider-antigravity/src/index.mjs";
import { createClaudeNativeExecutor } from "../modules/provider-claude/src/index.mjs";
import { createGrokNativeExecutor } from "../modules/provider-grok/src/index.mjs";
import { createCursorNativeExecutor } from "../modules/provider-cursor/src/index.mjs";
import { bytesField, frameConnectMessage, stringField } from "../modules/provider-cursor/src/native-protocol.mjs";
import { validateNativeEndpoint } from "../packages/providers/src/native-transport.mjs";

function responseFor(events) {
  const payload = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
  return {
    ok: true,
    status: 200,
    body: (async function* stream() {
      yield new TextEncoder().encode(payload);
    })(),
  };
}

async function collect(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

test("native transports reject plaintext remote endpoints before attaching credentials", () => {
  assert.equal(validateNativeEndpoint("http://127.0.0.1:8787", { providerId: "test" }), "http://127.0.0.1:8787/");
  assert.throws(
    () => validateNativeEndpoint("http://provider.test/v1", { providerId: "test" }),
    /must use HTTPS/,
  );
  assert.throws(
    () => validateNativeEndpoint("https://user:pass@provider.test/v1", { providerId: "test" }),
    /embedded credentials/,
  );
  assert.throws(
    () => createGrokNativeExecutor({ endpoint: "http://provider.test/v1/chat/completions" }),
    /must use HTTPS/,
  );
});

test("Claude native transport posts Anthropic Messages and streams the first text delta", async () => {
  let call;
  const executor = createClaudeNativeExecutor({
    endpoint: "https://anthropic.test/v1/messages",
    tokenResolver: async () => ({ token: "oauth-token", kind: "oauth" }),
    fetchImpl: async (url, init) => {
      call = { url, init };
      return responseFor([
        { type: "message_start", message: { usage: { input_tokens: 2 } } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "hello" } },
        { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 3 } },
      ]);
    },
  });
  const chunks = await collect(await executor({
    request: { model: "claude-sonnet", system: "Be concise.", messages: [{ role: "user", content: "Hi" }] },
  }));
  const body = JSON.parse(call.init.body);
  assert.equal(call.url, "https://anthropic.test/v1/messages");
  assert.equal(call.init.headers.authorization, "Bearer oauth-token");
  assert.equal(body.stream, true);
  assert.deepEqual(body.messages, [{ role: "user", content: "Hi" }]);
  assert.deepEqual(chunks.filter((chunk) => chunk.type === "text-delta"), [{ type: "text-delta", index: 0, text: "hello" }]);
  assert.deepEqual(chunks.find((chunk) => chunk.type === "usage")?.usage, { inputTokens: 2, outputTokens: 3 });
});

test("Antigravity native transport uses streamGenerateContent SSE", async () => {
  let call;
  const executor = createAntigravityNativeExecutor({
    endpoint: "https://gemini.test/v1internal:streamGenerateContent?alt=sse",
    tokenResolver: () => ({ token: "google-token", kind: "oauth" }),
    fetchImpl: async (url, init) => {
      call = { url, init };
      return responseFor([{ candidates: [{ content: { parts: [{ text: "fast" }] } }] }]);
    },
  });
  const chunks = await collect(await executor({
    request: { model: "gemini-3.7-flash-medium", reasoningEffort: "medium", messages: [{ role: "user", content: "Hi" }] },
  }));
  const body = JSON.parse(call.init.body);
  assert.match(call.url, /streamGenerateContent\?alt=sse$/);
  assert.equal(call.init.headers.authorization, "Bearer google-token");
  assert.equal(call.init.headers.accept, undefined);
  assert.equal(body.project, "default-cli-project");
  assert.equal(body.model, "gemini-3.7-flash-medium");
  assert.deepEqual(body.request.contents[0], { role: "user", parts: [{ text: "Hi" }] });
  assert.deepEqual(body.request.generationConfig, { temperature: 0.7, maxOutputTokens: 4096 });
  assert.equal(body.request.generationConfig.thinkingConfig, undefined);
  assert.equal(chunks.find((chunk) => chunk.type === "text-delta")?.text, "fast");
});

test("Antigravity native transport resolves a Code Assist project per selected account", async () => {
  const calls = [];
  const projectResolver = createAntigravityProjectResolver({
    endpoint: "https://gemini.test/v1internal:loadCodeAssist",
    tokenResolver: () => ({ token: "google-token" }),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        async json() {
          return { cloudaicompanionProject: "account-project" };
        },
      };
    },
  });
  const executor = createAntigravityNativeExecutor({
    endpoint: "https://gemini.test/v1internal:streamGenerateContent?alt=sse",
    project: null,
    projectResolver,
    tokenResolver: () => ({ token: "google-token" }),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return responseFor([{ candidates: [{ content: { parts: [{ text: "account" }] } }] }]);
    },
  });
  await collect(await executor({
    invocation: {
      account: { accountId: "account-a", auth: { credentialRef: "keychain://account-a" } },
    },
    request: { model: "gemini-3.7-flash", messages: [{ role: "user", content: "Hi" }] },
  }));
  const projectCall = calls.find((call) => call.url.includes("loadCodeAssist"));
  const streamCall = calls.find((call) => call.url.includes("streamGenerateContent"));
  assert.deepEqual(JSON.parse(projectCall.init.body), {});
  assert.equal(projectCall.init.headers.authorization, "Bearer google-token");
  assert.equal(JSON.parse(streamCall.init.body).project, "account-project");
});

test("native HTTP errors keep the upstream rate-limit signal without leaking raw JSON", async () => {
  const executor = createAntigravityNativeExecutor({
    endpoint: "https://gemini.test/v1internal:streamGenerateContent?alt=sse",
    tokenResolver: () => ({ token: "google-token", kind: "oauth" }),
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({
        error: {
          code: 429,
          message: "Resource has been exhausted (e.g. check quota)",
          status: "RESOURCE_EXHAUSTED",
        },
      }),
    }),
  });

  await assert.rejects(
    () => executor({ request: { model: "gemini-3.7-flash-medium", messages: [{ role: "user", content: "Hi" }] } }),
    (error) => {
      assert.equal(error.status, 429);
      assert.equal(error.code, 429);
      assert.equal(error.upstreamCode, 429);
      assert.equal(error.upstreamStatus, "RESOURCE_EXHAUSTED");
      assert.equal(error.quotaExhausted, true);
      assert.equal(error.rateLimited, true);
      assert.match(error.message, /额度或上游资源已耗尽/);
      assert.equal(error.upstreamMessage, "Resource has been exhausted (e.g. check quota)");
      assert.doesNotMatch(error.message, /\"error\"/);
      return true;
    },
  );
});

test("Grok native transport uses xAI chat completions SSE and forwards OAuth directly", async () => {
  let call;
  const executor = createGrokNativeExecutor({
    endpoint: "https://xai.test/v1/chat/completions",
    fetchImpl: async (url, init) => {
      call = { url, init };
      return responseFor([{ choices: [{ delta: { content: "xAI" } }] }, { choices: [{ finish_reason: "stop", delta: {} }], usage: { prompt_tokens: 4, completion_tokens: 5 } }]);
    },
  });
  const chunks = await collect(await executor({
    credential: { access: "grok-oauth" },
    request: { model: "grok-4.5", messages: [{ role: "user", content: "Hi" }] },
  }));
  const body = JSON.parse(call.init.body);
  assert.equal(call.url, "https://xai.test/v1/chat/completions");
  assert.equal(call.init.headers.authorization, "Bearer grok-oauth");
  assert.equal(body.messages[0].content, "Hi");
  assert.equal(chunks.find((chunk) => chunk.type === "text-delta")?.text, "xAI");
  assert.deepEqual(chunks.find((chunk) => chunk.type === "usage")?.usage, { inputTokens: 4, outputTokens: 5 });
});

test("Grok token-validation errors mark the OAuth account unusable", async () => {
  const executor = createGrokNativeExecutor({
    endpoint: "https://xai.test/v1/chat/completions",
    fetchImpl: async () => responseFor([{
      error: {
        code: "unauthorized",
        message: "access token could not be validated",
      },
    }]),
  });
  await assert.rejects(
    collect(await executor({
      credential: { access: "stale-grok-oauth" },
      request: { model: "grok-4.6", messages: [{ role: "user", content: "Hi" }] },
    })),
    (error) => {
      assert.equal(error.authExpired, true);
      assert.equal(error.authForbidden, false);
      assert.match(error.message, /access token could not be validated/);
      return true;
    },
  );
});

test("Cursor native transport opens AgentService over HTTP/2 Connect frames", async () => {
  let written;
  const fakeHttp2 = {
    constants: { NGHTTP2_CANCEL: 8 },
    connect() {
      const session = new EventEmitter();
      session.closed = false;
      session.destroyed = false;
      session.close = () => { session.closed = true; };
      session.request = () => {
        const stream = new EventEmitter();
        stream.destroyed = false;
        stream.closed = false;
        stream.write = (value) => {
          written ??= Buffer.from(value);
          if (!written || written.length !== value.length) return;
          setImmediate(() => {
            stream.emit("response", { ":status": 200 });
            const interactionUpdate = bytesField(1, stringField(1, "cursor"));
            stream.emit("data", Buffer.from(frameConnectMessage(bytesField(1, interactionUpdate))));
            stream.emit("end");
          });
        };
        stream.close = () => { stream.closed = true; };
        return stream;
      };
      return session;
    },
  };
  const executor = createCursorNativeExecutor({
    tokenResolver: () => ({ token: "cursor-oauth", kind: "oauth" }),
    http2Module: fakeHttp2,
  });
  const chunks = await collect(await executor({
    request: { model: "grok-4.5", requestId: "request-1", messages: [{ role: "user", content: "Hi" }] },
  }));
  assert.ok(written);
  assert.equal(chunks.find((chunk) => chunk.type === "text-delta")?.text, "cursor");
  assert.equal(chunks.at(-1).type, "finish");
});
