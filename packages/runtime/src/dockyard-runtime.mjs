import { ACCOUNT_SELECTION_POLICY, ModuleRuntime } from "../../core/src/index.mjs";
import { AccountPool } from "../../account-pool/src/index.mjs";
import { DshInjectionBridge } from "../../dsh-bridge/src/index.mjs";
import { createDefaultSecretStore } from "../../vault/src/index.mjs";
import { JsonStateStore } from "./state-store.mjs";
import { createCodexDriver, createCodexModule, summarizeCodexCandidate } from "../../../modules/provider-codex/src/index.mjs";
import {
  createAntigravityDriver,
  createAntigravityModule,
  summarizeAntigravityCandidate,
} from "../../../modules/provider-antigravity/src/index.mjs";
import { createGrokDriver, createGrokModule, summarizeGrokCandidate } from "../../../modules/provider-grok/src/index.mjs";
import { createClaudeDriver, createClaudeModule, summarizeClaudeCandidate } from "../../../modules/provider-claude/src/index.mjs";
import { createCursorDriver, createCursorModule, summarizeCursorCandidate } from "../../../modules/provider-cursor/src/index.mjs";
import { redactError } from "../../providers/src/provider-utils.mjs";

const candidateSummarizers = new Map([
  ["openai-codex", summarizeCodexCandidate],
  ["antigravity", summarizeAntigravityCandidate],
  ["grok", summarizeGrokCandidate],
  ["claude", summarizeClaudeCandidate],
  ["cursor", summarizeCursorCandidate],
]);

const DEFAULT_REFRESH_TIMEOUT_MS = 15_000;

function numericOption(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function refreshTimeoutError(providerId, accountId, timeoutMs) {
  const error = new Error(`刷新 ${providerId}/${accountId} 超时（${Math.ceil(timeoutMs / 1000)} 秒）；已保留上次额度`);
  error.code = "ETIMEDOUT";
  error.refreshTimeout = true;
  error.timeoutMs = timeoutMs;
  return error;
}

function withRefreshTimeout(task, { providerId, accountId, timeoutMs }) {
  const controller = new AbortController();
  let timer = null;
  const operation = Promise.resolve().then(() => task(controller.signal));
  // The operation may still be unwinding after the timeout signal is sent.
  // Keep its rejection observed while the caller receives the bounded result.
  operation.catch(() => {});
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(refreshTimeoutError(providerId, accountId, timeoutMs));
    }, timeoutMs);
  });
  return Promise.race([operation, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function withRequestExecutor(providerId, driverOptions, requestExecutors = {}) {
  const executor = requestExecutors[providerId];
  return executor ? { ...(driverOptions ?? {}), requestExecutor: executor } : driverOptions;
}

export function createDefaultProviderEntries(options = {}) {
  const requestExecutors = options.requestExecutors ?? {};
  const catalogLoaders = options.catalogLoaders ?? {};
  return [
    {
      module: createCodexModule({
        driver: options.codexDriver ?? createCodexDriver({
          ...withRequestExecutor("openai-codex", options.codex, requestExecutors),
          ...(catalogLoaders["openai-codex"] ? { catalogLoader: catalogLoaders["openai-codex"] } : {}),
        }),
      }),
      driver: options.codexDriver,
    },
    {
      module: createAntigravityModule({
        driver: options.antigravityDriver ?? createAntigravityDriver({
          ...withRequestExecutor("antigravity", options.antigravity, requestExecutors),
          ...(catalogLoaders.antigravity ? { catalogLoader: catalogLoaders.antigravity } : {}),
        }),
      }),
      driver: options.antigravityDriver,
    },
    {
      module: createGrokModule({
        driver: options.grokDriver ?? createGrokDriver({
          ...withRequestExecutor("grok", options.grok, requestExecutors),
          ...(catalogLoaders.grok ? { catalogLoader: catalogLoaders.grok } : {}),
        }),
      }),
      driver: options.grokDriver,
    },
    {
      module: createClaudeModule({
        driver: options.claudeDriver ?? createClaudeDriver({
          ...withRequestExecutor("claude", options.claude, requestExecutors),
          ...(catalogLoaders.claude ? { catalogLoader: catalogLoaders.claude } : {}),
        }),
      }),
      driver: options.claudeDriver,
    },
    {
      module: createCursorModule({
        driver: options.cursorDriver ?? createCursorDriver({
          ...withRequestExecutor("cursor", options.cursor, requestExecutors),
          ...(catalogLoaders.cursor ? { catalogLoader: catalogLoaders.cursor } : {}),
        }),
      }),
      driver: options.cursorDriver,
    },
  ];
}

function providerContext(app, extra = {}) {
  return {
    secretStore: app.secretStore,
    now: new Date(),
    ...extra,
  };
}

function providerAccount(pool, accountId) {
  const account = pool.get(accountId);
  if (!account) throw new Error(`Account does not exist: ${accountId}`);
  const auth = pool.resolve(accountId);
  return {
    ...account,
    auth: {
      kind: auth.authKind,
      credentialRef: auth.credentialRef,
      scopes: [...auth.scopes],
    },
  };
}

function providerErrorStatus(error) {
  if (error?.authExpired) return "auth_expired";
  // A provider-side 403 is an operation/permission failure. Keep the account
  // usable and surface it as degraded instead of claiming its OAuth expired.
  if (error?.authForbidden) return "error";
  if (error?.quotaExhausted) return "quota_exhausted";
  if (error?.rateLimited) return "rate_limited";
  return "error";
}

export class DockyardRuntime {
  #entries = new Map();
  #candidates = new Map();
  #refreshPromises = new Map();
  #initialized = false;
  #initPromise = null;

  constructor({
    providers = createDefaultProviderEntries(),
    runtime = new ModuleRuntime({ logger: { error() {}, warn() {}, info() {} } }),
    stateStore = new JsonStateStore(),
    secretStore = createDefaultSecretStore(),
    dshAdapter = null,
    refreshTimeoutMs = numericOption(process.env.DOCKYARD_DSH_REFRESH_TIMEOUT_MS, DEFAULT_REFRESH_TIMEOUT_MS),
  } = {}) {
    this.runtime = runtime;
    this.stateStore = stateStore;
    this.secretStore = secretStore;
    this.bridge = new DshInjectionBridge({ runtime, adapter: dshAdapter });
    this.providers = providers;
    this.refreshTimeoutMs = refreshTimeoutMs;
  }

  setSecretStore(secretStore) {
    if (!secretStore || typeof secretStore.read !== "function" || typeof secretStore.write !== "function") {
      throw new TypeError("Dockyard secret store requires read() and write() methods");
    }
    this.secretStore = secretStore;
    return this;
  }

  async init() {
    if (this.#initialized) return this;
    if (this.#initPromise) return this.#initPromise;
    this.#initPromise = (async () => {
      const state = await this.stateStore.load();
      for (const entry of this.providers) {
        const providerId = entry.module.manifest.id;
        const stored = state.pools?.[providerId] ?? {};
        const pool = new AccountPool({
          providerId,
          policy: stored.policy ?? ACCOUNT_SELECTION_POLICY.ROUND_ROBIN,
        });
        for (const account of Array.isArray(stored.accounts) ? stored.accounts : []) {
          if (account?.auth?.credentialRef) {
            pool.upsert({ ...account, credentialRef: account.auth.credentialRef });
          }
        }
        if (stored.defaultAccountId && pool.get(stored.defaultAccountId)) {
          pool.setDefaultAccount(stored.defaultAccountId);
        }
        this.#entries.set(providerId, { ...entry, pool });
        // A DSH host may already have mounted a provider module before the
        // Dockyard integration starts. Reuse that registration instead of
        // aborting the whole subscription snapshot with a module conflict.
        if (!this.runtime.has(providerId)) await this.runtime.register(entry.module);
        await this.bridge.mountProvider(entry.module, pool);
      }
      this.#initialized = true;
      return this;
    })();
    try {
      return await this.#initPromise;
    } finally {
      this.#initPromise = null;
    }
  }

  #entry(providerId) {
    const entry = this.#entries.get(providerId);
    if (!entry) throw new Error(`Unknown Dockyard provider: ${providerId}`);
    return entry;
  }

  listProviderManifests() {
    return this.providers.map(({ module }) => ({ ...module.manifest }));
  }

  listProviderIds() {
    return this.providers.map(({ module }) => module.manifest.id);
  }

  async scan(providerId = null) {
    await this.init();
    const entries = providerId
      ? [[providerId, this.#entry(providerId)]]
      : [...this.#entries];
    const providers = [];
    const changedProviderIds = new Set();
    for (const [currentProviderId, entry] of entries) {
      let result;
      try {
        result = await entry.module.discover(providerContext(this, {
          accounts: entry.pool.list(),
        }));
      } catch (error) {
        result = { candidates: [], source: "provider", diagnostics: [redactError(error)] };
      }
      const rawCandidates = Array.isArray(result?.candidates) ? result.candidates : [];
      this.#candidates.set(currentProviderId, new Map(rawCandidates.map((candidate) => [candidate.candidateId, candidate])));
      for (const candidate of rawCandidates) {
        const existing = entry.pool.get(candidate.accountId);
        const candidateIdentity = candidate.resources ?? {};
        const existingIdentity = existing?.resources ?? {};
        if (!existing) continue;

        const identityChanged = candidate.email !== existing.email
          || candidate.displayName !== existing.displayName
          || candidateIdentity.identitySource !== existingIdentity.identitySource
          || candidateIdentity.identityLabel !== existingIdentity.identityLabel
          || candidateIdentity.sessionFingerprint !== existingIdentity.sessionFingerprint
          || candidateIdentity.identityNote !== existingIdentity.identityNote
          || candidateIdentity.sessionPersistence !== existingIdentity.sessionPersistence;
        if (identityChanged) {
          entry.pool.upsert({
            accountId: candidate.accountId,
            ...(candidate.email !== undefined ? { email: candidate.email } : {}),
            ...(candidate.displayName !== undefined ? { displayName: candidate.displayName } : {}),
            ...(candidate.resources ? { resources: candidate.resources } : {}),
          });
          changedProviderIds.add(currentProviderId);
        }

        // Antigravity can now capture the current local session into the DSH
        // credential vault. Use that once to upgrade a legacy `active` record
        // and whenever the official session token was refreshed, without
        // copying the token into the public snapshot.
        const fingerprintChanged = candidate.resources?.sessionPersistence === "captured"
          && candidate.resources.sessionFingerprint
          && candidate.resources.sessionFingerprint !== existing.resources?.sessionFingerprint;
        if (fingerprintChanged && typeof entry.module.importAccount === "function") {
          try {
            const captured = await entry.module.importAccount(candidate, providerContext(this));
            entry.pool.upsert(captured);
            changedProviderIds.add(currentProviderId);
          } catch {
            // Keep the existing account usable through its current provider
            // session; the next explicit add/scan can retry the capture.
          }
        }
      }
      const summarize = candidateSummarizers.get(currentProviderId) ?? ((candidate) => ({ ...candidate }));
      const candidates = rawCandidates.map((candidate) => ({
        ...summarize(candidate),
        imported: Boolean(entry.pool.get(candidate.accountId)),
      }));
      providers.push({
        providerId: currentProviderId,
        manifest: { ...entry.module.manifest },
        policy: entry.pool.policy,
        accounts: entry.pool.list(),
        candidates,
        source: result?.source ?? "unknown",
        diagnostics: result?.diagnostics ?? [],
      });
    }
    if (changedProviderIds.size > 0) await this.#saveState(changedProviderIds);
    return {
      generatedAt: new Date().toISOString(),
      providers,
      routes: this.bridge.listRoutes(),
    };
  }

  async importCandidate(providerId, candidateId) {
    await this.init();
    const entry = this.#entry(providerId);
    const candidate = this.#candidates.get(providerId)?.get(candidateId);
    if (!candidate) throw new Error("Candidate is missing; scan local OAuth states again");
    const rawAccount = await entry.module.importAccount(candidate, providerContext(this));
    entry.pool.upsert(rawAccount);
    await this.#saveState([providerId]);
    return {
      account: entry.pool.get(rawAccount.accountId),
      diagnostics: [],
      needsRefresh: true,
    };
  }

  async importSource(providerId, source) {
    await this.init();
    const entry = this.#entry(providerId);
    if (typeof entry.module.importSource !== "function") {
      throw new Error(`Provider ${providerId} does not support OAuth source import`);
    }
    const imported = await entry.module.importSource(source, providerContext(this));
    const rawAccounts = Array.isArray(imported)
      ? imported
      : Array.isArray(imported?.accounts) ? imported.accounts : [imported];
    const accounts = rawAccounts.filter((account) => account?.accountId).map((account) => {
      entry.pool.upsert(account);
      return entry.pool.get(account.accountId);
    });
    if (accounts.length === 0) throw new Error("OAuth source did not contain an importable account");
    await this.#saveState([providerId]);
    return { accounts, diagnostics: [] };
  }

  async startAuthorization(providerId) {
    await this.init();
    const entry = this.#entry(providerId);
    const result = await entry.module.startAuthorization(providerContext(this, {
      accounts: entry.pool.list(),
    }));
    return this.#persistAuthorizationResult(entry, providerId, result);
  }

  async pollAuthorization(providerId, sessionId) {
    await this.init();
    const entry = this.#entry(providerId);
    const result = await entry.module.pollAuthorization(sessionId, providerContext(this, {
      accounts: entry.pool.list(),
    }));
    return this.#persistAuthorizationResult(entry, providerId, result);
  }

  async cancelAuthorization(providerId, sessionId) {
    await this.init();
    return this.#entry(providerId).module.cancelAuthorization(sessionId, providerContext(this));
  }

  async submitAuthorizationCode(providerId, sessionId, code) {
    await this.init();
    const entry = this.#entry(providerId);
    return entry.module.submitAuthorizationCode(sessionId, code, providerContext(this, {
      accounts: entry.pool.list(),
    }));
  }

  async refreshAccount(providerId, accountId, { force = false, tolerateFailure = false } = {}) {
    try {
      return await withRefreshTimeout(
        (signal) => this.#refreshAccountNow(providerId, accountId, { force, tolerateFailure, signal }),
        { providerId, accountId, timeoutMs: this.refreshTimeoutMs },
      );
    } catch (error) {
      if (!error?.refreshTimeout || !tolerateFailure) throw error;
      await this.init();
      const entry = this.#entry(providerId);
      if (entry.pool.get(accountId)) {
        entry.pool.report(accountId, { status: "error", message: error.message });
        await this.#saveState([providerId]);
      }
      return { account: entry.pool.get(accountId), diagnostics: [error.message] };
    }
  }

  async #refreshAccountNow(providerId, accountId, { force = false, tolerateFailure = false, signal } = {}) {
    await this.init();
    const entry = this.#entry(providerId);
    providerAccount(entry.pool, accountId);
    const diagnostics = [];
    let authorizationFailure = null;
    let refresh = null;
    try {
      refresh = await entry.module.refreshAccount(
        providerAccount(entry.pool, accountId),
        providerContext(this, { force, signal }),
      );
      this.#applyPatch(entry.pool, accountId, refresh);
    } catch (error) {
      if (signal?.aborted) throw error;
      authorizationFailure = error;
      diagnostics.push(`刷新 OAuth 状态失败：${redactError(error)}`);
      entry.pool.report(accountId, {
        status: providerErrorStatus(error),
        message: diagnostics.at(-1),
      });
      if (!tolerateFailure) await this.#saveState([providerId]);
      if (!tolerateFailure) throw error;
    }
    // Do not use a stale access token for quota after OAuth itself returned
    // 401/403. That second request can obscure the actionable reauthorization
    // state with a less useful quota error.
    if (authorizationFailure?.authExpired || authorizationFailure?.authForbidden) {
      await this.#saveState([providerId]);
      return { account: entry.pool.get(accountId), diagnostics };
    }
    try {
      // Some native providers can return the live quota as part of their
      // authentication/status refresh. Reuse that result instead of issuing
      // the same provider request a second time.
      if (refresh && Object.hasOwn(refresh, "quota")) {
        const health = entry.pool.get(accountId)?.health;
        if (health?.status !== "expired") {
          entry.pool.report(accountId, { status: "success" });
        }
        await this.#saveState([providerId]);
        return { account: entry.pool.get(accountId), diagnostics };
      }
      const quota = await entry.module.getQuota(
        providerAccount(entry.pool, accountId),
        providerContext(this, { signal }),
      );
      this.#applyPatch(entry.pool, accountId, quota);
      // A provider refresh may only prove that its CLI/session metadata is
      // readable. Do not erase a native-request auth failure merely because a
      // later CLI status check succeeds; reauthorization/import is the action
      // that explicitly clears an expired transport credential.
      const health = entry.pool.get(accountId)?.health;
      if (health?.status !== "expired") {
        entry.pool.report(accountId, { status: "success" });
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      diagnostics.push(`刷新实时额度失败：${redactError(error)}`);
      entry.pool.report(accountId, {
        status: providerErrorStatus(error),
        message: diagnostics.at(-1),
      });
      if (!tolerateFailure) await this.#saveState([providerId]);
      if (!tolerateFailure) throw error;
    }
    await this.#saveState([providerId]);
    return { account: entry.pool.get(accountId), diagnostics };
  }

  async refreshAll(providerId = null) {
    await this.init();
    if (!providerId) {
      const batches = await Promise.all([...this.#entries].map(([id]) => this.refreshAll(id)));
      return batches.flat();
    }
    this.#entry(providerId);
    const existing = this.#refreshPromises.get(providerId);
    if (existing) return existing;
    const promise = (async () => {
      const entry = this.#entry(providerId);
      const results = await Promise.all(entry.pool.list().map(async (account) => {
        try {
          return await this.refreshAccount(providerId, account.accountId, { tolerateFailure: true });
        } catch (error) {
          return { account: entry.pool.get(account.accountId), diagnostics: [redactError(error)] };
        }
      }));
      return results;
    })();
    this.#refreshPromises.set(providerId, promise);
    try {
      return await promise;
    } finally {
      if (this.#refreshPromises.get(providerId) === promise) this.#refreshPromises.delete(providerId);
    }
  }

  async setPolicy(providerId, policy, defaultAccountId = undefined) {
    await this.init();
    const pool = this.#entry(providerId).pool;
    pool.setPolicy(policy);
    if (defaultAccountId !== undefined) pool.setDefaultAccount(defaultAccountId);
    await this.#saveState([providerId]);
    return { providerId, policy: pool.policy, defaultAccountId: pool.getDefaultAccountId() };
  }

  async setDefaultAccount(providerId, accountId) {
    await this.init();
    const pool = this.#entry(providerId).pool;
    pool.setDefaultAccount(accountId);
    await this.#saveState([providerId]);
    return { providerId, defaultAccountId: pool.getDefaultAccountId() };
  }

  async removeAccount(providerId, accountId) {
    await this.init();
    const entry = this.#entry(providerId);
    const credential = entry.pool.resolve(accountId);
    if (!entry.pool.remove(accountId)) {
      throw new Error(`Account does not exist: ${accountId}`);
    }
    await this.#saveState([providerId]);

    const diagnostics = [];
    if (credential.credentialRef && typeof this.secretStore?.delete === "function") {
      try {
        await this.secretStore.delete(credential.credentialRef);
      } catch (error) {
        diagnostics.push(`清理本机 Keychain 引用失败：${redactError(error)}`);
      }
    }
    return {
      providerId,
      accountId,
      removed: true,
      defaultAccountId: entry.pool.getDefaultAccountId(),
      diagnostics,
    };
  }

  async getCatalog(providerId) {
    await this.init();
    return this.#entry(providerId).module.getCatalog(providerContext(this));
  }

  async invoke(providerId, request, context = {}) {
    await this.init();
    const route = this.bridge.getRoute(providerId);
    return route.invoke(request, providerContext(this, context));
  }

  async stream(providerId, request, context = {}) {
    await this.init();
    const route = this.bridge.getRoute(providerId);
    if (!route) throw new Error(`Unknown Dockyard provider route: ${providerId}`);
    const output = route.stream(request, providerContext(this, context));
    const runtime = this;
    return (async function* streamWithPersistedHealth() {
      try {
        for await (const chunk of await output) yield chunk;
      } finally {
        // dsh-route reports success/auth failure while the stream is being
        // consumed. Persist that result after either completion or failure so
        // a later popup refresh and a process restart see the same health.
        try {
          await runtime.#saveState([providerId]);
        } catch {
          // Never replace the provider's response error with a state-store
          // error. The next explicit refresh can still persist the snapshot.
        }
      }
    })();
  }

  snapshot() {
    return {
      generatedAt: new Date().toISOString(),
      providers: [...this.#entries].map(([providerId, entry]) => ({
        providerId,
        manifest: { ...entry.module.manifest },
        policy: entry.pool.policy,
        defaultAccountId: entry.pool.getDefaultAccountId(),
        accounts: entry.pool.list(),
      })),
      routes: this.bridge.listRoutes(),
    };
  }

  #applyPatch(pool, accountId, patch = {}) {
    if (!patch || typeof patch !== "object") return;
    const input = { accountId };
    for (const key of ["email", "displayName", "subscription", "quota", "refresh", "resources"]) {
      if (patch[key] !== undefined) input[key] = patch[key];
    }
    if (patch.identity?.email !== undefined) input.email = patch.identity.email;
    if (patch.identity?.displayName !== undefined) input.displayName = patch.identity.displayName;
    if (patch.credits !== undefined) input.resources = { credits: patch.credits };
    pool.upsert(input);
  }

  async #persistAuthorizationResult(entry, providerId, result) {
    if (result?.status !== "completed") return result;
    const rawAccounts = Array.isArray(result.accounts)
      ? result.accounts
      : result.account ? [result.account] : [];
    const accounts = await this.#storeImportedAccounts(entry, rawAccounts);
    await this.#saveState([providerId]);
    return { ...result, accounts };
  }

  async #storeImportedAccounts(entry, rawAccounts) {
    const accounts = [];
    for (const account of rawAccounts.filter((value) => value?.accountId)) {
      // Provider OAuth authorizers may return either an already-imported
      // account (with an opaque auth reference) or a short-lived candidate
      // carrying the credential material in a private field. Import the
      // latter before putting it into the pool; otherwise the snapshot looks
      // authenticated while the native request falls back to an old local
      // session.
      const alreadyImported = Boolean(
        account?.auth?.credentialRef
          || (account?.auth?.kind && account?.credentialRef && !account?.candidateId),
      );
      const imported = alreadyImported || typeof entry.module.importAccount !== "function"
        ? account
        : await entry.module.importAccount(account, providerContext(this));
      entry.pool.upsert(imported);
      accounts.push(entry.pool.get(imported.accountId));
    }
    return accounts;
  }

  async #saveState(changedProviderIds = null) {
    // Multiple DSH entry points can share ~/.dockyard-dsh/state.json. Merge
    // the latest file before persisting so an older runtime that only changed
    // one provider cannot erase accounts added by another runtime/provider.
    const changed = changedProviderIds === null
      ? new Set(this.#entries.keys())
      : new Set(changedProviderIds);
    const latest = await this.stateStore.load().catch(() => ({ pools: {} }));
    const pools = {
      ...(latest?.pools && typeof latest.pools === "object" ? latest.pools : {}),
    };
    for (const [providerId, entry] of this.#entries) {
      if (!changed.has(providerId) && Object.hasOwn(pools, providerId)) continue;
      pools[providerId] = {
        policy: entry.pool.policy,
        defaultAccountId: entry.pool.getDefaultAccountId(),
        accounts: entry.pool.listForStorage(),
      };
    }
    await this.stateStore.save({ ...latest, pools });
  }
}
