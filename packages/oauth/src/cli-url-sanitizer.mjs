const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

/**
 * Query parameters that only appear on OAuth *response* (callback) URLs or
 * otherwise carry credentials. A CLI printing such a URL is echoing a
 * redirect, not advertising an authorization entry point; surfacing it would
 * leak authorization codes / tokens into the UI and RPC results.
 */
const SENSITIVE_URL_QUERY_PARAMS = new Set([
  "code",
  "error",
  "error_description",
  "error_uri",
  "error_code",
  "access_token",
  "refresh_token",
  "id_token",
  "token",
  "identy_token",
  "session_token",
  "sessiontoken",
  "secret",
  "jwt",
  "authcode",
  "authorization_code",
]);

function stripAnsiAndControl(value) {
  return String(value ?? "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\u0000-\u001f\u007f].*$/, "");
}

function trimTrailingPunctuation(value) {
  return value.replace(/[),.;]+$/, "");
}

function isLoopbackHostname(hostname) {
  const value = String(hostname ?? "").trim().toLowerCase();
  const bare = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  return bare === "localhost" || bare === "127.0.0.1" || bare === "::1";
}

function carriesResponseParameters(url) {
  const scopes = [url.search];
  if (url.hash && url.hash.length > 1) scopes.push(url.hash.slice(1));
  for (const scope of scopes) {
    if (!scope) continue;
    for (const [key] of new URLSearchParams(scope)) {
      if (SENSITIVE_URL_QUERY_PARAMS.has(key.toLowerCase())) return true;
    }
  }
  return false;
}

/**
 * Extract the first safe authorization entry-point URL from CLI output.
 *
 * Returns null when the candidate URL cannot be parsed, uses plain http
 * against a non-loopback host, or carries OAuth response parameters (query or
 * fragment) — those are callback redirects and must never be shown to users
 * or forwarded over RPC. The returned URL never includes a fragment.
 */
export function extractSafeAuthorizationUrl(text) {
  const match = String(text ?? "").match(URL_PATTERN);
  if (!match?.[0]) return null;
  const raw = trimTrailingPunctuation(stripAnsiAndControl(match[0]));
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopbackHostname(url.hostname))) {
    return null;
  }
  // Response-style parameters present: this is a callback redirect.
  if (carriesResponseParameters(url)) return null;
  if (url.hash) url.hash = "";
  return url.toString();
}
