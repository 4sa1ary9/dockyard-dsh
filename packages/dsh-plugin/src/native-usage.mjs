import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import { validateNativeEndpoint } from "../../providers/src/native-transport.mjs";

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

function deepseekBalanceModule() {
  return {
    id: "deepseek-balance",
    supports: ["deepseek", "deepseek-official"],
    async fetch({ providerId, profile, apiKey, signal }) {
      const body = await readJson(await fetch(endpoint(baseUrlFor(providerId, profile), "user/balance"), {
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
          windows: balances.map((balance) => ({
            id: `balance-${balance.currency ?? "unknown"}`,
            name: "账户余额",
            remaining: typeof balance.total_balance === "string" || typeof balance.total_balance === "number"
              ? balance.total_balance
              : null,
            limit: null,
            unit: balance.currency ?? null,
            resetAt: null,
            updatedAt: refreshedAt,
          })),
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
  openRouterCreditsModule(),
  unsupportedModule(
    ["opencode", "opencode-go"],
    "OpenCode 官方目前公开模型目录和控制台用量，没有公开给 API Key 调用的实时余额/额度接口。",
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
