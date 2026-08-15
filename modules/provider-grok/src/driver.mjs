import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createCredentialRef } from "../../../packages/vault/src/index.mjs";
import { createCliOAuthAuthorizer } from "../../../packages/oauth/src/cli-oauth-authorizer.mjs";
import {
  contentHasImage,
  createAcpAgentExecutor,
  createCliAgentExecutor,
  runCliCommand,
  unsupportedContentError,
} from "../../../packages/providers/src/cli-agent-transport.mjs";
import {
  decodeJwtPayload,
  finiteNumber,
  isoFromEpoch,
  readJsonFile,
  stringValue,
} from "../../../packages/providers/src/provider-utils.mjs";

const PROVIDER_ID = "grok";
const DEFAULT_GROK_HOME = join(homedir(), ".grok");
const DEFAULT_CATALOG_TTL_MS = 60_000;
const CREDENTIAL_SLOT = Symbol("dockyard-grok-credential");

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}

function grokHomePath({ env = process.env, home = homedir(), grokHome } = {}) {
  return grokHome ?? env.GROK_HOME ?? join(home, ".grok");
}

function grokCommandEnvironment(env, grokHome) {
  return { ...env, GROK_HOME: grokHome };
}

function authRecords(raw) {
  if (!raw || typeof raw !== "object") return [];
  if (typeof raw.key === "string" || typeof raw.access_token === "string" || typeof raw.accessToken === "string") {
    return [{ scopeKey: "default", value: raw }];
  }
  return Object.entries(raw)
    .filter(([, value]) => value && typeof value === "object")
    .map(([scopeKey, value]) => ({ scopeKey, value }));
}

/** Parse local Grok OAuth metadata while keeping token values private. */
export function parseGrokAuth(raw) {
  return authRecords(raw).map(({ scopeKey, value }) => {
    const access = firstString(value.key, value.access_token, value.accessToken);
    if (!access) return null;
    const accessPayload = decodeJwtPayload(access) ?? {};
    const expiresAt = firstString(
      value.expires_at,
      value.expiresAt,
      isoFromEpoch(accessPayload.exp),
    );
    const accountId = firstString(
      value.user_id,
      value.userId,
      value.principal_id,
      value.principalId,
      value.team_id,
      value.teamId,
    ) ?? `${scopeKey}:${hash(access).slice(0, 20)}`;
    const email = firstString(value.email, value.user_email, value.userEmail);
    return {
      access,
      refresh: firstString(value.refresh_token, value.refreshToken),
      accountId,
      email,
      displayName: firstString(value.first_name, value.firstName, value.name, email, accountId),
      plan: firstString(value.subscription_level, value.subscriptionLevel),
      expiresAt,
      createdAt: firstString(value.create_time, value.createdAt),
      scopes: Array.isArray(value.scopes)
        ? value.scopes.map(String)
        : typeof value.scope === "string" ? value.scope.split(/\s+/).filter(Boolean) : [],
      issuer: firstString(value.oidc_issuer, value.oidcIssuer, scopeKey.split("::")[0]),
      clientId: firstString(value.oidc_client_id, value.oidcClientId),
      authMode: firstString(value.auth_mode, value.authMode),
      scopeKey,
    };
  }).filter(Boolean);
}

function accountInput(tokens, credentialRef, now = new Date()) {
  return {
    providerId: PROVIDER_ID,
    accountId: tokens.accountId,
    credentialRef,
    displayName: tokens.displayName,
    email: tokens.email,
    auth: { kind: "oauth", scopes: tokens.scopes },
    subscription: { plan: tokens.plan, status: null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: tokens.expiresAt,
      nextRefreshAt: null,
      lastRefreshedAt: tokens.createdAt ?? now.toISOString(),
      refreshable: Boolean(tokens.refresh),
    },
    resources: {
      transport: "xai_chat_completions_sse",
      accountScope: "oauth_account",
      quotaSource: "official_grok_cli",
    },
  };
}

function attachCredential(candidate, tokens) {
  Object.defineProperty(candidate, CREDENTIAL_SLOT, {
    value: tokens,
    enumerable: false,
    configurable: false,
  });
  return candidate;
}

function candidateFromTokens(tokens, { source, now = new Date() } = {}) {
  const expired = tokens.expiresAt && new Date(tokens.expiresAt).getTime() <= now.getTime();
  return attachCredential({
    candidateId: `grok:${hash(tokens.accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID,
    source,
    accountId: tokens.accountId,
    displayName: tokens.displayName ?? tokens.email ?? tokens.accountId,
    email: tokens.email,
    subscription: { plan: tokens.plan, status: null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: tokens.expiresAt,
      nextRefreshAt: null,
      lastRefreshedAt: tokens.createdAt ?? now.toISOString(),
      refreshable: Boolean(tokens.refresh),
    },
    credentialRef: createCredentialRef(PROVIDER_ID, tokens.accountId),
    imported: false,
    status: expired ? "degraded" : "available",
    diagnostic: expired ? "Grok OAuth access token 已过期，导入后需要官方 OAuth 刷新" : null,
  }, tokens);
}

export function summarizeGrokCandidate(candidate) {
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

function cacheEntries(cache) {
  if (!cache?.models || typeof cache.models !== "object") return [];
  return Array.isArray(cache.models)
    ? cache.models.map((value) => [value?.id, value]).filter(([id]) => id)
    : Object.entries(cache.models);
}

function normalizeReasoning(info) {
  const raw = Array.isArray(info?.reasoning_efforts) ? info.reasoning_efforts : [];
  const efforts = raw.map((effort) => {
    const id = firstString(effort?.id, effort?.value);
    if (!id) return null;
    return {
      id,
      name: firstString(effort?.label, effort?.name, id),
      ...(typeof effort?.description === "string" ? { description: effort.description } : {}),
      ...(effort?.default === true ? { default: true } : {}),
    };
  }).filter(Boolean);
  if (!efforts.length) return undefined;
  const preferred = efforts.find((effort) => effort.default)?.id ?? firstString(info?.reasoning_effort);
  return {
    efforts: efforts.map(({ default: _default, ...effort }) => effort),
    ...(preferred && efforts.some((effort) => effort.id === preferred) ? { defaultEffort: preferred } : {}),
  };
}

export function parseGrokModelCatalog(output = "", cache = null) {
  const discovered = [...String(output).matchAll(/^\s*[*-]\s+(\S+)(?:\s+\(([^)]+)\))?/gm)]
    .map((match) => ({ id: match[1], name: match[2] ?? match[1] }));
  const cached = new Map(cacheEntries(cache).map(([id, value]) => [id, value?.info ?? value ?? {}]));
  const ids = [...new Set([...discovered.map((model) => model.id), ...cached.keys()])];
  return ids.map((id) => {
    const fromOutput = discovered.find((model) => model.id === id);
    const info = cached.get(id) ?? {};
    const outputName = fromOutput?.name === "default" ? null : fromOutput?.name;
    const model = { id, name: firstString(info.name, info.model, outputName, id) };
    const reasoning = normalizeReasoning(info);
    if (reasoning) model.reasoning = reasoning;
    const contextWindow = finiteNumber(info.context_window ?? info.contextWindow);
    const maxTokens = finiteNumber(info.max_completion_tokens ?? info.maxTokens);
    if (Number.isInteger(contextWindow)) model.contextWindow = contextWindow;
    if (Number.isInteger(maxTokens)) model.maxTokens = maxTokens;
    if (Array.isArray(info.input) && info.input.length > 0) model.inputModalities = [...info.input];
    return model;
  });
}

export function createGrokCatalogLoader({
  env = process.env,
  home = homedir(),
  grokHome,
  cliPath = env.DOCKYARD_GROK_CLI || "grok",
  commandRunner = null,
  timeoutMs = 30_000,
  readJson = readJsonFile,
  cacheTtlMs = Number(process.env.DOCKYARD_GROK_CATALOG_TTL_MS) || DEFAULT_CATALOG_TTL_MS,
} = {}) {
  const resolvedHome = grokHomePath({ env, home, grokHome });
  let cached = null;
  let cachedAt = 0;
  let pending = null;
  return async function loadCatalog({ force = false } = {}) {
    const now = Date.now();
    if (!force && cached && now - cachedAt < cacheTtlMs) return cached;
    if (pending) return pending;
    pending = (async () => {
      const cache = await readJson(join(resolvedHome, "models_cache.json"));
      let value;
      if (typeof commandRunner === "function") {
        try {
          const result = await commandRunner(cliPath, ["models"], {
            env,
            timeoutMs,
            providerId: PROVIDER_ID,
          });
          const models = parseGrokModelCatalog(result.output, cache);
          value = {
            models,
            source: "official_grok_cli",
            ...(models.length ? {} : { diagnostics: ["Grok 官方 CLI 没有返回可用模型"] }),
          };
        } catch (error) {
          value = {
            models: parseGrokModelCatalog("", cache),
            source: cache ? "official_grok_local_cache" : "official_grok_cli",
            diagnostics: [`Grok 官方模型目录读取失败：${error.message}`],
          };
        }
      } else {
        value = {
          models: parseGrokModelCatalog("", cache),
          source: "official_grok_local_cache",
          ...(cache ? {} : { diagnostics: [`未找到 Grok 实时模型缓存：${join(resolvedHome, "models_cache.json")}`] }),
        };
      }
      cached = value;
      cachedAt = Date.now();
      return value;
    })().finally(() => {
      pending = null;
    });
    return pending;
  };
}

async function grokPromptContent(value, attachments, result = []) {
  if (typeof value === "string") {
    if (value.length > 0) result.push({ type: "text", text: value });
    return result;
  }
  if (Array.isArray(value)) {
    for (const part of value) await grokPromptContent(part, attachments, result);
    return result;
  }
  if (!value || typeof value !== "object") return result;
  if (value.type === "text") {
    return grokPromptContent(value.text ?? value.content, attachments, result);
  }
  if (value.type === "image") {
    if (typeof value.data === "string" && value.data.length > 0) {
      const mimeType = firstString(value.mimeType, value.mediaType);
      if (!mimeType) throw unsupportedContentError(PROVIDER_ID, "Grok image input is missing its media type");
      result.push({ type: "image", data: value.data, mimeType });
      return result;
    }
    if (typeof value.uri === "string" && value.uri.length > 0) {
      result.push({ type: "image", uri: value.uri });
      return result;
    }
    if (!value.attachment || typeof attachments?.readImage !== "function") {
      throw unsupportedContentError(
        PROVIDER_ID,
        "Grok image input requires DSH's durable attachment service",
      );
    }
    const stored = await attachments.readImage(value.attachment);
    const bytes = stored?.data;
    const mimeType = firstString(stored?.ref?.mediaType, value.attachment?.mediaType, value.mimeType);
    if (!bytes || !mimeType) {
      throw unsupportedContentError(PROVIDER_ID, "Grok could not read the durable image attachment");
    }
    result.push({
      type: "image",
      data: Buffer.from(bytes).toString("base64"),
      mimeType,
    });
    return result;
  }
  if (value.type === "tool-call") {
    const name = value.name ?? "unknown";
    const args = typeof value.arguments === "string" ? value.arguments : JSON.stringify(value.arguments ?? {});
    result.push({ type: "text", text: `[tool call: ${name}] ${args}` });
    return result;
  }
  if (value.type === "tool-result") return grokPromptContent(value.content, attachments, result);
  if (typeof value.text === "string" || typeof value.content === "string" || Array.isArray(value.content)) {
    return grokPromptContent(value.text ?? value.content, attachments, result);
  }
  return result;
}

/** Convert DSH messages to native ACP content blocks without dropping images. */
export async function grokRequestPromptBlocks(request = {}, attachments) {
  const blocks = [];
  if (typeof request.system === "string" && request.system.length > 0) {
    blocks.push({ type: "text", text: `system:\n${request.system}` });
  }
  for (const message of Array.isArray(request.messages) ? request.messages : []) {
    blocks.push({ type: "text", text: `${message?.role ?? "message"}:\n` });
    await grokPromptContent(message?.content ?? message?.text, attachments, blocks);
  }
  return blocks.length > 0 ? blocks : [{ type: "text", text: "Continue the conversation." }];
}

export function createGrokCliExecutor({
  cliPath = process.env.DOCKYARD_GROK_CLI || "grok",
  env = process.env,
  timeoutMs = 300_000,
  streamCommandRunner,
  acpExecutor = null,
} = {}) {
  const textExecutor = createCliAgentExecutor({
    providerId: PROVIDER_ID,
    cliPath,
    env,
    timeoutMs,
    outputFormat: "streaming-json",
    ...(streamCommandRunner ? { streamCommandRunner } : {}),
    buildArgs: ({ request, prompt }) => {
      const args = ["--single", prompt, "--output-format", "streaming-json"];
      if (typeof request.model === "string" && request.model.length > 0) args.push("--model", request.model);
      if (typeof request.reasoningEffort === "string" && request.reasoningEffort.length > 0) args.push("--reasoning-effort", request.reasoningEffort);
      return args;
    },
  });
  const imageExecutor = acpExecutor ?? createAcpAgentExecutor({
    providerId: PROVIDER_ID,
    cliPath,
    env,
    timeoutMs,
    buildArgs: ({ request }) => {
      const args = [];
      if (typeof request.model === "string" && request.model.length > 0) args.push("--model", request.model);
      if (typeof request.reasoningEffort === "string" && request.reasoningEffort.length > 0) {
        args.push("--reasoning-effort", request.reasoningEffort);
      }
      args.push("agent", "stdio");
      return args;
    },
    promptBuilder: ({ request, context }) => grokRequestPromptBlocks(request, context.attachments),
  });
  return (envelope = {}) => contentHasImage(envelope.request)
    ? imageExecutor(envelope)
    : textExecutor(envelope);
}

export class GrokOAuthDriver {
  constructor({
    authFilePath,
    env = process.env,
    home = homedir(),
    grokHome,
    catalogLoader = null,
    oauthAuthorizer = null,
    cliPath = env.DOCKYARD_GROK_CLI || "grok",
    commandRunner = runCliCommand,
    requestExecutor = null,
    timeoutMs = 30_000,
  } = {}) {
    this.env = env;
    this.grokHome = grokHomePath({ env, home, grokHome });
    this.authFilePath = authFilePath ?? join(this.grokHome, "auth.json");
    this.cliPath = cliPath;
    this.commandRunner = commandRunner;
    this.requestExecutor = requestExecutor;
    this.timeoutMs = timeoutMs;
    this.catalogLoader = catalogLoader ?? createGrokCatalogLoader({
      env,
      home,
      grokHome: this.grokHome,
      cliPath,
      commandRunner,
      timeoutMs,
    });
    this.oauthAuthorizer = oauthAuthorizer ?? createCliOAuthAuthorizer({
      providerId: PROVIDER_ID,
      cliPath,
      loginArgs: ["login", "--oauth"],
      environmentKey: "GROK_HOME",
      environment: env,
      profileDirectory: this.grokHome,
      browserOpened: true,
      instructions: "已启动官方 Grok OAuth 登录。请在 auth.x.ai 官方网页完成登录，完成后回到 Dockyard DSH。",
      importCredentials: (raw, context) => this.#importOAuthState(raw, context),
    });
  }

  async discover(context = {}) {
    const now = context.now instanceof Date ? context.now : new Date();
    const raw = await readJsonFile(this.authFilePath);
    if (!raw) {
      return { candidates: [], source: this.authFilePath, diagnostics: [`未发现 Grok OAuth 文件：${this.authFilePath}`] };
    }
    const candidates = parseGrokAuth(raw).map((tokens) => candidateFromTokens(tokens, { source: "official_grok_oauth", now }));
    return {
      candidates,
      source: "official_grok_oauth",
      diagnostics: candidates.length ? [] : ["Grok OAuth 文件存在，但没有可识别的 access token"],
    };
  }

  async importAccount(candidate, context = {}) {
    const tokens = candidate?.[CREDENTIAL_SLOT];
    if (!tokens) throw new Error("Grok candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    const credentialRef = createCredentialRef(PROVIDER_ID, tokens.accountId);
    await context.secretStore.write(credentialRef, {
      type: "oauth",
      providerId: PROVIDER_ID,
      access: tokens.access,
      refresh: tokens.refresh,
      accountId: tokens.accountId,
      expiresAt: tokens.expiresAt,
      issuer: tokens.issuer,
      clientId: tokens.clientId,
      scopes: tokens.scopes,
      scopeKey: tokens.scopeKey,
    });
    return accountInput(tokens, credentialRef, context.now instanceof Date ? context.now : new Date());
  }

  async importSource(source, context = {}) {
    let raw;
    try {
      raw = typeof source?.content === "string" ? JSON.parse(source.content) : source?.content;
    } catch {
      throw new Error("Grok OAuth source is not valid JSON");
    }
    return this.#importOAuthState(raw, context, source?.fileName || "user_selected_oauth.json");
  }

  async #importOAuthState(raw, context = {}, source = "official_grok_oauth") {
    const tokens = parseGrokAuth(raw);
    if (!tokens.length) throw new Error("Grok OAuth state does not contain a supported account token");
    const accounts = [];
    for (const value of tokens) {
      accounts.push(await this.importAccount(candidateFromTokens(value, {
        source,
        now: context.now instanceof Date ? context.now : new Date(),
      }), context));
    }
    return accounts;
  }

  async startAuthorization(context = {}) {
    return this.oauthAuthorizer.begin(context);
  }

  async pollAuthorization(sessionId, context = {}) {
    return this.oauthAuthorizer.poll(sessionId, context);
  }

  async cancelAuthorization(sessionId, context = {}) {
    return this.oauthAuthorizer.cancel(sessionId, context);
  }

  async #readCredential(account, context = {}) {
    if (!context.secretStore) throw new Error("A secure credential store is required");
    const credentialRef = account.auth?.credentialRef ?? account.credentialRef;
    const credential = await context.secretStore.read(credentialRef);
    if (!credential?.access) {
      const error = new Error("Grok OAuth credential is missing from secure storage");
      error.authExpired = true;
      throw error;
    }
    return { ...credential, accountId: credential.accountId ?? account.accountId };
  }

  async #prepareCredentialEnvironment(account, context = {}) {
    const credential = await this.#readCredential(account, context);
    const profileDir = await mkdtemp(join(tmpdir(), "dockyard-grok-run-"));
    const authPath = join(profileDir, "auth.json");
    const key = account.accountId ?? credential.accountId;
    const raw = {
      [key]: {
        key: credential.access,
        ...(credential.refresh ? { refresh_token: credential.refresh } : {}),
        user_id: credential.accountId ?? account.accountId,
        ...(account.email ? { email: account.email } : {}),
        ...(account.subscription?.plan ? { subscription_level: account.subscription.plan } : {}),
        ...(credential.expiresAt ? { expires_at: credential.expiresAt } : {}),
      },
    };
    await writeFile(authPath, JSON.stringify(raw), { mode: 0o600 });
    return { profileDir, authPath, credential, env: grokCommandEnvironment(this.env, profileDir) };
  }

  async #finishCredentialEnvironment(prepared, account, context = {}) {
    try {
      const raw = JSON.parse(await readFile(prepared.authPath, "utf8"));
      const updated = parseGrokAuth(raw).find((value) => value.accountId === (account.accountId ?? prepared.credential.accountId))
        ?? parseGrokAuth(raw)[0];
      if (updated && context.secretStore) {
        const credentialRef = account.auth?.credentialRef ?? account.credentialRef;
        await context.secretStore.write(credentialRef, {
          ...prepared.credential,
          access: updated.access,
          ...(updated.refresh ? { refresh: updated.refresh } : {}),
          ...(updated.expiresAt ? { expiresAt: updated.expiresAt } : {}),
          accountId: updated.accountId,
          lastRefreshedAt: new Date().toISOString(),
        });
      }
      return updated;
    } catch {
      return null;
    } finally {
      await rm(prepared.profileDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async refreshAccount(account, context = {}) {
    const prepared = await this.#prepareCredentialEnvironment(account, context);
    let updated = null;
    try {
      await this.commandRunner(this.cliPath, ["models"], {
        env: prepared.env,
        timeoutMs: this.timeoutMs,
        providerId: PROVIDER_ID,
      });
    } catch (error) {
      error.authExpired = error.code === 401 || /auth|login|expired|credential|access token.{0,80}(?:valid|invalid|expired|revok)/i.test(String(error.message));
      throw error;
    } finally {
      updated = await this.#finishCredentialEnvironment(prepared, account, context);
    }
    const now = context.now instanceof Date ? context.now : new Date();
    return {
      refresh: {
        accessTokenExpiresAt: updated?.expiresAt ?? account.refresh?.accessTokenExpiresAt ?? null,
        nextRefreshAt: null,
        lastRefreshedAt: now.toISOString(),
        refreshable: Boolean(updated?.refresh ?? prepared.credential.refresh),
      },
    };
  }

  async getQuota(account, context = {}) {
    const now = context.now instanceof Date ? context.now : new Date();
    return {
      quota: {
        remaining: null,
        limit: null,
        unit: null,
        resetAt: null,
        windows: [],
        updatedAt: now.toISOString(),
        source: "official_grok_cli",
      },
      subscription: { ...account.subscription },
      resources: {
        quotaDiagnostic: "Grok 官方 CLI/公开文档没有提供可依赖的订阅额度 JSON；Dockyard 不显示估算百分比",
      },
    };
  }

  async getCatalog(context = {}) {
    return this.catalogLoader({ force: Boolean(context.force) });
  }

  async invoke(request, invocation, context = {}) {
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") throw new Error("Grok native invocation transport is not mounted");
    const account = invocation?.account;
    // Native xAI transport receives the selected account's OAuth token
    // directly. Only the legacy CLI path needs a temporary GROK_HOME profile;
    // creating that profile on every request would reintroduce the startup
    // latency this transport is meant to remove.
    if (executor.nativeTransport === "xai-chat-completions") {
      const credential = account && context.secretStore ? await this.#readCredential(account, context) : null;
      return executor({ request, invocation, credential, context });
    }
    if (!account || !context.secretStore) return executor({ request, invocation, context });
    const prepared = await this.#prepareCredentialEnvironment(account, context);
    let output;
    try {
      output = await executor({
        request,
        invocation,
        context: { ...context, env: prepared.env },
      });
    } catch (error) {
      await this.#finishCredentialEnvironment(prepared, account, context);
      throw error;
    }
    return (async function* streamWithCleanup() {
      const driver = this;
      try {
        for await (const chunk of output) yield chunk;
      } finally {
        await driver.#finishCredentialEnvironment(prepared, account, context);
      }
    }).call(this);
  }

  async stream(request, invocation, context = {}) { return this.invoke(request, invocation, context); }
}

export function createGrokDriver(options = {}) {
  return new GrokOAuthDriver(options);
}

export const grokDriverConstants = Object.freeze({ providerId: PROVIDER_ID });
