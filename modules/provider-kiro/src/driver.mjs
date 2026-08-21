import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

import { createCredentialRef } from "../../../packages/vault/src/index.mjs";
import { createCliStatusAuthorizer } from "../../../packages/oauth/src/cli-status-authorizer.mjs";
import {
  createAcpAgentExecutor,
  parseJsonOutput,
  runCliCommand,
  unsupportedContentError,
} from "../../../packages/providers/src/cli-agent-transport.mjs";
import {
  OFFICIAL_SESSION_AUTH_KIND,
  OFFICIAL_SESSION_SOURCE_KINDS,
  officialSessionResources,
} from "../../../packages/providers/src/session-source.mjs";

const PROVIDER_ID = "kiro";
const DEFAULT_CATALOG_TTL_MS = 60_000;
const CREDENTIAL_SLOT = Symbol("dockyard-kiro-session");

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
}

function finiteInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function accountTypeName(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("identitycenter") || normalized.includes("identity_center")) return "IAM Identity Center";
  if (normalized.includes("builder")) return "AWS Builder ID";
  return firstString(value);
}

export function resolveKiroCliPath({ env = process.env, platform = process.platform, home = homedir() } = {}) {
  if (env.DOCKYARD_KIRO_CLI) return env.DOCKYARD_KIRO_CLI;
  if (platform === "win32") {
    return join(env.LOCALAPPDATA || join(home, "AppData", "Local"), "Kiro-Cli", "kiro-cli.exe");
  }
  return "kiro-cli";
}

/** Normalize public Kiro identity fields; the CLI-owned credential never leaves its secure store. */
export function parseKiroWhoami(output = "") {
  const parsed = parseJsonOutput(output) ?? {};
  const account = parsed?.account && typeof parsed.account === "object" ? parsed.account : parsed;
  const email = firstString(
    account.email,
    account.userEmail,
    parsed.email,
    String(output).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0],
  );
  const accountType = firstString(account.accountType, account.account_type, parsed.accountType, parsed.account_type);
  const accountId = firstString(account.accountId, account.account_id, account.userId, account.user_id, email);
  const explicitlyLoggedOut = parsed?.account === null
    || parsed?.loggedIn === false
    || /not logged in|logged out|unauthenticated/i.test(String(output));
  const loggedIn = !explicitlyLoggedOut && Boolean(
    parsed?.loggedIn === true
      || parsed?.authenticated === true
      || email
      || accountType
      || accountId,
  );
  return {
    loggedIn,
    accountId: accountId ?? "kiro:active",
    email,
    displayName: firstString(account.name, account.displayName, parsed.name, parsed.displayName, email, accountId, "Kiro active session"),
    accountType,
    plan: accountTypeName(accountType),
    region: firstString(account.region, parsed.region),
    raw: parsed,
  };
}

function candidateFromStatus(status, { source = "official_kiro_cli" } = {}) {
  const credentialRef = createCredentialRef(PROVIDER_ID, status.accountId);
  const candidate = {
    candidateId: `kiro:${hash(status.accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID,
    source,
    accountId: status.accountId,
    displayName: status.displayName ?? status.email ?? status.accountId,
    email: status.email,
    subscription: { plan: status.plan, status: "active", expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: true,
    },
    credentialRef,
    resources: officialSessionResources({
      sourceKind: OFFICIAL_SESSION_SOURCE_KINDS.CLI,
      authSource: source,
      extra: {
        authMethod: status.accountType ?? null,
        region: status.region ?? null,
      },
    }),
    imported: false,
    status: "available",
    diagnostic: null,
  };
  Object.defineProperty(candidate, CREDENTIAL_SLOT, {
    value: {
      type: OFFICIAL_SESSION_AUTH_KIND,
      providerId: PROVIDER_ID,
      accountId: status.accountId,
      accountType: status.accountType,
      sourceKind: OFFICIAL_SESSION_SOURCE_KINDS.CLI,
    },
    enumerable: false,
  });
  return candidate;
}

export function summarizeKiroCandidate(candidate) {
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

export function parseKiroModelCatalog(output = "") {
  const parsed = parseJsonOutput(output) ?? {};
  const rawModels = Array.isArray(parsed) ? parsed : Array.isArray(parsed.models) ? parsed.models : [];
  const models = rawModels.map((raw) => {
    const id = firstString(raw?.model_id, raw?.modelId, raw?.id, raw?.model_name, raw?.name);
    if (!id) return null;
    const rate = Number(raw?.rate_multiplier ?? raw?.rateMultiplier);
    const rateUnit = firstString(raw?.rate_unit, raw?.rateUnit);
    const rateText = Number.isFinite(rate) && rateUnit ? `计费倍率 ${rate} ${rateUnit}` : null;
    const description = [firstString(raw?.description), rateText].filter(Boolean).join(" · ");
    const contextWindow = finiteInteger(raw?.context_window_tokens ?? raw?.contextWindowTokens ?? raw?.contextWindow);
    return {
      id,
      name: firstString(raw?.display_name, raw?.displayName, raw?.model_name, raw?.name, id),
      ...(description ? { description } : {}),
      ...(contextWindow ? { contextWindow } : {}),
    };
  }).filter(Boolean);
  return {
    models,
    defaultModel: firstString(parsed.default_model, parsed.defaultModel),
  };
}

export function createKiroCatalogLoader({
  env = process.env,
  cliPath = resolveKiroCliPath({ env }),
  commandRunner = runCliCommand,
  timeoutMs = 30_000,
  cacheTtlMs = Number(env.DOCKYARD_KIRO_CATALOG_TTL_MS) || DEFAULT_CATALOG_TTL_MS,
} = {}) {
  let cached = null;
  let cachedAt = 0;
  let pending = null;
  return async function loadCatalog({ force = false } = {}) {
    const now = Date.now();
    if (!force && cached && now - cachedAt < cacheTtlMs) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const result = await commandRunner(cliPath, ["chat", "--list-models", "--format", "json"], {
          env,
          timeoutMs,
          providerId: PROVIDER_ID,
        });
        const parsed = parseKiroModelCatalog(result.output);
        cached = {
          ...parsed,
          source: "official_kiro_cli",
          ...(parsed.models.length ? {} : { diagnostics: ["Kiro 官方 CLI 没有返回可用模型"] }),
        };
      } catch (error) {
        cached = {
          models: [],
          source: "official_kiro_cli",
          diagnostics: [`Kiro 官方模型目录读取失败：${error.message}`],
        };
      }
      cachedAt = Date.now();
      return cached;
    })().finally(() => {
      pending = null;
    });
    return pending;
  };
}

async function kiroPromptContent(value, attachments, result = []) {
  if (typeof value === "string") {
    if (value.length > 0) result.push({ type: "text", text: value });
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) await kiroPromptContent(item, attachments, result);
    return result;
  }
  if (!value || typeof value !== "object") return result;
  if (value.type === "text") return kiroPromptContent(value.text ?? value.content, attachments, result);
  if (value.type === "image") {
    if (typeof value.data === "string" && value.data.length > 0) {
      const mimeType = firstString(value.mimeType, value.mediaType);
      if (!mimeType) throw unsupportedContentError(PROVIDER_ID, "Kiro image input is missing its media type");
      result.push({ type: "image", data: value.data, mimeType });
      return result;
    }
    if (!value.attachment || typeof attachments?.readImage !== "function") {
      throw unsupportedContentError(PROVIDER_ID, "Kiro image input requires DSH's durable attachment service");
    }
    const stored = await attachments.readImage(value.attachment);
    const bytes = stored?.data;
    const mimeType = firstString(stored?.ref?.mediaType, value.attachment?.mediaType, value.mimeType);
    if (!bytes || !mimeType) throw unsupportedContentError(PROVIDER_ID, "Kiro could not read the durable image attachment");
    result.push({ type: "image", data: Buffer.from(bytes).toString("base64"), mimeType });
    return result;
  }
  if (value.type === "tool-call") {
    const args = typeof value.arguments === "string" ? value.arguments : JSON.stringify(value.arguments ?? {});
    result.push({ type: "text", text: `[tool call: ${value.name ?? "unknown"}] ${args}` });
    return result;
  }
  if (value.type === "tool-result") return kiroPromptContent(value.content, attachments, result);
  return kiroPromptContent(value.text ?? value.content, attachments, result);
}

/** Convert DSH conversation content to standard ACP prompt blocks, including durable images. */
export async function kiroRequestPromptBlocks(request = {}, attachments) {
  const blocks = [];
  if (typeof request.system === "string" && request.system.length > 0) {
    blocks.push({ type: "text", text: `system:\n${request.system}` });
  }
  for (const message of Array.isArray(request.messages) ? request.messages : []) {
    blocks.push({ type: "text", text: `${message?.role ?? "message"}:\n` });
    await kiroPromptContent(message?.content ?? message?.text, attachments, blocks);
  }
  return blocks.length > 0 ? blocks : [{ type: "text", text: "Continue the conversation." }];
}

function rejectKiroPermission({ method, params }) {
  if (method !== "session/request_permission") {
    const error = new Error(`Unsupported Kiro ACP client method: ${method}`);
    error.code = -32601;
    throw error;
  }
  const options = Array.isArray(params?.options) ? params.options : [];
  const rejected = options.find((option) => /reject|deny/i.test(String(
    option?.kind ?? option?.name ?? option?.optionId,
  )));
  return rejected
    ? { outcome: { outcome: "selected", optionId: rejected.optionId } }
    : { outcome: { outcome: "cancelled" } };
}

export function createKiroAcpExecutor({
  env = process.env,
  cliPath = resolveKiroCliPath({ env }),
  timeoutMs = 300_000,
  spawnImpl,
} = {}) {
  return createAcpAgentExecutor({
    providerId: PROVIDER_ID,
    cliPath,
    env,
    timeoutMs,
    clientCapabilities: {},
    clientInfo: { name: "dockyard-dsh", version: "0.1.0" },
    requestHandler: rejectKiroPermission,
    ...(spawnImpl ? { spawnImpl } : {}),
    buildArgs: ({ request }) => {
      const args = ["acp", "--trust-tools="];
      const agent = firstString(env.DOCKYARD_KIRO_AGENT);
      const engine = firstString(env.DOCKYARD_KIRO_AGENT_ENGINE);
      if (agent) args.push("--agent", agent);
      if (engine) args.push("--agent-engine", engine);
      if (typeof request.model === "string" && request.model.length > 0) args.push("--model", request.model);
      if (typeof request.reasoningEffort === "string" && request.reasoningEffort.length > 0) {
        args.push("--effort", request.reasoningEffort);
      }
      return args;
    },
    promptBuilder: ({ request, context }) => kiroRequestPromptBlocks(request, context.attachments),
  });
}

function activeSessionError(message, { mismatch = false } = {}) {
  const error = new Error(message);
  error.authExpired = true;
  if (mismatch) error.accountMismatch = true;
  return error;
}

export class KiroSubscriptionDriver {
  constructor({
    env = process.env,
    cliPath = resolveKiroCliPath({ env }),
    commandRunner = runCliCommand,
    requestExecutor = null,
    catalogLoader = null,
    oauthAuthorizer = null,
    timeoutMs = 30_000,
  } = {}) {
    this.env = env;
    this.cliPath = cliPath;
    this.commandRunner = commandRunner;
    this.requestExecutor = requestExecutor;
    this.timeoutMs = timeoutMs;
    this.catalogLoader = catalogLoader ?? createKiroCatalogLoader({
      env,
      cliPath,
      commandRunner,
      timeoutMs,
    });
    this.oauthAuthorizer = oauthAuthorizer ?? createCliStatusAuthorizer({
      providerId: PROVIDER_ID,
      cliPath,
      loginArgs: ["login"],
      environment: env,
      browserOpened: true,
      instructions: "已启动官方 Kiro CLI 登录。请在 Kiro 官方网页完成授权，完成后回到 Dockyard DSH。",
      importStatus: async (context) => {
        const status = await this.#activeStatus(context?.signal);
        return [await this.importAccount(candidateFromStatus(status), context)];
      },
    });
  }

  async #activeStatus(signal) {
    const result = await this.commandRunner(this.cliPath, ["whoami", "--format", "json"], {
      env: this.env,
      timeoutMs: this.timeoutMs,
      providerId: PROVIDER_ID,
      ...(signal ? { signal } : {}),
    });
    const status = parseKiroWhoami(result.output);
    if (!status.loggedIn) throw activeSessionError("Kiro CLI 当前未登录，请重新授权");
    return status;
  }

  async #assertActiveSession(account, signal) {
    const status = await this.#activeStatus(signal);
    if (account?.accountId && account.accountId !== "kiro:active" && account.accountId !== status.accountId) {
      throw activeSessionError(
        "Kiro CLI 只暴露当前活动账号；请选择当前账号或重新授权",
        { mismatch: true },
      );
    }
    return status;
  }

  async discover() {
    try {
      const status = await this.#activeStatus();
      return { candidates: [candidateFromStatus(status)], source: "official_kiro_cli", diagnostics: [] };
    } catch (error) {
      return {
        candidates: [],
        source: "official_kiro_cli",
        diagnostics: [`无法读取 Kiro 官方 CLI 会话：${error.message}`],
      };
    }
  }

  async importAccount(candidate, context = {}) {
    const session = candidate?.[CREDENTIAL_SLOT];
    if (!session) throw new Error("Kiro candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    await context.secretStore.write(candidate.credentialRef, session);
    return {
      providerId: PROVIDER_ID,
      accountId: candidate.accountId,
      credentialRef: candidate.credentialRef,
      displayName: candidate.displayName,
      email: candidate.email,
      auth: { kind: OFFICIAL_SESSION_AUTH_KIND, scopes: [] },
      subscription: { ...candidate.subscription },
      refresh: { ...candidate.refresh },
      resources: {
        ...candidate.resources,
        transport: "agent_client_protocol",
        quotaSource: "official_kiro_cli",
      },
    };
  }

  async getActiveSession(context = {}) {
    try {
      const status = await this.#activeStatus(context.signal);
      const account = await this.importAccount(candidateFromStatus(status), context);
      return {
        status: "completed",
        providerId: PROVIDER_ID,
        instructions: "已检测到 Kiro CLI 官方会话，当前账号已接入 Dockyard DSH。",
        accounts: [account],
        diagnostic: null,
      };
    } catch {
      return null;
    }
  }

  async startAuthorization(context = {}) { return this.oauthAuthorizer.begin(context); }
  async pollAuthorization(sessionId, context = {}) { return this.oauthAuthorizer.poll(sessionId, context); }
  async cancelAuthorization(sessionId, context = {}) { return this.oauthAuthorizer.cancel(sessionId, context); }

  async submitAuthorizationCode() {
    throw new Error("Kiro CLI 登录流程不接收手动授权码");
  }

  async refreshAccount(account, context = {}) {
    const status = await this.#assertActiveSession(account, context.signal);
    return {
      identity: { email: status.email, displayName: status.displayName },
      subscription: { plan: status.plan, status: "active", expiresAt: null },
      refresh: {
        accessTokenExpiresAt: null,
        nextRefreshAt: null,
        lastRefreshedAt: (context.now instanceof Date ? context.now : new Date()).toISOString(),
        refreshable: true,
      },
      resources: {
        authMethod: status.accountType ?? null,
        region: status.region ?? null,
      },
    };
  }

  async getQuota(account, context = {}) {
    await this.#assertActiveSession(account, context.signal);
    const now = context.now instanceof Date ? context.now : new Date();
    return {
      quota: {
        remaining: null,
        limit: null,
        unit: null,
        resetAt: null,
        windows: [],
        updatedAt: now.toISOString(),
        source: "official_kiro_cli",
      },
      resources: {
        quotaDiagnostic: "Kiro 官方 CLI 当前未提供结构化实时额度命令；Dockyard 不显示估算值",
      },
    };
  }

  async getCatalog(context = {}) { return this.catalogLoader({ force: Boolean(context.force) }); }

  async invoke(request, invocation, context = {}) {
    await this.#assertActiveSession(invocation?.account, context.signal);
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") throw new Error("Kiro ACP invocation transport is not mounted");
    return executor({ request, invocation, context });
  }

  async stream(request, invocation, context = {}) { return this.invoke(request, invocation, context); }
}

export function createKiroDriver(options = {}) { return new KiroSubscriptionDriver(options); }

export const kiroDriverConstants = Object.freeze({ providerId: PROVIDER_ID });
