import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import { validateNativeEndpoint } from "../../providers/src/native-transport.mjs";

const DEFAULT_DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
const DEFAULT_OPENCODE_GO_USAGE_URL = "https://opencode.ai/zen/go/v1/usage";

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

function endpoint(baseUrl, path) {
  if (!baseUrl) throw new Error("provider 没有返回可用的 base URL");
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), base).toString();
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
    throw new Error(`${response.status} ${detail || "provider usage 请求失败"}`);
  }
  if (!body || typeof body !== "object") throw new Error("provider usage 返回了无效 JSON");
  return body;
}

function bearerHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
}

function updatedAt() {
  return new Date().toISOString();
}

function balanceAmount(value) {
  return typeof value === "string" || typeof value === "number" ? value : null;
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
      const body = await readJson(await fetch(deepseekBalanceUrl(providerId, profile), {
        method: "GET",
        headers: bearerHeaders(apiKey),
        signal,
      }));
      const refreshedAt = updatedAt();
      const balances = Array.isArray(body.balance_infos) ? body.balance_infos : [];
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
      const body = await readJson(await fetch(openCodeGoUsageUrl(providerId, profile), {
        method: "GET",
        headers: bearerHeaders(apiKey),
        signal,
      }));
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
      const body = await readJson(await fetch(endpoint(baseUrlFor(providerId, profile), "credits"), {
        method: "GET",
        headers: bearerHeaders(apiKey),
        signal,
      }));
      const data = body.data ?? body;
      const total = typeof data.total_credits === "number" ? data.total_credits : null;
      const used = typeof data.total_usage === "number" ? data.total_usage : null;
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

export function usageModuleFor(providerId) {
  return modulesByProvider.get(providerId) ?? genericUnsupported;
}

export function usageModuleIds() {
  return MODULES.map((module) => module.id);
}
