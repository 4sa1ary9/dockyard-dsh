import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import { validateNativeEndpoint } from "../../providers/src/native-transport.mjs";
import { redactError } from "../../providers/src/provider-utils.mjs";

const DEFAULT_DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
const DEFAULT_OPENCODE_GO_USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const USAGE_REQUEST_TIMEOUT_MS = 12_000;

const builtinBaseUrls = new Map();
for (const provider of builtinProviders()) {
  if (typeof provider?.id === "string" && typeof provider?.baseUrl === "string") {
    builtinBaseUrls.set(provider.id, provider.baseUrl);
  }
}

function baseUrlFor(providerId, profile) {
  const configured = typeof profile?.baseURL === "string" ? profile.baseURL.trim() : "";
  const baseUrl = configured || builtinBaseUrls.get(providerId) || null;
  return baseUrl ? validateNativeEndpoint(baseUrl, { providerId }) : null;
}

function pathnameWithoutSlash(url) {
  return url.pathname.replace(/\/+$/, "");
}

function joinPath(basePath, suffix) {
  const prefix = basePath === "/" ? "" : basePath.replace(/\/+$/, "");
  return `${prefix}${suffix}`;
}

function officialUrl(profile, providerId, fallback, resolvePath) {
  const configured = typeof profile?.baseURL === "string" ? profile.baseURL.trim() : "";
  if (!configured) return fallback;
  const url = new URL(validateNativeEndpoint(configured, { providerId }));
  url.pathname = resolvePath(pathnameWithoutSlash(url) || "");
  url.search = "";
  url.hash = "";
  return url.toString();
}

function deepseekBalanceUrl(providerId, profile) {
  return officialUrl(profile, providerId, DEFAULT_DEEPSEEK_BALANCE_URL, (path) => {
    const root = path.endsWith("/v1") ? path.slice(0, -3) : path;
    return joinPath(root, "/user/balance");
  });
}

function openCodeGoUsageUrl(providerId, profile) {
  return officialUrl(profile, providerId, DEFAULT_OPENCODE_GO_USAGE_URL, (path) => {
    if (path.endsWith("/usage")) return path;
    if (path.endsWith("/v1")) return joinPath(path, "/usage");
    if (path.endsWith("/go")) return joinPath(path, "/v1/usage");
    if (path.endsWith("/zen")) return joinPath(path, "/go/v1/usage");
    return joinPath(path, "/v1/usage");
  });
}

function finiteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isoDate(value) {
  if (typeof value === "string" && value.trim() && !Number.isNaN(Date.parse(value))) return value;
  return null;
}

function resetAtFrom(raw, now = Date.now()) {
  const resetAt = isoDate(raw?.resetsAt ?? raw?.resetAt ?? raw?.reset_time);
  if (resetAt) return resetAt;
  const seconds = finiteNumber(raw?.resetInSec ?? raw?.resets_in_seconds ?? raw?.resetInSeconds);
  if (seconds === null) return null;
  return new Date(now + seconds * 1000).toISOString();
}

async function readJson(response) {
  const raw = await response.text();
  let body;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const detail = typeof body?.error === "string"
      ? body.error
      : body?.error?.message ?? body?.message ?? response.statusText;
    throw Object.assign(new Error(`${response.status} ${detail || "provider usage 请求失败"}`), { status: response.status });
  }
  if (!body || typeof body !== "object") throw new Error("provider usage 返回了无效 JSON");
  return body;
}

async function requestUsage(url, apiKey, signal) {
  // Keep the deadline active until the response body is read, not just headers.
  const timeout = AbortSignal.timeout(USAGE_REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    return await readJson(await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
      signal: requestSignal,
      redirect: "error",
    }));
  } catch (error) {
    if (timeout.aborted) throw new Error("余额/额度查询超时，请刷新重试。");
    // Never echo an upstream error's copy of the credential into the UI/cache.
    const message = error instanceof Error ? error.message : String(error);
    throw Object.assign(new Error(redactError(apiKey ? message.split(apiKey).join("[redacted]") : message)),
      Number.isInteger(error?.status) ? { status: error.status } : {});
  }
}

function updatedAt() {
  return new Date().toISOString();
}

function balanceAmount(value) {
  return finiteNumber(value) !== null ? value : null;
}

function deepseekBalanceWindows(balance, refreshedAt) {
  const currency = balance.currency ?? null;
  const suffix = currency ?? "unknown";
  const rows = [
    { id: `balance-${suffix}`, name: "账户余额", remaining: balanceAmount(balance.total_balance) },
    { id: `granted-${suffix}`, name: "赠送余额", remaining: balanceAmount(balance.granted_balance) },
    { id: `topped-up-${suffix}`, name: "充值余额", remaining: balanceAmount(balance.topped_up_balance) },
  ];
  return rows.filter((row) => row.remaining !== null).map((row) => ({
    ...row,
    limit: null,
    unit: currency,
    resetAt: null,
    updatedAt: refreshedAt,
  }));
}

function deepseekBalanceModule() {
  return {
    id: "deepseek-balance",
    supports: ["deepseek", "deepseek-official"],
    async fetch({ providerId, profile, apiKey, signal }) {
      const body = await requestUsage(deepseekBalanceUrl(providerId, profile), apiKey, signal);
      const refreshedAt = updatedAt();
      const balances = Array.isArray(body.balance_infos)
        ? body.balance_infos.filter((balance) => balance && finiteNumber(balance.total_balance) !== null) : [];
      if (!balances.length) throw new Error("DeepSeek 未返回有效余额，请刷新重试。");
      return {
        status: "ok",
        source: "DeepSeek /user/balance",
        updatedAt: refreshedAt,
        available: body.is_available === true,
        quota: {
          windows: balances.flatMap((balance) => deepseekBalanceWindows(balance, refreshedAt)),
        },
        details: balances.map((balance) => ({
          currency: balance.currency ?? null,
          totalBalance: balance.total_balance ?? null,
          grantedBalance: balance.granted_balance ?? null,
          toppedUpBalance: balance.topped_up_balance ?? null,
        })),
      };
    },
  };
}

function openCodeUsageRoot(body) {
  if (!body || typeof body !== "object") return null;
  if (body.usage && typeof body.usage === "object") return body.usage;
  if (body.windows && typeof body.windows === "object") return body.windows;
  return body;
}

function openCodeWindow(id, name, raw, refreshedAt) {
  if (!raw || typeof raw !== "object") return null;
  const usedUsd = finiteNumber(raw.usageDollars ?? raw.used);
  const limitUsd = finiteNumber(raw.limitDollars ?? raw.limit);
  const usedPercent = finiteNumber(raw.percent ?? raw.usagePercent ?? raw.usage_percent);
  const remainingPercent = finiteNumber(raw.remaining ?? raw.remainingPercent);
  const resetAt = resetAtFrom(raw);
  if (usedUsd !== null && limitUsd !== null) {
    return {
      id,
      name,
      remaining: Math.max(0, limitUsd - usedUsd),
      limit: limitUsd,
      unit: "USD",
      resetAt,
      updatedAt: refreshedAt,
    };
  }
  const remaining = remainingPercent ?? (usedPercent !== null ? Math.max(0, 100 - usedPercent) : null);
  if (remaining === null && !resetAt && raw.status == null) return null;
  return {
    id,
    name,
    remaining,
    limit: remaining === null ? null : 100,
    unit: null,
    resetAt,
    updatedAt: refreshedAt,
  };
}

function openCodeGoUsageModule() {
  return {
    id: "opencode-go-usage",
    supports: ["opencode-go"],
    async fetch({ providerId, profile, apiKey, signal }) {
      const body = await requestUsage(openCodeGoUsageUrl(providerId, profile), apiKey, signal);
      const refreshedAt = updatedAt();
      const usage = openCodeUsageRoot(body);
      const windows = [
        openCodeWindow("rolling", "5 小时额度", usage?.rolling ?? usage?.rolling5h ?? usage?.["5h"], refreshedAt),
        openCodeWindow("weekly", "本周额度", usage?.weekly, refreshedAt),
        openCodeWindow("monthly", "本月额度", usage?.monthly, refreshedAt),
      ].filter(Boolean);
      if (windows.length === 0) {
        return {
          status: "error",
          source: "OpenCode Go /zen/go/v1/usage",
          updatedAt: refreshedAt,
          message: "OpenCode Go 官方 usage 未返回可解析的额度窗口",
        };
      }
      return {
        status: "ok",
        source: "OpenCode Go /zen/go/v1/usage",
        updatedAt: refreshedAt,
        quota: { windows },
        details: usage,
      };
    },
  };
}

function openRouterCreditsModule() {
  return {
    id: "openrouter-credits",
    supports: ["openrouter"],
    async fetch({ providerId, profile, apiKey, signal }) {
      const url = officialUrl(profile, providerId, "https://openrouter.ai/api/v1/credits", (path) => {
        const root = path === "" || path === "/api" ? "/api/v1" : path;
        return path.endsWith("/credits") ? path : joinPath(root, "/credits");
      });
      const body = await requestUsage(url, apiKey, signal);
      const data = body.data ?? body;
      const total = finiteNumber(data.total_credits);
      const used = finiteNumber(data.total_usage);
      if (total === null || used === null) throw new Error("OpenRouter 未返回有效余额，请刷新重试。");
      const refreshedAt = updatedAt();
      return {
        status: "ok",
        source: "OpenRouter /api/v1/credits",
        updatedAt: refreshedAt,
        quota: {
          windows: [{
            id: "credits",
            name: "剩余 credits",
            remaining: total !== null && used !== null ? total - used : null,
            limit: total,
            unit: "USD",
            resetAt: null,
            updatedAt: refreshedAt,
          }],
        },
        details: { totalCredits: total, totalUsage: used },
      };
    },
  };
}

// Official balance APIs; never infer a billing API from an OpenAI-compatible
// model name. In particular, Kimi Coding is not a Moonshot balance account.
function moonshotBalanceModule() {
  return {
    id: "moonshot-balance",
    supports: ["moonshotai", "moonshotai-cn"],
    async fetch({ providerId, profile, apiKey, signal }) {
      const base = baseUrlFor(providerId, profile);
      const origin = base ? new URL(base).origin : null;
      if (!["https://api.moonshot.cn", "https://api.moonshot.ai"].includes(origin)) {
        throw new Error("Moonshot 余额查询需要匹配 Key 所属地区的官方端点。");
      }
      const body = await requestUsage(`${origin}/v1/users/me/balance`, apiKey, signal);
      const data = body.data;
      if (body.status === false || (body.code !== undefined && body.code !== 0) || finiteNumber(data?.available_balance) === null) {
        throw new Error("Moonshot 未返回有效余额，请检查 Key 与端点是否匹配。");
      }
      const refreshedAt = updatedAt();
      const unit = origin.endsWith(".cn") ? "CNY" : "USD";
      const windows = [
        ["balance", "账户余额", data.available_balance],
        ["voucher", "代金券余额", data.voucher_balance],
        ["cash", "现金余额", data.cash_balance],
      ].filter(([, , value]) => finiteNumber(value) !== null).map(([id, name, remaining]) => ({
        id, name, remaining, limit: null, unit, resetAt: null, updatedAt: refreshedAt,
      }));
      return { status: "ok", source: "Moonshot /v1/users/me/balance", updatedAt: refreshedAt,
        available: finiteNumber(data.available_balance) > 0, quota: { windows } };
    },
  };
}

function officialBalanceModule({ id, supports, origin, path, field, unit, scale = 1, basePaths }) {
  return {
    id, supports,
    async fetch({ providerId, profile, apiKey, signal }) {
      const base = baseUrlFor(providerId, profile) ?? origin;
      const url = new URL(base);
      if (url.origin !== origin || !basePaths.includes(pathnameWithoutSlash(url))) {
        throw new Error("余额查询需要供应商官方 API 端点。");
      }
      const body = await requestUsage(`${origin}${path}`, apiKey, signal);
      const amount = finiteNumber(body[field]);
      if (amount === null) throw new Error("供应商未返回有效余额，请刷新重试。");
      const refreshedAt = updatedAt();
      return {
        status: "ok", source: `${url.hostname} ${path}`, updatedAt: refreshedAt,
        quota: { windows: [{ id: "balance", name: "账户余额", remaining: amount * scale,
          limit: null, unit, resetAt: null, updatedAt: refreshedAt }] },
      };
    },
  };
}

function unsupportedModule(providerIds, message, helpUrl = null) {
  return {
    id: `unsupported-${providerIds.join("-")}`,
    supports: providerIds,
    async fetch({ providerId }) {
      return {
        status: "unsupported",
        source: "provider official API",
        providerId,
        message,
        ...(helpUrl ? { helpUrl } : {}),
        updatedAt: updatedAt(),
      };
    },
  };
}

const MODULES = [
  deepseekBalanceModule(),
  openCodeGoUsageModule(),
  openRouterCreditsModule(),
  moonshotBalanceModule(),
  officialBalanceModule({
    id: "stepfun-balance", supports: ["stepfun"], origin: "https://api.stepfun.com",
    path: "/v1/accounts", field: "balance", unit: "CNY", basePaths: ["", "/v1"],
  }),
  officialBalanceModule({
    id: "novita-balance", supports: ["novita"], origin: "https://api.novita.ai",
    path: "/openapi/v1/billing/balance/detail", field: "availableBalance", unit: "USD", scale: 0.0001,
    basePaths: ["", "/v3", "/v3/openai", "/openai"],
  }),
  unsupportedModule(
    ["opencode"],
    "OpenCode Zen 目前公开模型目录和控制台用量，没有公开给 API Key 调用的实时余额/额度接口。",
    "https://opencode.ai/zen",
  ),
];

const modulesByProvider = new Map();
for (const module of MODULES) {
  for (const providerId of module.supports) modulesByProvider.set(providerId, module);
}

const genericUnsupported = unsupportedModule([], "该 provider 当前没有可验证的官方余额/额度接口；不会用请求次数或固定百分比替代。", null);

export function usageModuleFor(providerId, profile = null) {
  const direct = modulesByProvider.get(providerId);
  if (direct) return direct;
  // Custom DSH route IDs are arbitrary. Recognize only exact official origins
  // and documented API roots, never substring matches or model names.
  let url;
  try { url = new URL(baseUrlFor(providerId, profile)); } catch { return genericUnsupported; }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return genericUnsupported;
  const path = pathnameWithoutSlash(url);
  const official = [
    ["https://api.deepseek.com", ["", "/v1"], "deepseek"],
    ["https://openrouter.ai", ["", "/api", "/api/v1"], "openrouter"],
    ["https://opencode.ai", ["/zen/go", "/zen/go/v1"], "opencode-go"],
    ["https://api.moonshot.cn", ["", "/v1"], "moonshotai-cn"],
    ["https://api.moonshot.ai", ["", "/v1"], "moonshotai"],
    ["https://api.stepfun.com", ["", "/v1"], "stepfun"],
    ["https://api.novita.ai", ["", "/v3", "/v3/openai", "/openai"], "novita"],
  ];
  const match = official.find(([origin, paths]) => url.origin === origin && paths.includes(path));
  return match ? modulesByProvider.get(match[2]) : genericUnsupported;
}

export function usageModuleIds() {
  return MODULES.map((module) => module.id);
}
