import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) throw new Error("usage: patch-dsh-local-auth.mjs <dsh-client-connection/lib/index.js>");
let source = await readFile(file, "utf8");
if (source.includes("const LOCAL_AUTH_COOKIE = \"DockyardDSHLocalAuth\"")) process.exit(0);

function replaceOnce(oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`cannot patch ${label}: expected one match, found ${count}`);
  source = source.replace(oldText, newText);
}

function replaceRegex(pattern, replacer, label) {
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) throw new Error(`cannot patch ${label}: expected one match, found ${matches?.length ?? 0}`);
  source = source.replace(pattern, replacer);
}

replaceOnce(
  'import { randomUUID } from "node:crypto";\n',
  'import { randomUUID, timingSafeEqual } from "node:crypto";\n',
  "crypto import",
);
replaceOnce(
`function isTrustedApiRequest(request, trustedHosts) {
\tconst host = header(request.headers, "host");
\tif (host === void 0) return false;
\tconst hostUrl = parseAuthority(host);
\tif (hostUrl === void 0) return false;
\tif (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
\tif (header(request.headers, "sec-fetch-site") === "cross-site") return false;
\tconst origin = header(request.headers, "origin");
\tif (origin === void 0) return true;
\ttry {
\t\treturn new URL(origin).host === hostUrl.host;
\t} catch {
\t\treturn false;
\t}
}
//#endregion
`,
`function isTrustedApiRequest(request, trustedHosts) {
\tconst host = header(request.headers, "host");
\tif (host === void 0) return false;
\tconst hostUrl = parseAuthority(host);
\tif (hostUrl === void 0) return false;
\tif (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
\tif (header(request.headers, "sec-fetch-site") === "cross-site") return false;
\tconst origin = header(request.headers, "origin");
\tif (origin === void 0) return true;
\ttry {
\t\treturn new URL(origin).host === hostUrl.host;
\t} catch {
\t\treturn false;
\t}
}
const LOCAL_AUTH_COOKIE = "DockyardDSHLocalAuth";
function localAuthValue(request) {
\tconst authorization = header(request.headers, "authorization");
\tif (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
\tconst cookie = header(request.headers, "cookie") ?? "";
\tfor (const part of cookie.split(";")) {
\t\tconst separator = part.indexOf("=");
\t\tif (separator < 0) continue;
\t\tif (part.slice(0, separator).trim() === LOCAL_AUTH_COOKIE) return part.slice(separator + 1).trim();
\t}
\treturn null;
}
function hasLocalAuth(request, expectedToken) {
\tif (!expectedToken) return true;
\tconst actual = localAuthValue(request);
\tif (!actual) return false;
\tconst expectedBytes = Buffer.from(expectedToken, "utf8");
\tconst actualBytes = Buffer.from(actual, "utf8");
\tif (expectedBytes.byteLength !== actualBytes.byteLength) return false;
\treturn timingSafeEqual(expectedBytes, actualBytes);
}
//#endregion
`,
  "trust helper",
);
replaceRegex(
/\tconst trustedHosts = config\?\.trustedHosts \?\? \[\];\n\tconst maxRequestBodyBytes = config\?\.maxRequestBodyBytes \?\? \d+;\n\tfor \(const entry of trustedHosts\) assertTrustedAuthority\(entry\);\n/,
(matched) => matched.replace(
  /\n\tfor \(const entry of trustedHosts\) assertTrustedAuthority\(entry\);\n/,
  "\n\tconst localAuthToken = process.env.DSH_LOCAL_AUTH_TOKEN?.trim() || null;\n\tfor (const entry of trustedHosts) assertTrustedAuthority(entry);\n",
),
  "runtime token",
);
replaceOnce(
`\t\tpath: API_PATH,
\t\thandler: async (req, res) => {
\t\t\tif (!isTrustedApiRequest(req, trustedHosts)) {
`,
`\t\tpath: API_PATH,
\t\thandler: async (req, res) => {
\t\t\tif (!hasLocalAuth(req, localAuthToken)) {
\t\t\t\tres.writeHead(401, { "cache-control": "no-store" });
\t\t\t\tres.end("unauthorized");
\t\t\t\treturn;
\t\t\t}
\t\t\tif (!isTrustedApiRequest(req, trustedHosts)) {
`,
  "HTTP auth gate",
);
replaceOnce(
`\t\t\t\tpath,
\t\t\t\thandler: (req, socket, head) => {
\t\t\t\t\tif (!isTrustedApiRequest(req, trustedHosts)) {
`,
`\t\t\t\tpath,
\t\t\t\thandler: (req, socket, head) => {
\t\t\t\t\tif (!hasLocalAuth(req, localAuthToken)) {
\t\t\t\t\t\trejectWebSocketUpgrade(socket, 401, "unauthorized");
\t\t\t\t\t\treturn;
\t\t\t\t\t}
\t\t\t\t\tif (!isTrustedApiRequest(req, trustedHosts)) {
`,
  "WebSocket auth gate",
);
replaceOnce(
`function rejectWebSocketUpgrade(socket) {
\tsocket.end([
\t\t"HTTP/1.1 403 Forbidden",
\t\t"Connection: close",
\t\t"Content-Type: text/plain; charset=utf-8",
\t\t"Content-Length: 9",
\t\t"",
\t\t"forbidden"
\t].join("\\r\\n"));
}
`,
`function rejectWebSocketUpgrade(socket, status = 403, message = "forbidden") {
\tconst reason = status === 401 ? "Unauthorized" : "Forbidden";
\tconst body = String(message);
\tsocket.end([
\t\t\`HTTP/1.1 \${status} \${reason}\`,
\t\t"Connection: close",
\t\t"Content-Type: text/plain; charset=utf-8",
\t\t\`Content-Length: \${Buffer.byteLength(body)}\`,
\t\t"Cache-Control: no-store",
\t\t"",
\t\tbody
\t].join("\\r\\n"));
}
`,
  "WebSocket rejection",
);
// Write atomically: an interrupted in-place write would truncate the patched
// dependency file and break every later DSH boot until it is reinstalled.
const tempPath = `${file}.${randomUUID()}.tmp`;
await writeFile(tempPath, source, "utf8");
await rename(tempPath, file);
