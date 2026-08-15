import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";

import { createCredentialRef } from "../../../packages/vault/src/index.mjs";
import { createCliStatusAuthorizer } from "../../../packages/oauth/src/cli-status-authorizer.mjs";
import {
  cliRequestPrompt,
  createCliAgentExecutor,
  parseJsonOutput,
  runCliCommand,
} from "../../../packages/providers/src/cli-agent-transport.mjs";
import {
  recursiveQuotaWindows,
  selectPrimaryQuotaWindow,
  stringValue,
} from "../../../packages/providers/src/provider-utils.mjs";
import { readCursorDesktopSession } from "./native-transport.mjs";

const PROVIDER_ID = "cursor";
const CREDENTIAL_SLOT = Symbol("dockyard-cursor-session");

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}

function statusObject(output) {
  return parseJsonOutput(output) ?? {};
}

function statusValue(value, ...keys) {
  for (const key of keys) {
    const parts = key.split(".");
    let current = value;
    for (const part of parts) current = current?.[part];
    if (typeof current === "string" && current.length > 0) return current;
    if (typeof current === "number" || typeof current === "boolean") return current;
    if (Array.isArray(current)) return current;
    if (current && typeof current === "object") return current;
  }
  return null;
}

function parseTextEmail(output) {
  return String(output).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

function commandAvailable(command) {
  try {
    execFileSync("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Parse only Cursor's public status output; credentials are never scraped. */
export function parseCursorAuthStatus(output) {
  const raw = statusObject(output);
  const email = firstString(
    statusValue(raw, "email", "user.email", "account.email", "accountEmail"),
    parseTextEmail(output),
  );
  const explicitLoggedIn = statusValue(raw, "loggedIn", "authenticated", "isAuthenticated");
  const text = String(output);
  const loggedIn = typeof explicitLoggedIn === "boolean"
    ? explicitLoggedIn
    : !/not authenticated|not logged in|unauthenticated|please login/i.test(text)
      && /authenticated|logged in|account|endpoint/i.test(text);
  const accountId = firstString(
    statusValue(raw, "accountId", "account_id", "userId", "user_id", "user.id", "account.id"),
    email,
    "cursor:active",
  );
  const plan = firstString(
    statusValue(raw, "plan", "planName", "subscription.plan", "subscription.name", "tier", "subscriptionTier"),
  );
  const displayName = firstString(statusValue(raw, "name", "user.name", "account.name"), email, accountId);
  const models = [
    statusValue(raw, "models"),
    statusValue(raw, "availableModels"),
    statusValue(raw, "modelCatalog"),
  ].find((value) => Array.isArray(value)) ?? [];
  return {
    loggedIn,
    accountId,
    email,
    plan,
    displayName,
    models,
    raw,
  };
}

function candidateFromStatus(status, { source = "official_cursor_cli", imported = false } = {}) {
  const credentialRef = createCredentialRef(PROVIDER_ID, status.accountId);
  const candidate = {
    candidateId: `cursor:${hash(status.accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID,
    source,
    accountId: status.accountId,
    displayName: status.displayName ?? status.accountId,
    email: status.email,
    subscription: { plan: status.plan, status: status.loggedIn ? "active" : null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: false,
    },
    credentialRef,
    imported,
    status: status.loggedIn ? "available" : "degraded",
    diagnostic: status.loggedIn ? null : "Cursor CLI 当前未返回已登录状态",
  };
  Object.defineProperty(candidate, CREDENTIAL_SLOT, {
    value: {
      type: "official_cli_session",
      providerId: PROVIDER_ID,
      accountId: status.accountId,
    },
    enumerable: false,
  });
  return candidate;
}

function desktopSessionAccountId(session) {
  return session.email ? `cursor:${hash(session.email.toLowerCase()).slice(0, 20)}` : "cursor:desktop";
}

function statusFromDesktopSession(session) {
  return {
    source: "cursor_desktop_app",
    loggedIn: true,
    accountId: session.accountId,
    email: session.email,
    plan: session.plan,
    displayName: session.email ?? "Cursor desktop session",
    models: [],
    raw: {
      source: "cursor_desktop_app",
      loggedIn: true,
      email: session.email,
      plan: session.plan,
    },
  };
}

function candidateFromDesktopSession(session) {
  const accountId = session.accountId ?? desktopSessionAccountId(session);
  const candidate = {
    candidateId: `cursor:desktop:${hash(accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID,
    source: "cursor_desktop_app",
    accountId,
    displayName: session.email ?? "Cursor desktop session",
    email: session.email,
    subscription: { plan: session.plan, status: "active", expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: Boolean(session.refreshToken),
    },
    credentialRef: createCredentialRef(PROVIDER_ID, accountId),
    imported: false,
    status: "available",
    diagnostic: null,
    resources: {
      transport: "cursor_connect_agent_service",
      identitySource: "cursor_desktop_app",
      sessionPersistence: "captured",
      quotaSource: "cursor_desktop_app",
    },
  };
  Object.defineProperty(candidate, CREDENTIAL_SLOT, {
    value: {
      type: "oauth",
      providerId: PROVIDER_ID,
      accountId,
      access: session.token,
      ...(session.refreshToken ? { refresh: session.refreshToken } : {}),
    },
    enumerable: false,
  });
  return candidate;
}

export function summarizeCursorCandidate(candidate) {
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

function normalizeModel(value) {
  if (typeof value === "string") return { id: value, name: value };
  if (!value || typeof value !== "object") return null;
  const id = firstString(value.id, value.model, value.modelId, value.name);
  if (!id) return null;
  return {
    id,
    name: firstString(value.name, value.label, id),
    ...(Number.isInteger(value.contextWindow ?? value.context_window)
      ? { contextWindow: value.contextWindow ?? value.context_window }
      : {}),
    ...(Number.isInteger(value.maxTokens ?? value.max_tokens ?? value.maxOutputTokens)
      ? { maxTokens: value.maxTokens ?? value.max_tokens ?? value.maxOutputTokens }
      : {}),
    ...(Array.isArray(value.input ?? value.inputModalities)
      ? { inputModalities: [...(value.input ?? value.inputModalities)] }
      : {}),
    ...(value.reasoning ? { reasoning: value.reasoning } : {}),
  };
}

export function createCursorCatalogLoader({
  cliPath = process.env.DOCKYARD_CURSOR_CLI || "cursor-agent",
  env = process.env,
  commandRunner = runCliCommand,
} = {}) {
  let cached = null;
  let pending = null;
  return async function loadCatalog({ force = false } = {}) {
    if (!force && cached) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const result = await commandRunner(cliPath, ["status"], {
          env,
          providerId: PROVIDER_ID,
          timeoutMs: 30_000,
        });
        const status = parseCursorAuthStatus(result.output);
        const models = status.models.map(normalizeModel).filter(Boolean);
        cached = {
          models,
          source: "official_cursor_cli_status",
          ...(models.length ? {} : { diagnostics: ["Cursor 官方 CLI status 没有返回模型目录；不在 Dockyard 中硬编码模型版本"] }),
        };
      } catch (error) {
        const desktop = readCursorDesktopSession({ env });
        cached = {
          models: [],
          source: error?.code === "ENOENT"
            ? (desktop ? "cursor_desktop_app" : "cursor_cli_not_found")
            : "official_cursor_cli_status",
          diagnostics: [desktop
            ? "已检测到 Cursor 桌面端 OAuth；官方模型目录仍需 cursor-agent status 返回，未硬编码模型"
            : `无法读取 Cursor 官方模型目录：${error.message}`],
        };
      }
      return cached;
    })().finally(() => { pending = null; });
    return pending;
  };
}

export function createCursorCliExecutor({
  cliPath = process.env.DOCKYARD_CURSOR_CLI || "cursor-agent",
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
      const args = ["-p", prompt, "--output-format", "stream-json"];
      if (typeof request.model === "string" && request.model.length > 0) args.push("--model", request.model);
      return args;
    },
  });
}

export class CursorSubscriptionDriver {
  constructor({
    cliPath = process.env.DOCKYARD_CURSOR_CLI || "cursor-agent",
    env = process.env,
    home = homedir(),
    commandRunner = runCliCommand,
    requestExecutor = null,
    catalogLoader = null,
  } = {}) {
    this.cliPath = cliPath;
    this.env = env;
    this.home = home;
    this.commandRunner = commandRunner;
    this.requestExecutor = requestExecutor;
    this.catalogLoader = catalogLoader ?? createCursorCatalogLoader({ cliPath, env, commandRunner });
    this.oauthAuthorizer = createCliStatusAuthorizer({
      providerId: PROVIDER_ID,
      cliPath,
      loginArgs: ["login"],
      environment: env,
      browserOpened: true,
      instructions: "已启动官方 Cursor OAuth 登录。请在 Cursor 官方网页完成登录，完成后回到 Dockyard DSH。",
      importStatus: async (context) => {
        const status = await this.#readStatus();
        if (!status.loggedIn) return [];
        return [await this.importAccount(candidateFromStatus(status), context)];
      },
    });
  }

  #readDesktopSession() {
    const session = readCursorDesktopSession({ env: this.env, home: this.home });
    if (!session?.token || session.source !== "cursor_desktop_app") return null;
    return {
      ...session,
      accountId: desktopSessionAccountId(session),
    };
  }

  async #readStatus(signal) {
    try {
      const result = await this.commandRunner(this.cliPath, ["status"], {
        env: this.env,
        providerId: PROVIDER_ID,
        timeoutMs: 30_000,
        ...(signal ? { signal } : {}),
      });
      const status = parseCursorAuthStatus(result.output);
      if (status.loggedIn) return status;
      const desktop = this.#readDesktopSession();
      return desktop ? statusFromDesktopSession(desktop) : status;
    } catch (error) {
      const desktop = this.#readDesktopSession();
      if (desktop) return statusFromDesktopSession(desktop);
      throw error;
    }
  }

  async discover() {
    try {
      const status = await this.#readStatus();
      const source = status.source ?? "official_cursor_cli";
      if (!status.loggedIn) return { candidates: [], source, diagnostics: ["Cursor 官方环境当前未登录"] };
      const desktop = source === "cursor_desktop_app" ? this.#readDesktopSession() : null;
      const candidate = desktop
        ? candidateFromDesktopSession(desktop)
        : candidateFromStatus(status, { source });
      return { candidates: candidate ? [candidate] : [], source, diagnostics: [] };
    } catch (error) {
      return { candidates: [], source: "official_cursor_cli", diagnostics: [`无法读取 Cursor 官方登录态：${error.message}`] };
    }
  }

  async importAccount(candidate, context = {}) {
    const session = candidate?.[CREDENTIAL_SLOT];
    if (!session) throw new Error("Cursor candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    await context.secretStore.write(candidate.credentialRef, session);
    return {
      providerId: PROVIDER_ID,
      accountId: candidate.accountId,
      credentialRef: candidate.credentialRef,
      displayName: candidate.displayName,
      email: candidate.email,
      auth: {
        kind: candidate.source === "cursor_desktop_app" ? "oauth" : "official_cli_session",
        scopes: [],
      },
      subscription: { ...candidate.subscription },
      refresh: { ...candidate.refresh },
      resources: {
        transport: "cursor_agentservice_connect_proto",
        accountScope: candidate.source === "cursor_desktop_app" ? "desktop_oauth_session" : "active_cli_session",
        quotaSource: candidate.resources?.quotaSource ?? "official_cursor_cli_status",
        ...(candidate.resources ?? {}),
      },
    };
  }

  async startAuthorization(context = {}) {
    if (!commandAvailable(this.cliPath)) {
      const desktop = this.#readDesktopSession();
      if (desktop) {
        const account = await this.importAccount(candidateFromDesktopSession(desktop), context);
        return {
          sessionId: `cursor:desktop:${randomUUID()}`,
          providerId: PROVIDER_ID,
          status: "completed",
          instructions: "已检测到 Cursor 桌面端官方 OAuth 登录态，当前账号已接入 Dockyard DSH。",
          accounts: [account],
          diagnostic: null,
        };
      }
      return {
        sessionId: `cursor:missing:${randomUUID()}`,
        providerId: PROVIDER_ID,
        status: "failed",
        instructions: "未找到官方 Cursor Agent CLI；请先在 Cursor 官方客户端完成登录，或安装 cursor-agent 后重试。",
        diagnostic: "本机没有 cursor-agent 可执行文件，也没有检测到 Cursor 桌面端 OAuth 会话；因此没有启动网页授权。",
      };
    }
    return this.oauthAuthorizer.begin(context);
  }
  async pollAuthorization(sessionId, context = {}) { return this.oauthAuthorizer.poll(sessionId, context); }
  async cancelAuthorization(sessionId, context = {}) { return this.oauthAuthorizer.cancel(sessionId, context); }

  async refreshAccount(account, context = {}) {
    const status = await this.#readStatus(context.signal);
    if (!status.loggedIn) {
      const error = new Error("Cursor OAuth session is not active; authorize again");
      error.authExpired = true;
      throw error;
    }
    if (account.accountId !== status.accountId && account.accountId !== "cursor:active") {
      const error = new Error("Cursor CLI only exposes its active local session; authorize the selected account again");
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
    const status = await this.#readStatus(context.signal);
    const now = context.now instanceof Date ? context.now : new Date();
    const windows = recursiveQuotaWindows(status.raw, { source: "cursor_cli_status", now, prefix: "cursor" });
    const primary = selectPrimaryQuotaWindow(windows);
    return {
      quota: {
        remaining: primary.remaining ?? null,
        limit: primary.limit ?? null,
        unit: primary.unit ?? null,
        resetAt: primary.resetAt ?? null,
        windows,
        updatedAt: now.toISOString(),
        source: "cursor_cli_status",
      },
      subscription: { plan: status.plan, status: status.loggedIn ? "active" : null, expiresAt: null },
      resources: {
        quotaDiagnostic: windows.length
          ? null
          : "Cursor 官方 CLI status 未返回实时订阅额度；详细 usage 仍以 Cursor 官方 Dashboard 为准",
      },
    };
  }

  async getCatalog(context = {}) { return this.catalogLoader({ force: Boolean(context.force) }); }

  async invoke(request, invocation, context = {}) {
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") throw new Error("Cursor native invocation transport is not mounted");
    return executor({ request, invocation, context });
  }

  async stream(request, invocation, context = {}) { return this.invoke(request, invocation, context); }
}

export function createCursorDriver(options = {}) { return new CursorSubscriptionDriver(options); }

export const cursorDriverConstants = Object.freeze({ providerId: PROVIDER_ID });
