import { createHash } from "node:crypto";

import { createCredentialRef } from "../../../packages/vault/src/index.mjs";
import { createCliStatusAuthorizer } from "../../../packages/oauth/src/cli-status-authorizer.mjs";
import {
  cliRequestPrompt,
  createCliAgentExecutor,
  parseJsonOutput,
  runCliCommand,
} from "../../../packages/providers/src/cli-agent-transport.mjs";
import {
  finiteNumber,
  recursiveQuotaWindows,
  selectPrimaryQuotaWindow,
  stringValue,
} from "../../../packages/providers/src/provider-utils.mjs";

const PROVIDER_ID = "claude";
const CREDENTIAL_SLOT = Symbol("dockyard-claude-session");

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}

function statusObject(raw, output = "") {
  if (raw && typeof raw === "object") return raw;
  return parseJsonOutput(output) ?? {};
}

function statusLoggedIn(value, output = "") {
  if (typeof value.loggedIn === "boolean") return value.loggedIn;
  if (typeof value.authenticated === "boolean") return value.authenticated;
  return !/not logged in|logged out|unauthenticated/i.test(String(output));
}

function isApiKeyStatus(value) {
  const method = String(value.authMethod ?? value.auth_method ?? "").toLowerCase();
  const source = String(value.apiKeySource ?? value.api_key_source ?? "").toLowerCase();
  return method.includes("api_key") || method.includes("apikey") || source.length > 0;
}

function isSubscriptionStatus(value) {
  if (isApiKeyStatus(value)) return false;
  const method = String(value.authMethod ?? value.auth_method ?? "").toLowerCase();
  const provider = String(value.apiProvider ?? value.api_provider ?? "").toLowerCase();
  return method.includes("oauth")
    || method.includes("claude")
    || method.includes("subscription")
    || provider.includes("claude")
    || provider.includes("firstparty");
}

function statusIdentity(value) {
  const profile = value.profile ?? value.user ?? value.account ?? {};
  const email = firstString(value.email, value.userEmail, profile.email, profile.userEmail);
  const accountId = firstString(
    value.accountId,
    value.account_id,
    value.userId,
    value.user_id,
    profile.accountId,
    profile.id,
    email,
  ) ?? "claude:active";
  const plan = firstString(
    value.plan,
    value.planName,
    value.plan_type,
    value.subscriptionType,
    value.subscription?.plan,
    value.subscription?.name,
  );
  const displayName = firstString(value.name, profile.name, email, accountId);
  return { accountId, email, plan, displayName };
}

/** Normalize only the public status fields; OAuth/API secrets never leave the CLI. */
export function parseClaudeAuthStatus(output) {
  const value = statusObject(null, output);
  const identity = statusIdentity(value);
  return {
    loggedIn: statusLoggedIn(value, output),
    authMethod: firstString(value.authMethod, value.auth_method),
    apiProvider: firstString(value.apiProvider, value.api_provider),
    apiKeySource: firstString(value.apiKeySource, value.api_key_source),
    isApiKey: isApiKeyStatus(value),
    isSubscription: isSubscriptionStatus(value),
    ...identity,
    raw: value,
  };
}

function candidateFromStatus(status, { source = "official_claude_cli", imported = false } = {}) {
  const credentialRef = createCredentialRef(PROVIDER_ID, status.accountId);
  const candidate = {
    candidateId: `claude:${hash(status.accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID,
    source,
    accountId: status.accountId,
    displayName: status.displayName ?? status.accountId,
    email: status.email,
    subscription: { plan: status.plan, status: status.isSubscription ? "active" : null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: false,
    },
    credentialRef,
    imported,
    status: status.isSubscription ? "available" : "degraded",
    diagnostic: status.isApiKey
      ? "当前 Claude CLI 使用 API key，不是 Claude Pro/Max 订阅 OAuth"
      : status.isSubscription ? null : "Claude CLI 没有返回可识别的 Claude 订阅 OAuth 状态",
  };
  Object.defineProperty(candidate, CREDENTIAL_SLOT, {
    value: {
      type: "official_cli_session",
      providerId: PROVIDER_ID,
      accountId: status.accountId,
      authMethod: status.authMethod,
    },
    enumerable: false,
  });
  return candidate;
}

export function summarizeClaudeCandidate(candidate) {
  return {
    providerId: PROVIDER_ID,
    candidateId: candidate.candidateId,
    source: candidate.source,
    accountId: candidate.accountId,
    displayName: candidate.displayName,
    email: candidate.email,
    subscription: { ...candidate.subscription },
    refresh: { ...candidate.refresh },
    imported: Boolean(candidate.imported),
    status: candidate.status ?? "available",
    diagnostic: candidate.diagnostic ?? null,
  };
}

function catalogModel(model) {
  const reasoning = model?.thinkingLevelMap && typeof model.thinkingLevelMap === "object"
    ? {
        efforts: Object.keys(model.thinkingLevelMap)
          .filter((id) => id !== "off")
          .map((id) => ({ id, name: id.replace(/[-_]+/g, " ").replace(/\b\w/g, (value) => value.toUpperCase()) })),
      }
    : model?.reasoning && typeof model.reasoning === "object"
      ? model.reasoning
      : undefined;
  return {
    id: model.id,
    name: model.name ?? model.id,
    ...(Array.isArray(model.input) ? { inputModalities: [...model.input] } : {}),
    ...(Number.isInteger(model.contextWindow) ? { contextWindow: model.contextWindow } : {}),
    ...(Number.isInteger(model.maxTokens) ? { maxTokens: model.maxTokens } : {}),
    ...(reasoning ? { reasoning } : {}),
  };
}

export function createClaudeCatalogLoader({ registryLoader = null } = {}) {
  let cached = null;
  return async function loadCatalog({ force = false } = {}) {
    if (cached && !force) return cached;
    const registry = typeof registryLoader === "function" ? await registryLoader() : [];
    const modelsById = new Map();
    for (const rawModel of (Array.isArray(registry) ? registry : [])) {
      if (!rawModel || (rawModel.provider !== "anthropic" && rawModel.api !== "anthropic-messages")) continue;
      const model = catalogModel(rawModel);
      if (typeof model.id !== "string" || model.id.length === 0) continue;
      const previous = modelsById.get(model.id);
      if (!previous) {
        modelsById.set(model.id, model);
        continue;
      }
      // The installed registry can expose the same Claude model through more
      // than one provider alias. Keep one DSH row, while retaining any richer
      // metadata returned by the duplicate row.
      modelsById.set(model.id, {
        ...previous,
        ...(previous.name === model.id && model.name !== model.id ? { name: model.name } : {}),
        ...(previous.inputModalities === undefined && model.inputModalities !== undefined
          ? { inputModalities: [...model.inputModalities] }
          : {}),
        ...(previous.contextWindow === undefined && model.contextWindow !== undefined
          ? { contextWindow: model.contextWindow }
          : {}),
        ...(previous.maxTokens === undefined && model.maxTokens !== undefined
          ? { maxTokens: model.maxTokens }
          : {}),
        ...(previous.reasoning === undefined && model.reasoning !== undefined
          ? { reasoning: model.reasoning }
          : {}),
      });
    }
    const models = [...modelsById.values()]
    cached = {
      models,
      source: "dsh_live_provider_registry",
      ...(models.length ? {} : { diagnostics: ["Claude CLI 没有公开模型目录，且当前 DSH registry 未返回 Anthropic 模型"] }),
    };
    return cached;
  };
}

export function createClaudeCliExecutor({
  cliPath = process.env.DOCKYARD_CLAUDE_CLI || "claude",
  env = process.env,
  timeoutMs = 300_000,
  streamCommandRunner,
} = {}) {
  return createCliAgentExecutor({
    providerId: PROVIDER_ID,
    cliPath,
    env,
    timeoutMs,
    ...(streamCommandRunner ? { streamCommandRunner } : {}),
    buildArgs: ({ request, prompt }) => {
      const args = ["-p", prompt, "--output-format", "stream-json", "--include-partial-messages", "--no-session-persistence", "--max-turns", "1", "--tools", ""];
      if (typeof request.model === "string" && request.model.length > 0) args.push("--model", request.model);
      if (typeof request.reasoningEffort === "string" && request.reasoningEffort.length > 0) args.push("--effort", request.reasoningEffort);
      return args;
    },
  });
}

export function claudeRequestPrompt(request) {
  return cliRequestPrompt(request);
}

export class ClaudeSubscriptionDriver {
  constructor({
    cliPath = process.env.DOCKYARD_CLAUDE_CLI || "claude",
    env = process.env,
    commandRunner = runCliCommand,
    requestExecutor = null,
    catalogLoader = null,
  } = {}) {
    this.cliPath = cliPath;
    this.env = env;
    this.commandRunner = commandRunner;
    this.requestExecutor = requestExecutor;
    this.catalogLoader = catalogLoader ?? createClaudeCatalogLoader();
    this.oauthAuthorizer = createCliStatusAuthorizer({
      providerId: PROVIDER_ID,
      cliPath,
      loginArgs: ["auth", "login", "--claudeai"],
      environment: env,
      browserOpened: true,
      instructions: "已启动官方 Claude 订阅 OAuth 登录。请在 Claude 官方网页完成登录，完成后回到 Dockyard DSH。",
      importStatus: async (context) => {
        const result = await this.#readStatus();
        const status = parseClaudeAuthStatus(result.output);
        if (!status.loggedIn || !status.isSubscription) return [];
        return [await this.importAccount(candidateFromStatus(status), context)];
      },
    });
  }

  async #readStatus(signal) {
    return this.commandRunner(this.cliPath, ["auth", "status", "--json"], {
      env: this.env,
      providerId: PROVIDER_ID,
      timeoutMs: 30_000,
      ...(signal ? { signal } : {}),
    });
  }

  async discover() {
    try {
      const result = await this.#readStatus();
      const status = parseClaudeAuthStatus(result.output);
      if (!status.loggedIn) {
        return { candidates: [], source: "official_claude_cli", diagnostics: ["Claude CLI 当前未登录"] };
      }
      if (status.isApiKey) {
        return { candidates: [], source: "official_claude_cli", diagnostics: ["Claude CLI 当前使用 API key；请使用 Claude 订阅 OAuth 登录"] };
      }
      if (!status.isSubscription) {
        return { candidates: [], source: "official_claude_cli", diagnostics: ["Claude CLI 当前登录态不是可识别的 Claude 订阅 OAuth"] };
      }
      return { candidates: [candidateFromStatus(status, { source: "official_claude_cli" })], source: "official_claude_cli", diagnostics: [] };
    } catch (error) {
      return { candidates: [], source: "official_claude_cli", diagnostics: [`无法读取 Claude 官方登录态：${error.message}`] };
    }
  }

  async importAccount(candidate, context = {}) {
    const session = candidate?.[CREDENTIAL_SLOT];
    if (!session) throw new Error("Claude candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    await context.secretStore.write(candidate.credentialRef, session);
    return {
      providerId: PROVIDER_ID,
      accountId: candidate.accountId,
      credentialRef: candidate.credentialRef,
      displayName: candidate.displayName,
      email: candidate.email,
      auth: { kind: "official_cli_session", scopes: [] },
      subscription: { ...candidate.subscription },
      refresh: { ...candidate.refresh },
      resources: {
        transport: "anthropic_messages_sse",
        accountScope: "active_cli_session",
        quotaSource: "official_cli_status",
      },
    };
  }

  async startAuthorization(context = {}) { return this.oauthAuthorizer.begin(context); }
  async pollAuthorization(sessionId, context = {}) { return this.oauthAuthorizer.poll(sessionId, context); }
  async cancelAuthorization(sessionId, context = {}) { return this.oauthAuthorizer.cancel(sessionId, context); }

  async refreshAccount(account, context = {}) {
    const result = await this.#readStatus(context.signal);
    const status = parseClaudeAuthStatus(result.output);
    if (!status.loggedIn || status.isApiKey || !status.isSubscription) {
      const error = new Error("Claude subscription OAuth is not the active CLI session; authorize again");
      error.authExpired = true;
      throw error;
    }
    if (account.accountId !== status.accountId && account.accountId !== "claude:active") {
      const error = new Error("Claude CLI only exposes its active keychain session; select the active account or authorize it again");
      error.authForbidden = true;
      throw error;
    }
    return {
      identity: { email: status.email, displayName: status.displayName },
      subscription: { plan: status.plan, status: "active", expiresAt: null },
      refresh: { lastRefreshedAt: (context.now instanceof Date ? context.now : new Date()).toISOString(), refreshable: false },
    };
  }

  async getQuota(account, context = {}) {
    const result = await this.#readStatus(context.signal);
    const status = parseClaudeAuthStatus(result.output);
    const now = context.now instanceof Date ? context.now : new Date();
    const windows = recursiveQuotaWindows(status.raw, { source: "claude_cli_status", now, prefix: "claude" });
    const primary = selectPrimaryQuotaWindow(windows);
    return {
      quota: {
        remaining: primary.remaining ?? null,
        limit: primary.limit ?? null,
        unit: primary.unit ?? null,
        resetAt: primary.resetAt ?? null,
        windows,
        updatedAt: now.toISOString(),
        source: "claude_cli_status",
      },
      subscription: { plan: status.plan, status: status.isSubscription ? "active" : null, expiresAt: null },
      resources: {
        quotaDiagnostic: windows.length
          ? null
          : "Claude 官方 CLI auth status 未返回实时订阅额度；Dockyard 不显示估算百分比",
      },
    };
  }

  async getCatalog(context = {}) { return this.catalogLoader({ force: Boolean(context.force) }); }

  async invoke(request, invocation, context = {}) {
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") throw new Error("Claude native invocation transport is not mounted");
    return executor({ request, invocation, context });
  }

  async stream(request, invocation, context = {}) { return this.invoke(request, invocation, context); }
}

export function createClaudeDriver(options = {}) { return new ClaudeSubscriptionDriver(options); }

export const claudeDriverConstants = Object.freeze({ providerId: PROVIDER_ID });
