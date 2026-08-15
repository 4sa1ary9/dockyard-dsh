import { execFileSync } from "node:child_process";
import * as http2 from "node:http2";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

import {
  nativeProviderError,
  validateNativeEndpoint,
} from "../../../packages/providers/src/native-transport.mjs";
import {
  cursorNativeProtocolConstants,
  cursorTurnComplete,
  decodeConnectFrames,
  decodeCursorKvRequest,
  decodeCursorText,
  encodeAgentRunRequest,
  encodeHeartbeat,
  encodeKvResponse,
} from "./native-protocol.mjs";

const PROVIDER_ID = "cursor";
const DEFAULT_ENDPOINT = cursorNativeProtocolConstants.endpoint;
const CURSOR_SESSION_KEYS = [
  "cursorAuth/accessToken",
  "cursorAuth/refreshToken",
  "cursorAuth/cachedEmail",
  "cursorAuth/stripeMembershipType",
];

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}

function createAsyncQueue() {
  const values = [];
  const waiters = [];
  let closed = false;
  let failure = null;
  return {
    push(value) {
      if (closed || failure) return;
      const waiter = waiters.shift();
      if (waiter) waiter.resolve({ value, done: false });
      else values.push(value);
    },
    close() {
      if (closed || failure) return;
      closed = true;
      while (waiters.length) waiters.shift().resolve({ value: undefined, done: true });
    },
    fail(error) {
      if (closed || failure) return;
      failure = error;
      while (waiters.length) waiters.shift().reject(error);
    },
    async next() {
      if (values.length) return { value: values.shift(), done: false };
      if (failure) throw failure;
      if (closed) return { value: undefined, done: true };
      return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
    },
    [Symbol.asyncIterator]() { return this; },
  };
}

/**
 * Read Cursor's official desktop OAuth session without starting cursor-agent.
 * The token is returned only to the provider module/native transport and is
 * never included in a public DSH snapshot.
 */
export function readCursorDesktopSession({
  credential,
  env = process.env,
  home = homedir(),
} = {}) {
  const stored = firstString(credential?.access, credential?.token);
  if (stored) {
    return {
      token: stored,
      refreshToken: firstString(credential?.refresh, credential?.refreshToken),
      email: firstString(credential?.email),
      plan: firstString(credential?.plan),
      kind: "oauth",
      source: "dockyard_credential",
    };
  }
  const fromEnv = firstString(env.CURSOR_API_KEY, env.DOCKYARD_CURSOR_ACCESS_TOKEN);
  if (fromEnv) return { token: fromEnv, kind: "apiKey", source: "environment" };
  if (process.platform !== "darwin") return null;
  const dbPath = join(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
  try {
    const quotedKeys = CURSOR_SESSION_KEYS.map((key) => `'${key}'`).join(",");
    const output = execFileSync("sqlite3", ["-json", dbPath, `SELECT key, CAST(value AS TEXT) AS value FROM ItemTable WHERE key IN (${quotedKeys});`], {
      encoding: "utf8",
      timeout: 5_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const rows = JSON.parse(output || "[]");
    const valueFor = (key) => rows.find((row) => row.key === key)?.value;
    const access = valueFor("cursorAuth/accessToken");
    return access ? {
      token: access,
      refreshToken: firstString(valueFor("cursorAuth/refreshToken")),
      email: firstString(valueFor("cursorAuth/cachedEmail")),
      plan: firstString(valueFor("cursorAuth/stripeMembershipType")),
      kind: "oauth",
      source: "cursor_desktop_app",
    } : null;
  } catch {
    return null;
  }
}

/** Resolve Cursor's access token without starting cursor-agent. */
export function resolveCursorAccessToken(options = {}) {
  const session = readCursorDesktopSession(options);
  return session ? { token: session.token, kind: session.kind } : null;
}

function cursorHeaders(endpoint, token, requestId, env) {
  const clientVersion = env.DOCKYARD_CURSOR_CLIENT_VERSION
    ?? `cli-${new Date().toISOString().slice(0, 10).replace(/-/g, ".")}-agent-host`;
  const clientKey = randomBytes(32).toString("hex");
  return {
    ":method": "POST",
    ":path": `${endpoint.pathname}${endpoint.search}`,
    ":scheme": "https",
    ":authority": endpoint.host,
    authorization: `Bearer ${token}`,
    "content-type": "application/connect+proto",
    accept: "application/connect+proto",
    "connect-protocol-version": "1",
    "x-request-id": requestId,
    "x-cursor-client-version": clientVersion,
    "x-cursor-client-type": "cli",
    "x-cursor-client-key": clientKey,
    "x-cursor-streaming": "true",
  };
}

function cursorStatusError(status) {
  return nativeProviderError(PROVIDER_ID, `Cursor AgentService returned HTTP ${status}`, { status });
}

function streamCursor({ endpoint, token, request, context, http2Module = http2 }) {
  return (async function* cursorStream() {
    const requestId = firstString(request.requestId, context.requestId, randomUUID());
    const conversationId = firstString(request.sessionId, context.sessionId, requestId);
    const model = firstString(request.model);
    if (!model) throw nativeProviderError(PROVIDER_ID, "Cursor model is missing");
    const timeZone = (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
    })();
    const encoded = encodeAgentRunRequest({
      messages: request.messages,
      model,
      requestId,
      conversationId,
      // Cursor's AgentService uses its own native tool/exec protocol. Keep
      // this request on the text path until DSH's tool bridge answers those
      // bidirectional ExecServer messages; no CLI prompt is involved.
      tools: [],
      timeZone,
    });
    const url = new URL(endpoint);
    const session = http2Module.connect(url.origin);
    const queue = createAsyncQueue();
    let stream = null;
    let responseStatus = 0;
    let responseBuffer = new Uint8Array();
    let completed = false;
    let cleaned = false;
    let heartbeat;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearInterval(heartbeat);
      context.signal?.removeEventListener?.("abort", onAbort);
      if (stream && !stream.destroyed && !stream.closed) stream.close();
      if (!session.closed && !session.destroyed) session.close();
    };
    const onAbort = () => {
      const error = nativeProviderError(PROVIDER_ID, "Cursor request aborted");
      error.code = "ABORT_ERR";
      queue.fail(error);
      stream?.close(http2Module.constants?.NGHTTP2_CANCEL);
      session.close();
    };
    session.once("error", (error) => queue.fail(error));
    try {
      stream = session.request(cursorHeaders(url, token, requestId, context.env ?? process.env));
      stream.once("response", (headers) => {
        responseStatus = Number(headers[":status"] ?? 0);
        if (responseStatus >= 400) queue.fail(cursorStatusError(responseStatus));
      });
      stream.on("data", (chunk) => {
        const incoming = new Uint8Array(chunk);
        const merged = new Uint8Array(responseBuffer.byteLength + incoming.byteLength);
        merged.set(responseBuffer);
        merged.set(incoming, responseBuffer.byteLength);
        const decoded = decodeConnectFrames(merged);
        responseBuffer = decoded.rest;
        for (const frame of decoded.frames) {
          if ((frame.flags & 0x02) !== 0) {
            completed = true;
            queue.push({ type: "complete" });
            continue;
          }
          if ((frame.flags & 0x01) !== 0) {
            queue.fail(nativeProviderError(PROVIDER_ID, "Cursor returned a compressed protobuf frame"));
            continue;
          }
          const kv = decodeCursorKvRequest(frame.payload);
          if (kv) {
            try {
              stream?.write(Buffer.from(encodeKvResponse(kv, encoded.blobs)));
            } catch (error) {
              queue.fail(error);
            }
            continue;
          }
          const text = decodeCursorText(frame.payload);
          if (text) queue.push({ type: "text", text });
          if (cursorTurnComplete(frame.payload)) {
            completed = true;
            queue.push({ type: "complete" });
          }
        }
      });
      stream.once("end", () => queue.close());
      stream.once("error", (error) => queue.fail(error));
      stream.write(Buffer.from(encoded.frame));
      heartbeat = setInterval(() => {
        if (!stream || stream.destroyed || stream.closed) return;
        try { stream.write(Buffer.from(encodeHeartbeat())); } catch { /* stream is closing */ }
      }, 5_000);
      context.signal?.addEventListener?.("abort", onAbort, { once: true });

      let text = "";
      let failed = false;
      yield { type: "block-start", index: 0, blockType: "text" };
      try {
        for await (const item of queue) {
          if (item.type === "text") {
            text += item.text;
            yield { type: "text-delta", index: 0, text: item.text };
          } else if (item.type === "complete") {
            completed = true;
            break;
          }
        }
      } catch (error) {
        failed = true;
        if (error?.status === 401 || error?.status === 403) error.authExpired = error.status === 401;
        throw error;
      } finally {
        cleanup();
      }
      if (!failed) {
        yield { type: "block-end", index: 0, block: { type: "text", text } };
        yield { type: "finish", reason: { kind: completed ? "stop" : "stop" } };
      }
    } catch (error) {
      cleanup();
      throw error;
    }
  })();
}

export function createCursorNativeExecutor({
  endpoint = process.env.DOCKYARD_CURSOR_ENDPOINT || DEFAULT_ENDPOINT,
  env = process.env,
  home = homedir(),
  tokenResolver = resolveCursorAccessToken,
  http2Module = http2,
} = {}) {
  const safeEndpoint = validateNativeEndpoint(endpoint, { providerId: PROVIDER_ID });
  const executor = async ({ request = {}, invocation, context = {} } = {}) => {
    let credential = null;
    if (context.secretStore) {
      const ref = invocation?.auth?.credentialRef ?? invocation?.account?.auth?.credentialRef ?? invocation?.account?.credentialRef;
      if (ref) credential = await context.secretStore.read(ref);
    }
    const auth = await tokenResolver({ credential, env: { ...env, ...(context.env ?? {}) }, home });
    if (!auth?.token) {
      const error = nativeProviderError(PROVIDER_ID, "Cursor OAuth token is unavailable; authorize Cursor first");
      error.authExpired = true;
      throw error;
    }
    return streamCursor({ endpoint: safeEndpoint, token: auth.token, request, context, http2Module });
  };
  executor.nativeTransport = "cursor-connect-agent-service";
  return executor;
}

export const cursorNativeTransportConstants = Object.freeze({
  providerId: PROVIDER_ID,
  endpoint: DEFAULT_ENDPOINT,
});
