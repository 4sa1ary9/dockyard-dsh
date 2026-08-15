import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { ACCOUNT_SELECTION_POLICY } from "../../packages/core/src/index.mjs";
import { redactError } from "../../packages/providers/src/provider-utils.mjs";
import { DockyardRuntime } from "../../packages/runtime/src/dockyard-runtime.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, "../../hosts/local-page/public");
const HOST = process.env.DOCKYARD_DSH_HOST || "127.0.0.1";
const PORT = Number(process.env.DOCKYARD_DSH_PORT || 8787);
const SESSION_COOKIE = "dockyard_session";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const IS_LOOPBACK_HOST = LOOPBACK_HOSTS.has(HOST.toLowerCase());
const REMOTE_ALLOWED = process.env.DOCKYARD_DSH_ALLOW_REMOTE === "1";
const REMOTE_TOKEN = process.env.DOCKYARD_DSH_REMOTE_TOKEN?.trim() || "";
if (!IS_LOOPBACK_HOST && (!REMOTE_ALLOWED || !REMOTE_TOKEN)) {
  throw new Error("Dockyard DSH local page refuses non-loopback binding; set DOCKYARD_DSH_ALLOW_REMOTE=1 and DOCKYARD_DSH_REMOTE_TOKEN for explicit remote API access");
}
const sessionToken = randomBytes(24).toString("base64url");
const runtime = new DockyardRuntime();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(value));
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie ?? "").split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return [part.trim(), ""];
    let value = part.slice(index + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      value = "";
    }
    return [part.slice(0, index).trim(), value];
  }).filter(([key]) => key));
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length === 0 || right.length === 0) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function bearerToken(request) {
  const value = request.headers.authorization;
  if (typeof value !== "string") return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && parsed.host === request.headers.host;
  } catch {
    return false;
  }
}

function authorized(request) {
  if (safeEqual(parseCookies(request)[SESSION_COOKIE], sessionToken)) return true;
  return !IS_LOOPBACK_HOST && safeEqual(bearerToken(request), REMOTE_TOKEN);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 128 * 1024) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function routeParts(pathname) {
  return pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
}

async function handleApi(request, response, url) {
  if (!sameOrigin(request)) {
    json(response, 403, { error: "Cross-origin API requests are not allowed" });
    return;
  }
  if (!authorized(request)) {
    json(response, 401, { error: "Local session is not authorized" });
    return;
  }
  const parts = routeParts(url.pathname);
  try {
    if (request.method === "GET" && url.pathname === "/api/state") {
      await runtime.init();
      json(response, 200, runtime.snapshot());
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/scan") {
      json(response, 200, await runtime.scan());
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/refresh-all") {
      json(response, 200, { results: await runtime.refreshAll() });
      return;
    }
    if (parts[0] !== "api" || parts[1] !== "providers" || !parts[2]) {
      json(response, 404, { error: "Unknown API route" });
      return;
    }
    const providerId = parts[2];
    if (request.method === "POST" && parts[3] === "candidates" && parts[5] === "import") {
      json(response, 200, await runtime.importCandidate(providerId, parts[4]));
      return;
    }
    if (request.method === "POST" && parts[3] === "oauth" && parts[4] === "start") {
      json(response, 200, await runtime.startAuthorization(providerId));
      return;
    }
    if (parts[3] === "oauth" && parts[4]) {
      const sessionId = parts[4];
      if (request.method === "GET" && parts.length === 5) {
        json(response, 200, await runtime.pollAuthorization(providerId, sessionId));
        return;
      }
      if (request.method === "POST" && parts[5] === "cancel") {
        json(response, 200, await runtime.cancelAuthorization(providerId, sessionId));
        return;
      }
    }
    if (request.method === "POST" && parts[3] === "refresh") {
      const body = await readBody(request);
      if (body.accountId) {
        json(response, 200, await runtime.refreshAccount(providerId, body.accountId, { force: Boolean(body.force) }));
      } else {
        json(response, 200, { results: await runtime.refreshAll(providerId) });
      }
      return;
    }
    if (request.method === "POST" && parts[3] === "policy") {
      const body = await readBody(request);
      if (!Object.values(ACCOUNT_SELECTION_POLICY).includes(body.policy)) {
        json(response, 400, { error: "Unknown account selection policy" });
        return;
      }
      json(response, 200, await runtime.setPolicy(providerId, body.policy, body.defaultAccountId));
      return;
    }
    if (request.method === "POST" && parts[3] === "default") {
      const body = await readBody(request);
      json(response, 200, await runtime.setDefaultAccount(providerId, body.accountId));
      return;
    }
    if (request.method === "GET" && parts[3] === "catalog") {
      json(response, 200, await runtime.getCatalog(providerId));
      return;
    }
    json(response, 404, { error: "Unknown provider API route" });
  } catch (error) {
    console.error(`[Dockyard DSH] ${redactError(error) ?? "request failed"}`);
    json(response, 500, { error: "请求失败，请查看本地服务日志" });
  }
}

async function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(`${PUBLIC_DIR}/`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error?.code === "ENOENT" ? 404 : 500);
    response.end(error?.code === "ENOENT" ? "Not found" : "Server error");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("content-security-policy", "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'");
  response.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url);
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405);
    response.end("Method not allowed");
    return;
  }
  if (url.pathname === "/" && IS_LOOPBACK_HOST) {
    response.setHeader("set-cookie", `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}; HttpOnly; SameSite=Strict; Path=/`);
  }
  await serveStatic(response, url.pathname);
});

server.listen(PORT, HOST, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : PORT;
  const url = `http://${HOST}:${actualPort}/`;
  console.log(`Dockyard DSH local page: ${url}`);
  if (process.env.DOCKYARD_DSH_OPEN !== "0") {
    spawn("/usr/bin/open", [url], { stdio: "ignore", detached: true }).unref();
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
