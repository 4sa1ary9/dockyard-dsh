var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// packages/dsh-plugin/src/dockyard-remote-host.mjs
var dockyard_remote_host_exports = {};
__export(dockyard_remote_host_exports, {
  DockyardRemoteService: () => DockyardRemoteService
});
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
function publicAuthResult(result) {
  if (!result || typeof result !== "object") return result;
  return {
    status: result.status,
    ...result.providerId ? { providerId: result.providerId } : {},
    ...result.sessionId ? { sessionId: result.sessionId } : {},
    ...result.authorizationUrl ? { authorizationUrl: result.authorizationUrl } : {},
    ...result.instructions ? { instructions: result.instructions } : {},
    ...result.browserOpened ? { browserOpened: true } : {},
    ...result.inputRequired ? { inputRequired: true } : {},
    ...result.diagnostic ? { diagnostic: result.diagnostic } : {},
    ...Array.isArray(result.accounts) ? { accounts: result.accounts } : {}
  };
}
function envelope(result, snapshot) {
  return { result, snapshot };
}
function markRemoteMethods() {
  const target = Object.create(DockyardRemoteService.prototype);
  for (const name2 of [
    "snapshot",
    "refresh",
    "scan",
    "add",
    "login",
    "poll",
    "submitAuthorizationCode",
    "cancel",
    "setPolicy",
    "use",
    "removeAccount",
    "nativeKeyStatus",
    "nativeKeyRefresh",
    "nativeKeyRegister",
    "nativeKeyUnregister",
    "nativeKeySetPolicy"
  ]) {
    let initializer;
    Remote(name2)(void 0, {
      kind: "method",
      name: name2,
      static: false,
      private: false,
      addInitializer(callback) {
        initializer = callback;
      }
    });
    initializer?.call(target);
  }
}
var DockyardRemoteService;
var init_dockyard_remote_host = __esm({
  "packages/dsh-plugin/src/dockyard-remote-host.mjs"() {
    DockyardRemoteService = class extends TypertRemoteService {
      static inject = [];
      constructor(ctx, config = {}) {
        super(ctx, "dockyardRemote", { namespace: "dockyard" });
        if (!config.service) throw new Error("Dockyard remote service requires DockyardDshService");
        this.dockyard = config.service;
        this.nativeKeyPool = config.nativeKeyPool ?? null;
      }
      async snapshot() {
        return this.dockyard.snapshot();
      }
      async refresh(request = {}) {
        const providerId = request?.providerId ?? null;
        const result = await this.dockyard.refresh(providerId);
        return envelope(result, await this.dockyard.snapshot());
      }
      async scan(request = {}) {
        const result = await this.dockyard.scan(request?.providerId ?? null);
        return envelope(result, await this.dockyard.snapshot());
      }
      async add(request = {}) {
        const result = await this.dockyard.add(request?.providerId ?? null, request?.candidateId ?? null);
        return envelope(result, await this.dockyard.snapshot());
      }
      async login(request) {
        const result = publicAuthResult(await this.dockyard.startAuthorization(request.providerId));
        return envelope(result, await this.dockyard.snapshot());
      }
      async poll(request) {
        const result = publicAuthResult(await this.dockyard.pollAuthorization(request.providerId, request.sessionId));
        return envelope(result, await this.dockyard.snapshot());
      }
      async submitAuthorizationCode(request) {
        const result = publicAuthResult(await this.dockyard.submitAuthorizationCode(
          request.providerId,
          request.sessionId,
          request.code
        ));
        return envelope(result, await this.dockyard.snapshot());
      }
      async cancel(request) {
        const result = publicAuthResult(await this.dockyard.cancelAuthorization(request.providerId, request.sessionId));
        return envelope(result, await this.dockyard.snapshot());
      }
      async setPolicy(request) {
        const result = await this.dockyard.setPolicy(request.providerId, request.policy, request.defaultAccountId);
        return envelope(result, await this.dockyard.snapshot());
      }
      async use(request) {
        const result = await this.dockyard.setDefaultAccount(request.providerId, request.accountId);
        return envelope(result, await this.dockyard.snapshot());
      }
      async removeAccount(request) {
        const result = await this.dockyard.removeAccount(request.providerId, request.accountId);
        return envelope(result, await this.dockyard.snapshot());
      }
      async nativeKeyStatus(request = {}) {
        if (!this.nativeKeyPool) return { providerId: request.providerId, runtimeMode: "native-single-key", keys: [] };
        return this.nativeKeyPool.status(request.providerId);
      }
      async nativeKeyRefresh(request = {}) {
        if (!this.nativeKeyPool) return { providerId: request.providerId, runtimeMode: "native-single-key", keys: [] };
        return this.nativeKeyPool.refreshUsage(request.providerId);
      }
      async nativeKeyRegister(request = {}) {
        if (!this.nativeKeyPool) throw new Error("Dockyard Native Key Pool \u5C1A\u672A\u6302\u8F7D");
        return this.nativeKeyPool.register(request.providerId, request.ref, request.label);
      }
      async nativeKeyUnregister(request = {}) {
        if (!this.nativeKeyPool) throw new Error("Dockyard Native Key Pool \u5C1A\u672A\u6302\u8F7D");
        return this.nativeKeyPool.unregister(request.providerId, request.ref);
      }
      async nativeKeySetPolicy(request = {}) {
        if (!this.nativeKeyPool) throw new Error("Dockyard Native Key Pool \u5C1A\u672A\u6302\u8F7D");
        return this.nativeKeyPool.setPolicy(request.providerId, request.policy);
      }
    };
    markRemoteMethods();
  }
});

// packages/core/src/errors.mjs
var DockyardError = class extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DockyardError";
    this.code = code;
    this.details = details;
  }
};
var ValidationError = class extends DockyardError {
  constructor(message, details = {}) {
    super("validation_error", message, details);
    this.name = "ValidationError";
  }
};
var ModuleConflictError = class extends DockyardError {
  constructor(moduleId) {
    super("module_conflict", `Module is already registered: ${moduleId}`, { moduleId });
    this.name = "ModuleConflictError";
  }
};
var ModuleNotFoundError = class extends DockyardError {
  constructor(moduleId) {
    super("module_not_found", `Module is not registered: ${moduleId}`, { moduleId });
    this.name = "ModuleNotFoundError";
  }
};
var AccountSelectionError = class extends DockyardError {
  constructor(message, details = {}) {
    super("account_selection_error", message, details);
    this.name = "AccountSelectionError";
  }
};
var ProviderCapabilityError = class extends DockyardError {
  constructor(providerId, capability) {
    super(
      "provider_capability_unavailable",
      `Provider module ${providerId} does not have an active ${capability} driver`,
      { providerId, capability }
    );
    this.name = "ProviderCapabilityError";
  }
};

// packages/core/src/contracts.mjs
var ACCOUNT_HEALTH = Object.freeze({
  UNKNOWN: "unknown",
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  COOLDOWN: "cooldown",
  EXPIRED: "expired",
  EXHAUSTED: "exhausted"
});
var ACCOUNT_SELECTION_POLICY = Object.freeze({
  MANUAL: "manual",
  STICKY_SESSION: "sticky_session",
  ROUND_ROBIN: "round_robin",
  FAILOVER: "failover"
});
var PROVIDER_CAPABILITIES = Object.freeze([
  "oauth_discovery",
  "oauth_import",
  "oauth_authorization",
  "oauth_refresh",
  "quota",
  "catalog",
  "invoke",
  "stream"
]);
function isoOrNull(value, fieldName) {
  if (value === void 0 || value === null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Invalid ISO timestamp for ${fieldName}`, { fieldName, value });
  }
  return date.toISOString();
}
function numberOrNull(value, fieldName) {
  if (value === void 0 || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`Expected a finite number for ${fieldName}`, { fieldName, value });
  }
  return value;
}
function stringOrNull(value) {
  return value === void 0 || value === null || value === "" ? null : String(value);
}
function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? structuredClone(value) : {};
}
function createQuotaWindow(input = {}, now = /* @__PURE__ */ new Date()) {
  return {
    id: stringOrNull(input.id),
    name: stringOrNull(input.name),
    remaining: numberOrNull(input.remaining, "quota.windows.remaining"),
    limit: numberOrNull(input.limit, "quota.windows.limit"),
    unit: stringOrNull(input.unit),
    resetAt: isoOrNull(input.resetAt, "quota.windows.resetAt"),
    updatedAt: isoOrNull(input.updatedAt, "quota.windows.updatedAt") ?? now.toISOString(),
    source: stringOrNull(input.source) ?? "unknown"
  };
}
function createQuotaSnapshot(input = {}, now = /* @__PURE__ */ new Date()) {
  return {
    remaining: numberOrNull(input.remaining, "quota.remaining"),
    limit: numberOrNull(input.limit, "quota.limit"),
    unit: stringOrNull(input.unit),
    resetAt: isoOrNull(input.resetAt, "quota.resetAt"),
    updatedAt: isoOrNull(input.updatedAt, "quota.updatedAt") ?? now.toISOString(),
    source: stringOrNull(input.source) ?? "unknown",
    windows: Array.isArray(input.windows) ? input.windows.map((window) => createQuotaWindow(window, now)) : []
  };
}
function createRefreshState(input = {}) {
  return {
    accessTokenExpiresAt: isoOrNull(input.accessTokenExpiresAt, "refresh.accessTokenExpiresAt"),
    nextRefreshAt: isoOrNull(input.nextRefreshAt, "refresh.nextRefreshAt"),
    lastRefreshedAt: isoOrNull(input.lastRefreshedAt, "refresh.lastRefreshedAt"),
    refreshable: input.refreshable === void 0 ? null : Boolean(input.refreshable)
  };
}
function createAccountRecord(input, now = /* @__PURE__ */ new Date()) {
  if (!input || typeof input !== "object") throw new ValidationError("Account input is required");
  if (!input.providerId) throw new ValidationError("Account providerId is required");
  if (!input.accountId) throw new ValidationError("Account accountId is required");
  if (!input.credentialRef) throw new ValidationError("Account credentialRef is required");
  const health = input.health ?? {};
  const createdAt = isoOrNull(input.createdAt, "createdAt") ?? now.toISOString();
  const updatedAt2 = isoOrNull(input.updatedAt, "updatedAt") ?? now.toISOString();
  return {
    providerId: String(input.providerId),
    accountId: String(input.accountId),
    displayName: stringOrNull(input.displayName),
    email: stringOrNull(input.email),
    auth: {
      kind: stringOrNull(input.auth?.kind) ?? "oauth",
      credentialRef: String(input.credentialRef),
      scopes: Array.isArray(input.auth?.scopes) ? [...input.auth.scopes] : []
    },
    subscription: {
      plan: stringOrNull(input.subscription?.plan),
      status: stringOrNull(input.subscription?.status),
      expiresAt: isoOrNull(input.subscription?.expiresAt, "subscription.expiresAt")
    },
    quota: createQuotaSnapshot(input.quota ?? {}, now),
    refresh: createRefreshState(input.refresh ?? {}),
    resources: objectOrEmpty(input.resources),
    health: {
      status: health.status ?? ACCOUNT_HEALTH.UNKNOWN,
      lastCheckedAt: isoOrNull(health.lastCheckedAt, "health.lastCheckedAt"),
      cooldownUntil: isoOrNull(health.cooldownUntil, "health.cooldownUntil"),
      lastError: stringOrNull(health.lastError)
    },
    lastUsedAt: isoOrNull(input.lastUsedAt, "lastUsedAt"),
    createdAt,
    updatedAt: updatedAt2
  };
}
function accountSummary(account) {
  return {
    providerId: account.providerId,
    accountId: account.accountId,
    displayName: account.displayName,
    email: account.email,
    subscription: { ...account.subscription },
    quota: { ...account.quota },
    refresh: { ...account.refresh },
    resources: structuredClone(account.resources ?? {}),
    health: { ...account.health },
    lastUsedAt: account.lastUsedAt
  };
}
function accountStorageRecord(account) {
  return {
    ...accountSummary(account),
    auth: {
      kind: account.auth.kind,
      credentialRef: account.auth.credentialRef,
      scopes: [...account.auth.scopes]
    },
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

// packages/core/src/events.mjs
var EventBus = class {
  #handlers = /* @__PURE__ */ new Map();
  on(type, handler) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, /* @__PURE__ */ new Set());
    this.#handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }
  off(type, handler) {
    const handlers = this.#handlers.get(type);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) this.#handlers.delete(type);
  }
  async emit(type, payload) {
    const handlers = [...this.#handlers.get(type) ?? []];
    for (const handler of handlers) await handler(payload);
  }
  clear() {
    this.#handlers.clear();
  }
};

// packages/core/src/module-runtime.mjs
var ModuleRuntime = class {
  #modules = /* @__PURE__ */ new Map();
  #services = /* @__PURE__ */ new Map();
  constructor({ events = new EventBus(), logger = console } = {}) {
    this.events = events;
    this.logger = logger;
  }
  async register(module) {
    const manifest = module?.manifest;
    if (!manifest?.id || !manifest.kind) {
      throw new ValidationError("A module manifest must contain id and kind");
    }
    if (this.#modules.has(manifest.id)) throw new ModuleConflictError(manifest.id);
    const record = { module, manifest: { ...manifest }, services: /* @__PURE__ */ new Set(), active: false };
    this.#modules.set(manifest.id, record);
    const context = this.#contextFor(record);
    try {
      if (typeof module.activate === "function") await module.activate(context);
      record.active = true;
      await this.events.emit("module/registered", { moduleId: manifest.id, manifest: { ...manifest } });
      return module;
    } catch (error) {
      this.#removeServices(record);
      this.#modules.delete(manifest.id);
      throw error;
    }
  }
  async unregister(moduleId) {
    const record = this.#modules.get(moduleId);
    if (!record) throw new ModuleNotFoundError(moduleId);
    if (typeof record.module.deactivate === "function") {
      await record.module.deactivate(this.#contextFor(record));
    }
    this.#removeServices(record);
    this.#modules.delete(moduleId);
    await this.events.emit("module/unregistered", { moduleId });
  }
  has(moduleId) {
    return this.#modules.has(moduleId);
  }
  get(moduleId) {
    const record = this.#modules.get(moduleId);
    if (!record) throw new ModuleNotFoundError(moduleId);
    return record.module;
  }
  list() {
    return [...this.#modules.values()].map(({ manifest, active }) => ({ ...manifest, active }));
  }
  registerService(name2, value, ownerId) {
    if (this.#services.has(name2)) {
      throw new ValidationError(`Service is already registered: ${name2}`, { name: name2 });
    }
    this.#services.set(name2, { value, ownerId });
    const record = this.#modules.get(ownerId);
    if (record) record.services.add(name2);
  }
  getService(name2) {
    const service = this.#services.get(name2);
    if (!service) throw new ValidationError(`Service is not registered: ${name2}`, { name: name2 });
    return service.value;
  }
  hasService(name2) {
    return this.#services.has(name2);
  }
  #contextFor(record) {
    return {
      moduleId: record.manifest.id,
      events: this.events,
      logger: this.logger,
      registerService: (name2, value) => this.registerService(name2, value, record.manifest.id),
      getService: (name2) => this.getService(name2),
      emit: (type, payload = {}) => this.events.emit(type, { ...payload, moduleId: record.manifest.id })
    };
  }
  #removeServices(record) {
    for (const name2 of record.services) this.#services.delete(name2);
    record.services.clear();
  }
};

// packages/core/src/provider-module.mjs
function missingDriver(providerId, capability) {
  return async () => {
    throw new ProviderCapabilityError(providerId, capability);
  };
}
function defineProviderModule({
  id,
  displayName,
  capabilities = [],
  driver = {}
}) {
  if (!id) throw new ValidationError("Provider module id is required");
  const module = {
    manifest: {
      id,
      kind: "provider",
      displayName: displayName ?? id,
      capabilities: [...capabilities],
      dataSource: "live_oauth"
    },
    async activate(context) {
      context.registerService(`provider:${id}`, module);
      await context.emit("provider/registered", { providerId: id });
    },
    async deactivate(context) {
      await context.emit("provider/unregistered", { providerId: id });
    },
    async discover(context) {
      return driver.discover ? driver.discover(context) : missingDriver(id, "oauth_discovery")(context);
    },
    async importAccount(candidate2, context) {
      return driver.importAccount ? driver.importAccount(candidate2, context) : missingDriver(id, "oauth_import")(candidate2, context);
    },
    async importSource(source, context) {
      return driver.importSource ? driver.importSource(source, context) : missingDriver(id, "oauth_source_import")(source, context);
    },
    async startAuthorization(context) {
      return driver.startAuthorization ? driver.startAuthorization(context) : missingDriver(id, "oauth_authorization")(context);
    },
    async pollAuthorization(sessionId, context) {
      return driver.pollAuthorization ? driver.pollAuthorization(sessionId, context) : missingDriver(id, "oauth_authorization")(sessionId, context);
    },
    async cancelAuthorization(sessionId, context) {
      return driver.cancelAuthorization ? driver.cancelAuthorization(sessionId, context) : missingDriver(id, "oauth_authorization")(sessionId, context);
    },
    async submitAuthorizationCode(sessionId, code, context) {
      return driver.submitAuthorizationCode ? driver.submitAuthorizationCode(sessionId, code, context) : missingDriver(id, "oauth_authorization")(sessionId, code, context);
    },
    async refreshAccount(account, context) {
      return driver.refreshAccount ? driver.refreshAccount(account, context) : missingDriver(id, "oauth_refresh")(account, context);
    },
    async getQuota(account, context) {
      return driver.getQuota ? driver.getQuota(account, context) : missingDriver(id, "quota")(account, context);
    },
    async getCatalog(context) {
      return driver.getCatalog ? driver.getCatalog(context) : missingDriver(id, "catalog")(context);
    },
    async invoke(request, invocation, context) {
      return driver.invoke ? driver.invoke(request, invocation, context) : missingDriver(id, "invoke")(request, invocation, context);
    },
    async stream(request, invocation, context) {
      if (driver.stream) return driver.stream(request, invocation, context);
      if (driver.invoke) return driver.invoke(request, invocation, context);
      return missingDriver(id, "stream")(request, invocation, context);
    }
  };
  return Object.freeze(module);
}

// packages/core/src/dsh-route.mjs
function selectionContext(context, excludedIds) {
  if (excludedIds.size === 0) return context;
  return { ...context, excludeAccountIds: [...excludedIds] };
}
function shouldFailover(error, accountPool, context) {
  return accountPool.policy === ACCOUNT_SELECTION_POLICY.FAILOVER && !context.accountId && (error?.rateLimited || error?.quotaExhausted || error?.authExpired);
}
function quotaResetAt(account) {
  const candidates = [
    account?.quota?.resetAt,
    ...Array.isArray(account?.quota?.windows) ? account.quota.windows.map((window) => window?.resetAt) : []
  ].filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime()) && value.getTime() > Date.now()).sort((left, right) => left.getTime() - right.getTime());
  return candidates[0]?.toISOString() ?? null;
}
function failureStatus(error) {
  if (error?.authExpired) return "auth_expired";
  if (error?.quotaExhausted) return "quota_exhausted";
  if (error?.rateLimited) return "rate_limited";
  return "error";
}
function failureCooldown(error, account) {
  return error?.cooldownUntil ?? quotaResetAt(account);
}
function hasSubstantiveStreamOutput(chunk) {
  if (!chunk || typeof chunk !== "object") return true;
  if (chunk.type === "block-start") return false;
  if (chunk.type === "block-end") {
    return Boolean(chunk.block?.text || chunk.block?.id || chunk.block?.arguments);
  }
  return !["usage", "finish"].includes(chunk.type);
}
function providerAccount(account, auth) {
  return {
    ...account,
    auth: {
      kind: auth.authKind,
      credentialRef: auth.credentialRef,
      scopes: [...auth.scopes]
    }
  };
}
function createProviderRoute({ providerModule, accountPool }) {
  if (!providerModule?.manifest?.id) throw new ValidationError("Provider module is required");
  if (!accountPool?.select || !accountPool?.resolve) throw new ValidationError("Account pool is required");
  if (accountPool.providerId !== providerModule.manifest.id) {
    throw new ValidationError("Provider module and account pool do not match", {
      providerId: providerModule.manifest.id,
      poolProviderId: accountPool.providerId
    });
  }
  return {
    providerId: providerModule.manifest.id,
    async invoke(request, context = {}) {
      const excludedIds = new Set(context.excludeAccountIds ?? []);
      let lastError = null;
      while (true) {
        let account;
        try {
          account = accountPool.select(selectionContext(context, excludedIds));
        } catch (selectionError) {
          throw lastError ?? selectionError;
        }
        excludedIds.add(account.accountId);
        const auth = accountPool.resolve(account.accountId);
        const selectedAccount = providerAccount(account, auth);
        try {
          const response = await providerModule.invoke(
            request,
            { account: selectedAccount, auth },
            context
          );
          accountPool.report(account.accountId, {
            status: "success",
            quota: response?.quota,
            refresh: response?.refresh
          });
          return response;
        } catch (error) {
          accountPool.report(account.accountId, {
            status: failureStatus(error),
            cooldownUntil: failureCooldown(error, selectedAccount),
            message: error?.message
          });
          if (!shouldFailover(error, accountPool, context)) throw error;
          lastError = error;
        }
      }
    },
    stream(request, context = {}) {
      return (async function* streamWithHealth() {
        const excludedIds = new Set(context.excludeAccountIds ?? []);
        let lastError = null;
        while (true) {
          let account;
          try {
            account = accountPool.select(selectionContext(context, excludedIds));
          } catch (selectionError) {
            throw lastError ?? selectionError;
          }
          excludedIds.add(account.accountId);
          const auth = accountPool.resolve(account.accountId);
          const selectedAccount = providerAccount(account, auth);
          const pending = [];
          let hasOutput = false;
          try {
            const output = providerModule.stream(request, { account: selectedAccount, auth }, context);
            for await (const chunk of await output) {
              if (!hasOutput && !hasSubstantiveStreamOutput(chunk)) {
                pending.push(chunk);
                continue;
              }
              if (!hasOutput) {
                hasOutput = true;
                for (const buffered of pending) yield buffered;
              }
              yield chunk;
            }
            if (!hasOutput) {
              for (const buffered of pending) yield buffered;
            }
            accountPool.report(account.accountId, { status: "success" });
            return;
          } catch (error) {
            accountPool.report(account.accountId, {
              status: failureStatus(error),
              cooldownUntil: failureCooldown(error, selectedAccount),
              message: error?.message
            });
            if (!hasOutput && shouldFailover(error, accountPool, context)) {
              lastError = error;
              continue;
            }
            throw error;
          }
        }
      })();
    }
  };
}

// packages/account-pool/src/account-pool.mjs
function defaultClock() {
  return /* @__PURE__ */ new Date();
}
var AccountPool = class {
  #accounts = /* @__PURE__ */ new Map();
  #sessionAssignments = /* @__PURE__ */ new Map();
  #cursor = 0;
  #defaultAccountId = null;
  constructor({ providerId, policy = ACCOUNT_SELECTION_POLICY.ROUND_ROBIN, clock = defaultClock } = {}) {
    if (!providerId) throw new ValidationError("AccountPool providerId is required");
    if (!Object.values(ACCOUNT_SELECTION_POLICY).includes(policy)) {
      throw new ValidationError(`Unknown account selection policy: ${policy}`, { policy });
    }
    this.providerId = providerId;
    this.policy = policy;
    this.clock = clock;
  }
  upsert(input) {
    if (input.providerId && input.providerId !== this.providerId) {
      throw new ValidationError("Account provider does not match this pool", {
        expected: this.providerId,
        received: input.providerId
      });
    }
    const current = this.#accounts.get(input.accountId);
    const account = createAccountRecord(
      {
        ...current,
        ...input,
        credentialRef: input.credentialRef ?? current?.auth?.credentialRef,
        providerId: this.providerId,
        auth: { ...current?.auth, ...input.auth },
        subscription: { ...current?.subscription, ...input.subscription },
        quota: { ...current?.quota, ...input.quota },
        refresh: { ...current?.refresh, ...input.refresh },
        resources: { ...current?.resources, ...input.resources },
        health: { ...current?.health, ...input.health },
        createdAt: current?.createdAt ?? input.createdAt
      },
      this.clock()
    );
    this.#accounts.set(account.accountId, account);
    this.#ensureSingleAccountDefault();
    return accountSummary(account);
  }
  remove(accountId) {
    this.#sessionAssignments.forEach((assignedId, key) => {
      if (assignedId === accountId) this.#sessionAssignments.delete(key);
    });
    const removed = this.#accounts.delete(accountId);
    if (removed && this.#defaultAccountId === accountId) this.#defaultAccountId = null;
    this.#ensureSingleAccountDefault();
    return removed;
  }
  get(accountId) {
    const account = this.#accounts.get(accountId);
    return account ? accountSummary(account) : null;
  }
  list() {
    return [...this.#accounts.values()].map(accountSummary);
  }
  listForStorage() {
    return [...this.#accounts.values()].map(accountStorageRecord);
  }
  getDefaultAccountId() {
    return this.#defaultAccountId;
  }
  setPolicy(policy) {
    if (!Object.values(ACCOUNT_SELECTION_POLICY).includes(policy)) {
      throw new ValidationError(`Unknown account selection policy: ${policy}`, { policy });
    }
    this.policy = policy;
    this.#sessionAssignments.clear();
    this.#ensureSingleAccountDefault();
  }
  setDefaultAccount(accountId) {
    if (accountId !== null && !this.#accounts.has(accountId)) {
      throw new AccountSelectionError(`Account does not exist: ${accountId}`, { accountId });
    }
    this.#defaultAccountId = accountId;
  }
  select(context = {}) {
    const eligible = this.#eligibleAccounts();
    if (eligible.length === 0) {
      throw new AccountSelectionError(`No eligible accounts for provider ${this.providerId}`, {
        providerId: this.providerId
      });
    }
    let account;
    if (this.policy === ACCOUNT_SELECTION_POLICY.MANUAL) {
      const requestedId = context.accountId ?? this.#defaultAccountId ?? (eligible.length === 1 ? eligible[0].accountId : null);
      if (!requestedId) throw new AccountSelectionError("Manual policy requires accountId");
      account = eligible.find((candidate2) => candidate2.accountId === requestedId);
      if (!account) throw new AccountSelectionError(`Account is not eligible: ${requestedId}`, { accountId: requestedId });
    } else {
      const assignmentKey = context.sessionId ?? context.requestId ?? null;
      const excludedIds = new Set(context.excludeAccountIds ?? []);
      const assignedId = assignmentKey ? this.#sessionAssignments.get(assignmentKey) : null;
      account = assignedId && !excludedIds.has(assignedId) ? eligible.find((candidate2) => candidate2.accountId === assignedId) : null;
      if (!account) {
        account = this.policy === ACCOUNT_SELECTION_POLICY.FAILOVER ? eligible.find((candidate2) => !excludedIds.has(candidate2.accountId)) : this.#next(eligible);
        if (!account) {
          throw new AccountSelectionError("No eligible account remains after failover exclusions", {
            providerId: this.providerId,
            excludeAccountIds: [...excludedIds]
          });
        }
        if (assignmentKey) this.#sessionAssignments.set(assignmentKey, account.accountId);
      }
    }
    const updated = {
      ...account,
      lastUsedAt: this.clock().toISOString(),
      updatedAt: this.clock().toISOString()
    };
    this.#accounts.set(updated.accountId, updated);
    return accountSummary(updated);
  }
  resolve(accountId) {
    const account = this.#accounts.get(accountId);
    if (!account) throw new AccountSelectionError(`Account does not exist: ${accountId}`, { accountId });
    return {
      providerId: account.providerId,
      accountId: account.accountId,
      credentialRef: account.auth.credentialRef,
      authKind: account.auth.kind,
      scopes: [...account.auth.scopes]
    };
  }
  updateQuota(accountId, input) {
    const current = this.#accounts.get(accountId);
    if (!current) throw new AccountSelectionError(`Account does not exist: ${accountId}`, { accountId });
    return this.#patch(accountId, {
      quota: createQuotaSnapshot({ ...current.quota, ...input }, this.clock())
    });
  }
  updateRefresh(accountId, input) {
    const current = this.#accounts.get(accountId);
    if (!current) throw new AccountSelectionError(`Account does not exist: ${accountId}`, { accountId });
    return this.#patch(accountId, {
      refresh: createRefreshState({ ...current.refresh, ...input })
    });
  }
  updateResources(accountId, input = {}) {
    const current = this.#accounts.get(accountId);
    if (!current) throw new AccountSelectionError(`Account does not exist: ${accountId}`, { accountId });
    return this.#patch(accountId, { resources: { ...current.resources, ...input } });
  }
  report(accountId, result = {}) {
    const account = this.#accounts.get(accountId);
    if (!account) throw new AccountSelectionError(`Account does not exist: ${accountId}`, { accountId });
    const now = this.clock().toISOString();
    const patch = { updatedAt: now, health: { ...account.health, lastCheckedAt: now } };
    if (result.quota) patch.quota = createQuotaSnapshot({ ...account.quota, ...result.quota }, this.clock());
    if (result.refresh) patch.refresh = createRefreshState({ ...account.refresh, ...result.refresh });
    switch (result.status) {
      case "success":
        patch.health = { ...patch.health, status: ACCOUNT_HEALTH.HEALTHY, cooldownUntil: null, lastError: null };
        break;
      case "rate_limited":
        patch.health = {
          ...patch.health,
          status: result.cooldownUntil ? ACCOUNT_HEALTH.COOLDOWN : ACCOUNT_HEALTH.DEGRADED,
          cooldownUntil: result.cooldownUntil ?? null,
          lastError: result.message ?? null
        };
        break;
      case "quota_exhausted":
        patch.health = {
          ...patch.health,
          status: ACCOUNT_HEALTH.EXHAUSTED,
          cooldownUntil: result.cooldownUntil ?? null,
          lastError: result.message ?? null
        };
        break;
      case "auth_expired":
        patch.health = { ...patch.health, status: ACCOUNT_HEALTH.EXPIRED, lastError: result.message ?? null };
        break;
      case "error":
        patch.health = { ...patch.health, status: ACCOUNT_HEALTH.DEGRADED, lastError: result.message ?? null };
        break;
      default:
        break;
    }
    return this.#patch(accountId, patch);
  }
  #patch(accountId, patch) {
    const current = this.#accounts.get(accountId);
    if (!current) throw new AccountSelectionError(`Account does not exist: ${accountId}`, { accountId });
    const next = {
      ...current,
      ...patch,
      quota: patch.quota ? { ...current.quota, ...patch.quota } : current.quota,
      refresh: patch.refresh ? { ...current.refresh, ...patch.refresh } : current.refresh,
      resources: patch.resources ? { ...current.resources, ...patch.resources } : current.resources,
      health: patch.health ? { ...current.health, ...patch.health } : current.health
    };
    this.#accounts.set(accountId, next);
    return accountSummary(next);
  }
  #eligibleAccounts() {
    const now = this.clock();
    return [...this.#accounts.values()].filter((account) => {
      if (account.health.status === ACCOUNT_HEALTH.EXPIRED) return false;
      if (account.health.status === ACCOUNT_HEALTH.EXHAUSTED && !account.health.cooldownUntil) return false;
      if (!account.health.cooldownUntil) return true;
      return new Date(account.health.cooldownUntil).getTime() <= now.getTime();
    });
  }
  #next(accounts) {
    const account = accounts[this.#cursor % accounts.length];
    this.#cursor = (this.#cursor + 1) % accounts.length;
    return account;
  }
  #ensureSingleAccountDefault() {
    if (this.policy !== ACCOUNT_SELECTION_POLICY.MANUAL || this.#defaultAccountId || this.#accounts.size !== 1) return;
    this.#defaultAccountId = this.#accounts.keys().next().value ?? null;
  }
};

// packages/dsh-bridge/src/llm-adapter.mjs
function effortName(id) {
  return String(id).replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
function modelCapacityText(value) {
  if (!Number.isInteger(value) || value <= 0) return null;
  return `${new Intl.NumberFormat().format(value)} tokens`;
}
function modelDescription(model) {
  const details = [];
  if (typeof model.description === "string" && model.description.length > 0) {
    details.push(model.description);
  }
  const context = modelCapacityText(model.contextWindow);
  details.push(context ? `\u4E0A\u4E0B\u6587 ${context}` : "\u4E0A\u4E0B\u6587\u672A\u7531 provider \u8FD4\u56DE");
  const output = modelCapacityText(model.maxTokens);
  if (output) details.push(`\u8F93\u51FA\u4E0A\u9650 ${output}`);
  return details.join(" \xB7 ");
}
function normalizeDshReasoning(reasoning) {
  if (!reasoning || !Array.isArray(reasoning.efforts)) return void 0;
  const efforts = [];
  const seen = /* @__PURE__ */ new Set();
  for (const effort of reasoning.efforts) {
    if (!effort || typeof effort.id !== "string" || effort.id.length === 0 || seen.has(effort.id)) continue;
    const name2 = typeof effort.name === "string" && effort.name.length > 0 ? effort.name : effortName(effort.id);
    const normalized = {
      id: effort.id,
      name: name2,
      ...typeof effort.description === "string" ? { description: effort.description } : {}
    };
    efforts.push(normalized);
    seen.add(effort.id);
  }
  if (efforts.length === 0) return void 0;
  const defaultEffort = typeof reasoning.defaultEffort === "string" && seen.has(reasoning.defaultEffort) ? reasoning.defaultEffort : void 0;
  return {
    efforts,
    ...defaultEffort === void 0 ? {} : { defaultEffort }
  };
}
function providerCatalogModels(providerId, catalog) {
  if (!Array.isArray(catalog?.models)) return [];
  const seen = /* @__PURE__ */ new Set();
  return catalog.models.filter((model) => {
    if (!model || typeof model.id !== "string" || model.id.length === 0 || seen.has(model.id)) return false;
    seen.add(model.id);
    return true;
  }).map((model) => {
    const reasoning = normalizeDshReasoning(model.reasoning);
    return {
      provider: providerId,
      id: model.id,
      name: typeof model.name === "string" && model.name.length > 0 ? model.name : model.id,
      description: modelDescription(model),
      ...Array.isArray(model.inputModalities) ? { inputModalities: [...model.inputModalities] } : {},
      ...Number.isInteger(model.contextWindow) ? { context: { contextWindow: model.contextWindow } } : {},
      ...Number.isInteger(model.maxTokens) ? { defaultMaxTokens: model.maxTokens } : {},
      ...reasoning ? { reasoning } : {}
    };
  });
}
function manifestFor(runtime, providerId) {
  return runtime.listProviderManifests?.().find((manifest) => manifest.id === providerId) ?? null;
}
function providerHasConnectedAccount(runtime, providerId) {
  if (typeof runtime.snapshot !== "function") return true;
  const snapshot = runtime.snapshot();
  if (!Array.isArray(snapshot?.providers)) return true;
  const provider = snapshot.providers.find((entry) => entry?.providerId === providerId);
  return Array.isArray(provider?.accounts) && provider.accounts.length > 0;
}
function requestHasImage(value) {
  if (Array.isArray(value)) return value.some((item) => requestHasImage(item));
  if (!value || typeof value !== "object") return false;
  if (value.type === "image") return true;
  return Object.values(value).some((item) => requestHasImage(item));
}
function requestHasImageInCurrentTurn(request = {}) {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  if (messages.length > 0) {
    const current = messages.at(-1)?.role === "user" ? messages.at(-1) : [...messages].reverse().find((message) => message?.role === "user") ?? messages.at(-1);
    return requestHasImage(current?.content ?? current?.text);
  }
  return requestHasImage(request.input);
}
function unsupportedContentError(message) {
  const error = new ValidationError(message);
  error.code = "UNSUPPORTED_CONTENT";
  return error;
}
function createDockyardLlmAdapter({ runtime, providerIds, attachmentsResolver = null } = {}) {
  if (!runtime) throw new ValidationError("Dockyard runtime is required");
  const owned = [...providerIds ?? runtime.listProviderIds?.() ?? []];
  if (owned.length === 0) throw new ValidationError("At least one Dockyard provider is required");
  const catalogPromises = /* @__PURE__ */ new Map();
  async function ensureRuntimeReady() {
    if (typeof runtime.init === "function") await runtime.init();
  }
  async function providerCatalog(provider) {
    const existing = catalogPromises.get(provider);
    if (existing) return existing;
    const promise = Promise.resolve().then(() => runtime.getCatalog(provider)).finally(() => {
      if (catalogPromises.get(provider) === promise) catalogPromises.delete(provider);
    });
    catalogPromises.set(provider, promise);
    return promise;
  }
  return {
    providerInfo(provider) {
      const manifest = manifestFor(runtime, provider);
      return { id: provider, name: manifest?.displayName ?? provider };
    },
    providerRetryPolicy() {
      return void 0;
    },
    async listModels(provider) {
      await ensureRuntimeReady();
      if (!providerHasConnectedAccount(runtime, provider)) return [];
      const catalog = await providerCatalog(provider);
      return providerCatalogModels(provider, catalog);
    },
    async resolveModel(provider, model) {
      await ensureRuntimeReady();
      if (!providerHasConnectedAccount(runtime, provider)) return { provider, id: model, name: model };
      const catalog = await providerCatalog(provider);
      return providerCatalogModels(provider, catalog).find((entry) => entry.id === model) ?? { provider, id: model, name: model };
    },
    async *stream(options) {
      await ensureRuntimeReady();
      if (!providerHasConnectedAccount(runtime, options.provider)) {
        throw new ValidationError(`Provider ${options.provider} has no connected Dockyard account`);
      }
      const catalog = await providerCatalog(options.provider);
      const model = providerCatalogModels(options.provider, catalog).find((entry) => entry.id === options.model);
      if (requestHasImageInCurrentTurn(options) && Array.isArray(model?.inputModalities) && !model.inputModalities.includes("image")) {
        throw unsupportedContentError(
          `\u6A21\u578B ${model.name ?? model.id} \u7684\u5B9E\u65F6 provider catalog \u672A\u58F0\u660E\u56FE\u7247\u8F93\u5165\u80FD\u529B`
        );
      }
      const request = model ? {
        ...options,
        ...model.context ? { modelContext: { ...model.context } } : {},
        ...model.defaultMaxTokens !== void 0 ? { modelContext: { ...model.context ?? {}, maxTokens: model.defaultMaxTokens } } : {}
      } : options;
      const attachments = typeof attachmentsResolver === "function" ? attachmentsResolver() : void 0;
      const stream = await runtime.stream(options.provider, request, {
        accountId: options.accountId,
        requestId: options.requestId,
        sessionId: options.sessionId,
        ...attachments ? { attachments } : {}
      });
      for await (const chunk of stream) yield chunk;
    },
    providers() {
      return [...owned];
    }
  };
}

// packages/dsh-bridge/src/index.mjs
var DshInjectionBridge = class {
  #routes = /* @__PURE__ */ new Map();
  constructor({ runtime, adapter = null } = {}) {
    if (!runtime) throw new ValidationError("DSH runtime is required");
    this.runtime = runtime;
    this.adapter = adapter;
  }
  async mountProvider(providerModule, accountPool) {
    const providerId = providerModule?.manifest?.id;
    if (!providerId) throw new ValidationError("Provider module is required");
    if (!this.runtime.has(providerId)) await this.runtime.register(providerModule);
    const route = createProviderRoute({ providerModule, accountPool });
    this.#routes.set(providerId, route);
    if (this.adapter?.registerProviderRoute) {
      await this.adapter.registerProviderRoute(route, providerModule.manifest);
    }
    await this.runtime.events.emit("dsh/provider-mounted", {
      providerId,
      manifest: { ...providerModule.manifest }
    });
    return route;
  }
  async unmountProvider(providerId) {
    const route = this.#routes.get(providerId);
    if (!route) return false;
    if (this.adapter?.unregisterProviderRoute) await this.adapter.unregisterProviderRoute(providerId);
    this.#routes.delete(providerId);
    await this.runtime.events.emit("dsh/provider-unmounted", { providerId });
    return true;
  }
  getRoute(providerId) {
    return this.#routes.get(providerId) ?? null;
  }
  listRoutes() {
    return [...this.#routes.keys()];
  }
};

// packages/vault/src/index.mjs
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var KEYCHAIN_SERVICE = "com.dockyard-dsh.credentials";
var SWIFT_BIN = "/usr/bin/swift";
var KEYCHAIN_HELPER = join(dirname(fileURLToPath(import.meta.url)), "macos-keychain-helper.swift");
function stableKey(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
function runKeychainHelper(request, { timeoutMs = 3e4 } = {}) {
  return new Promise((resolve2, reject) => {
    let settled = false;
    let timer;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const child = spawn(SWIFT_BIN, [KEYCHAIN_HELPER], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    const stdout = [];
    let exitError = "";
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => {
      exitError += chunk.toString();
    });
    child.on("error", (error) => finish(reject, error));
    child.on("close", (code) => {
      if (settled) return;
      if (code === 0) {
        try {
          finish(resolve2, JSON.parse(Buffer.concat(stdout).toString("utf8")));
        } catch {
          finish(reject, new Error("macOS Keychain helper returned invalid data"));
        }
        return;
      }
      const error = new Error("macOS Keychain operation failed");
      error.code = code;
      error.detail = exitError.replace(/\s+/g, " ").trim().slice(0, 300);
      finish(reject, error);
    });
    timer = setTimeout(() => {
      child.kill("SIGTERM");
      const error = new Error("macOS Keychain operation timed out");
      error.code = "ETIMEDOUT";
      finish(reject, error);
    }, timeoutMs);
    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}
function createCredentialRef(providerId, accountId) {
  return `keychain://dockyard-dsh/${stableKey(`${providerId}:${accountId}`)}`;
}
var UnavailableSecretStore = class {
  constructor({ platform = process.platform } = {}) {
    this.platform = platform;
  }
  async read() {
    return null;
  }
  async write() {
    throw new Error(`Secure credential storage is unavailable on ${this.platform}; configure the host credential service`);
  }
  async delete() {
  }
};
var MacOSKeychainStore = class {
  constructor({ service = KEYCHAIN_SERVICE } = {}) {
    this.service = service;
  }
  async read(ref) {
    try {
      const output = await runKeychainHelper({ operation: "read", service: this.service, account: ref, value: null });
      return output.found ? JSON.parse(output.value) : null;
    } catch (error) {
      throw error;
    }
  }
  async write(ref, value) {
    await runKeychainHelper({
      operation: "write",
      service: this.service,
      account: ref,
      value: JSON.stringify(value)
    });
    return ref;
  }
  async delete(ref) {
    await runKeychainHelper({ operation: "delete", service: this.service, account: ref, value: null });
  }
};
function createDefaultSecretStore({ platform = process.platform } = {}) {
  if (platform !== "darwin") return new UnavailableSecretStore({ platform });
  return new MacOSKeychainStore();
}
var secretStoreConstants = Object.freeze({
  keychainService: KEYCHAIN_SERVICE
});

// packages/runtime/src/state-store.mjs
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname as dirname2, join as join2 } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
function defaultDockyardHome({ env = process.env, home = homedir() } = {}) {
  return env.DOCKYARD_DSH_HOME || join2(home, ".dockyard-dsh");
}
function defaultDockyardStatePath(options = {}) {
  return join2(defaultDockyardHome(options), "state.json");
}
function emptyState() {
  return {
    schema: 1,
    pools: {},
    updatedAt: null
  };
}
var JsonStateStore = class {
  constructor({ filePath, home, env } = {}) {
    this.filePath = filePath ?? defaultDockyardStatePath({ home, env });
  }
  async load() {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        ...emptyState(),
        ...parsed,
        pools: parsed?.pools && typeof parsed.pools === "object" ? parsed.pools : {}
      };
    } catch (error) {
      if (error?.code === "ENOENT") return emptyState();
      throw error;
    }
  }
  async save(state) {
    const next = {
      ...emptyState(),
      ...state,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await mkdir(dirname2(this.filePath), { recursive: true, mode: 448 });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}
`, { mode: 384 });
    await rename(tempPath, this.filePath);
    return next;
  }
};

// modules/provider-codex/src/driver.mjs
import { createHash as createHash2 } from "node:crypto";
import { homedir as homedir2 } from "node:os";
import { join as join4 } from "node:path";

// packages/oauth/src/cli-oauth-authorizer.mjs
import { randomUUID as randomUUID2 } from "node:crypto";
import { mkdir as mkdir2, mkdtemp, readFile as readFile3, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as join3 } from "node:path";
import { spawn as spawn2 } from "node:child_process";

// packages/providers/src/provider-utils.mjs
import { readFile as readFile2 } from "node:fs/promises";
async function readJsonFile(path) {
  try {
    return JSON.parse(await readFile2(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
function decodeJwtPayload(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
function isoFromEpoch(value) {
  if (value === void 0 || value === null || value === "") return null;
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric < 1e10 ? numeric * 1e3 : numeric) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function addSecondsIso(seconds, now = /* @__PURE__ */ new Date()) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) return null;
  return new Date(now.getTime() + numeric * 1e3).toISOString();
}
function finiteNumber(value) {
  if (value === void 0 || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
function stringValue(value) {
  return value === void 0 || value === null || value === "" ? null : String(value);
}
async function fetchJson(url, init = {}, { timeoutMs = 2e4, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init?.signal;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) controller.abort(externalSignal.reason);
  else externalSignal?.addEventListener?.("abort", abortFromCaller, { once: true });
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const text2 = await response.text();
    let body = null;
    try {
      body = text2 ? JSON.parse(text2) : null;
    } catch {
      body = null;
    }
    if (!response.ok) {
      const error = new Error(`Provider request failed (${response.status})`);
      error.status = response.status;
      error.bodyKeys = body && typeof body === "object" ? Object.keys(body) : [];
      throw error;
    }
    return { body, response };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener?.("abort", abortFromCaller);
  }
}
function redactError(error) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  const detail = error?.detail ? ` ${String(error.detail)}` : "";
  const code = error?.code !== void 0 && error?.code !== null ? ` [code ${String(error.code)}]` : "";
  return `${message}${detail}${code}`.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]").replace(/(access|refresh|id)[_-]?token["'=:\s]+[^,\s}]+/gi, "$1_token=[redacted]").slice(0, 300);
}
function recursiveQuotaWindows(value, { source, now = /* @__PURE__ */ new Date(), prefix = "quota" } = {}) {
  const windows = [];
  function visit(node, path, label) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const usedPercent = finiteNumber(node.used_percent ?? node.usedPercent);
    const remainingFraction = finiteNumber(node.remaining_fraction ?? node.remainingFraction);
    const remainingValue = finiteNumber(node.remaining);
    const limitValue = finiteNumber(node.limit);
    const resetAt = isoFromEpoch(node.reset_at ?? node.resetAt) ?? addSecondsIso(node.reset_after_seconds ?? node.resetAfterSeconds, now);
    const hasQuotaShape = usedPercent !== null || remainingFraction !== null || remainingValue !== null || limitValue !== null;
    if (hasQuotaShape) {
      let remaining = remainingValue;
      let limit = limitValue;
      let unit = stringValue(node.unit);
      if (remaining === null && remainingFraction !== null) {
        remaining = remainingFraction;
        limit = limit ?? 1;
        unit = unit ?? "fraction";
      } else if (remaining === null && usedPercent !== null) {
        remaining = Math.max(0, 100 - usedPercent);
        limit = limit ?? 100;
        unit = unit ?? "percent";
      }
      windows.push({
        id: path || prefix,
        name: label || path || prefix,
        remaining,
        limit,
        unit,
        resetAt,
        source
      });
    }
    for (const [key, child] of Object.entries(node)) {
      if (child && typeof child === "object" && !Array.isArray(child)) {
        visit(child, path ? `${path}.${key}` : key, key);
      }
    }
  }
  visit(value, "", prefix);
  const unique = /* @__PURE__ */ new Map();
  for (const window of windows) unique.set(window.id, window);
  return [...unique.values()];
}
function selectPrimaryQuotaWindow(windows) {
  if (!windows?.length) return {};
  const preferred = windows.find((window) => /primary|weekly|five.?hour|5h/i.test(`${window.id} ${window.name}`));
  return preferred ?? windows[0];
}

// packages/oauth/src/cli-oauth-authorizer.mjs
var URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;
var DEFAULT_TIMEOUT_MS = 10 * 60 * 1e3;
var CHILD_STOP_GRACE_MS = 2e3;
function cleanUrl(value) {
  return String(value ?? "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/[\u0000-\u001f\u007f].*$/, "").replace(/[),.;]+$/, "");
}
function publicSession(session) {
  return {
    sessionId: session.sessionId,
    providerId: session.providerId,
    status: session.status ?? (session.exitCode === null ? "pending" : "processing"),
    authorizationUrl: session.authorizationUrl,
    instructions: session.instructions,
    startedAt: session.startedAt,
    diagnostic: session.diagnostic ?? null,
    ...session.browserOpened ? { browserOpened: true } : {}
  };
}
function stopChild(session) {
  const child = session.child;
  if (!child || session.exitCode !== null) return Promise.resolve();
  return new Promise((resolve2) => {
    let settled = false;
    let timer;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (session.exitCode === null) session.exitCode = -1;
      resolve2();
    };
    child.once("close", finish);
    if (session.exitCode !== null) {
      finish();
      return;
    }
    try {
      child.kill("SIGTERM");
    } catch {
      finish();
      return;
    }
    timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
      }
      finish();
    }, CHILD_STOP_GRACE_MS);
    timer.unref?.();
  });
}
function createCliOAuthAuthorizer({
  providerId,
  cliPath,
  loginArgs,
  environmentKey,
  authFileName = "auth.json",
  environment = process.env,
  profilePrefix = `dockyard-${providerId ?? "provider"}-oauth-`,
  instructions = "\u8BF7\u5728\u5B98\u65B9\u6388\u6743\u9875\u9762\u5B8C\u6210\u767B\u5F55\uFF0C\u5B8C\u6210\u540E\u56DE\u5230 Dockyard DSH\u3002",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  importCredentials,
  profileDirectory = null,
  browserOpened = false
} = {}) {
  if (!providerId) throw new Error("CLI OAuth authorizer requires providerId");
  if (!cliPath) throw new Error(`CLI OAuth authorizer requires a ${providerId} CLI path`);
  if (!Array.isArray(loginArgs) || loginArgs.length === 0) {
    throw new Error(`CLI OAuth authorizer requires login arguments for ${providerId}`);
  }
  if (!environmentKey) throw new Error(`CLI OAuth authorizer requires an environment key for ${providerId}`);
  if (typeof importCredentials !== "function") {
    throw new Error(`CLI OAuth authorizer requires an import callback for ${providerId}`);
  }
  const sessions = /* @__PURE__ */ new Map();
  async function cleanup(session) {
    if (session.cleanupProfile && session.profileDir) {
      await rm(session.profileDir, { recursive: true, force: true }).catch(() => {
      });
      session.profileDir = null;
    }
  }
  function captureOutput(session, chunk) {
    const text2 = String(chunk ?? "");
    session.output = `${session.output}${text2}`.slice(-32e3);
    if (!session.authorizationUrl) {
      const match = session.output.match(URL_PATTERN);
      if (match?.[0]) session.authorizationUrl = cleanUrl(match[0]);
    }
  }
  async function finalize(session, context) {
    if (session.result) return session.result;
    if (session.finalizing) return session.finalizing;
    session.finalizing = (async () => {
      try {
        if (session.timedOut) {
          session.status = "failed";
          session.diagnostic = "\u5B98\u65B9 OAuth \u767B\u5F55\u8D85\u65F6\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7\u3002";
          return publicSession(session);
        }
        if (session.launchError) {
          session.status = "failed";
          session.diagnostic = `\u65E0\u6CD5\u542F\u52A8\u5B98\u65B9\u767B\u5F55\u547D\u4EE4\uFF1A${session.launchError}`;
          return publicSession(session);
        }
        if (session.exitCode !== 0) {
          session.status = "failed";
          session.diagnostic = `\u5B98\u65B9 OAuth \u767B\u5F55\u672A\u5B8C\u6210\uFF08\u9000\u51FA\u7801 ${session.exitCode ?? "unknown"}\uFF09\u3002`;
          return publicSession(session);
        }
        let raw;
        try {
          raw = JSON.parse(await readFile3(join3(session.profileDir, authFileName), "utf8"));
        } catch (error) {
          session.status = "failed";
          session.diagnostic = `\u5B98\u65B9\u767B\u5F55\u5B8C\u6210\uFF0C\u4F46\u6CA1\u6709\u627E\u5230\u53EF\u8BFB\u53D6\u7684 OAuth \u72B6\u6001\uFF1A${redactError(error)}`;
          return publicSession(session);
        }
        const accounts = await importCredentials(raw, context);
        if (!Array.isArray(accounts) || accounts.length === 0) {
          session.status = "failed";
          session.diagnostic = "\u5B98\u65B9\u767B\u5F55\u5B8C\u6210\uFF0C\u4F46 provider \u6CA1\u6709\u8FD4\u56DE\u53EF\u63A5\u5165\u7684\u8D26\u53F7\u3002";
          return publicSession(session);
        }
        session.status = "completed";
        session.result = {
          ...publicSession(session),
          accounts,
          diagnostic: null
        };
        return session.result;
      } catch (error) {
        session.status = "failed";
        session.diagnostic = redactError(error);
        return publicSession(session);
      } finally {
        await cleanup(session);
      }
    })();
    return session.finalizing;
  }
  async function begin() {
    const cleanupProfile = !profileDirectory;
    const profileDir = profileDirectory ?? await mkdtemp(join3(tmpdir(), profilePrefix));
    if (!cleanupProfile) await mkdir2(profileDir, { recursive: true });
    const session = {
      sessionId: `${providerId}:${randomUUID2()}`,
      providerId,
      profileDir,
      cleanupProfile,
      browserOpened,
      status: "pending",
      authorizationUrl: null,
      instructions,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exitCode: null,
      launchError: null,
      output: "",
      timedOut: false,
      child: null,
      timer: null,
      finalizing: null,
      result: null,
      diagnostic: null
    };
    sessions.set(session.sessionId, session);
    try {
      const child = spawn2(cliPath, loginArgs, {
        env: { ...environment, [environmentKey]: profileDir },
        stdio: ["ignore", "pipe", "pipe"]
      });
      session.child = child;
      child.stdout?.on("data", (chunk) => captureOutput(session, chunk));
      child.stderr?.on("data", (chunk) => captureOutput(session, chunk));
      child.once("error", (error) => {
        session.launchError = redactError(error);
        session.exitCode = -1;
      });
      child.once("close", (code) => {
        session.exitCode = typeof code === "number" ? code : -1;
      });
      session.timer = setTimeout(() => {
        if (session.exitCode !== null) return;
        session.timedOut = true;
        void stopChild(session);
      }, timeoutMs);
      session.timer.unref?.();
    } catch (error) {
      session.launchError = redactError(error);
      session.exitCode = -1;
    }
    return publicSession(session);
  }
  async function poll(sessionId, context) {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        providerId,
        status: "missing",
        instructions,
        diagnostic: "OAuth \u767B\u5F55\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u7ED3\u675F\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7\u3002"
      };
    }
    if (session.exitCode === null) return publicSession(session);
    if (session.timer) clearTimeout(session.timer);
    const result = await finalize(session, context);
    if (result.status !== "pending" && result.status !== "processing") sessions.delete(sessionId);
    return result;
  }
  async function cancel(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return { sessionId, providerId, status: "missing" };
    if (session.timer) clearTimeout(session.timer);
    await stopChild(session);
    await cleanup(session);
    sessions.delete(sessionId);
    return { sessionId, providerId, status: "cancelled" };
  }
  return Object.freeze({ begin, poll, cancel });
}
var cliOAuthAuthorizerConstants = Object.freeze({ defaultTimeoutMs: DEFAULT_TIMEOUT_MS });

// modules/provider-codex/src/driver.mjs
var PROVIDER_ID = "openai-codex";
var AUTH_BASE_URL = "https://auth.openai.com";
var DEFAULT_TOKEN_URL = `${AUTH_BASE_URL}/oauth/token`;
var DEFAULT_CODEX_BASE_URL = "https://chatgpt.com/backend-api";
var DEFAULT_USAGE_URLS = Object.freeze([
  "https://chatgpt.com/backend-api/wham/usage",
  "https://chatgpt.com/backend-api/codex/usage"
]);
var DEFAULT_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
var CREDENTIAL_SLOT = Symbol("dockyard-codex-credential");
function hash(value) {
  return createHash2("sha256").update(String(value)).digest("hex");
}
function codexAuthPath({ env = process.env, home = homedir2(), authFilePath } = {}) {
  if (authFilePath) return authFilePath;
  return join4(env.CODEX_HOME || join4(home, ".codex"), "auth.json");
}
function profileClaims(payload) {
  return payload?.["https://api.openai.com/profile"] ?? payload?.profile ?? {};
}
function authClaims(payload) {
  return payload?.["https://api.openai.com/auth"] ?? payload?.auth ?? {};
}
function normalizeTokens(raw) {
  const tokens = raw?.tokens ?? raw ?? {};
  const access2 = tokens.access_token ?? tokens.access;
  const refresh = tokens.refresh_token ?? tokens.refresh;
  const idToken = tokens.id_token ?? tokens.idToken ?? null;
  if (typeof access2 !== "string" || typeof refresh !== "string") return null;
  const accessPayload = decodeJwtPayload(access2) ?? {};
  const idPayload = decodeJwtPayload(idToken) ?? {};
  const auth = authClaims(accessPayload);
  const idAuth = authClaims(idPayload);
  const accountId = stringValue(
    tokens.account_id ?? tokens.accountId ?? auth.chatgpt_account_id ?? idAuth.chatgpt_account_id
  );
  if (!accountId) return null;
  const profile = { ...profileClaims(idPayload), ...profileClaims(accessPayload) };
  const expiresAt = isoFromEpoch(accessPayload.exp ?? idPayload.exp);
  return {
    access: access2,
    refresh,
    idToken,
    accountId,
    email: stringValue(tokens.email ?? profile.email),
    displayName: stringValue(tokens.name ?? profile.name),
    plan: stringValue(
      tokens.plan_type ?? auth.chatgpt_plan_type ?? idAuth.chatgpt_plan_type
    ),
    scopes: Array.isArray(tokens.scopes) ? tokens.scopes.map(String) : [],
    expiresAt,
    authFileLastRefresh: stringValue(raw?.last_refresh),
    accessPayload,
    idPayload
  };
}
function accountInput(tokens, credentialRef, now = /* @__PURE__ */ new Date()) {
  return {
    providerId: PROVIDER_ID,
    accountId: tokens.accountId,
    credentialRef,
    displayName: tokens.displayName,
    email: tokens.email,
    auth: {
      kind: "oauth",
      scopes: tokens.scopes
    },
    subscription: {
      plan: tokens.plan,
      status: null,
      expiresAt: null
    },
    refresh: {
      accessTokenExpiresAt: tokens.expiresAt,
      nextRefreshAt: null,
      lastRefreshedAt: tokens.authFileLastRefresh ?? now.toISOString(),
      refreshable: Boolean(tokens.refresh)
    }
  };
}
function attachCredential(candidate2, tokens) {
  Object.defineProperty(candidate2, CREDENTIAL_SLOT, {
    value: tokens,
    enumerable: false,
    configurable: false
  });
  return candidate2;
}
function summarizeCodexCandidate(candidate2) {
  return {
    providerId: PROVIDER_ID,
    candidateId: candidate2.candidateId,
    source: candidate2.source,
    accountId: candidate2.accountId,
    displayName: candidate2.displayName,
    email: candidate2.email,
    subscription: { ...candidate2.subscription },
    refresh: { ...candidate2.refresh },
    imported: Boolean(candidate2.imported),
    status: candidate2.status ?? "available",
    diagnostic: candidate2.diagnostic ?? null
  };
}
function candidateFromTokens(tokens, { source, imported = false, now = /* @__PURE__ */ new Date() } = {}) {
  const credentialRef = createCredentialRef(PROVIDER_ID, tokens.accountId);
  return attachCredential({
    candidateId: `codex:${hash(tokens.accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID,
    source,
    accountId: tokens.accountId,
    displayName: tokens.displayName ?? tokens.email ?? tokens.accountId,
    email: tokens.email,
    subscription: { plan: tokens.plan, status: null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: tokens.expiresAt,
      nextRefreshAt: null,
      lastRefreshedAt: tokens.authFileLastRefresh ?? now.toISOString(),
      refreshable: Boolean(tokens.refresh)
    },
    credentialRef,
    imported,
    status: "available"
  }, tokens);
}
function isExpiring(tokens, now, leewaySeconds) {
  if (!tokens.expiresAt) return true;
  return new Date(tokens.expiresAt).getTime() <= now.getTime() + leewaySeconds * 1e3;
}
var CodexOAuthDriver = class {
  constructor({
    authFilePath,
    env = process.env,
    home = homedir2(),
    tokenUrl = env.DOCKYARD_CODEX_TOKEN_URL || DEFAULT_TOKEN_URL,
    usageUrls = env.DOCKYARD_CODEX_USAGE_URL ? [env.DOCKYARD_CODEX_USAGE_URL] : [...DEFAULT_USAGE_URLS],
    clientId = env.DOCKYARD_CODEX_CLIENT_ID || DEFAULT_CLIENT_ID,
    fetchImpl = fetch,
    requestExecutor = null,
    catalogLoader = null,
    refreshLeewaySeconds = 60,
    oauthAuthorizer = null,
    cliPath = env.DOCKYARD_CODEX_CLI || "codex"
  } = {}) {
    this.authFilePath = codexAuthPath({ env, home, authFilePath });
    this.tokenUrl = tokenUrl;
    this.usageUrls = usageUrls;
    this.clientId = clientId;
    this.fetchImpl = fetchImpl;
    this.requestExecutor = requestExecutor;
    this.catalogLoader = catalogLoader;
    this.refreshLeewaySeconds = refreshLeewaySeconds;
    this.oauthAuthorizer = oauthAuthorizer ?? createCliOAuthAuthorizer({
      providerId: PROVIDER_ID,
      cliPath,
      loginArgs: ["login", "--device-auth"],
      environmentKey: "CODEX_HOME",
      instructions: "\u5DF2\u542F\u52A8\u5B98\u65B9 Codex OAuth \u767B\u5F55\u3002\u8BF7\u5728\u5B98\u65B9\u7F51\u9875\u5B8C\u6210\u767B\u5F55\uFF0C\u5B8C\u6210\u540E\u56DE\u5230 Dockyard DSH\u3002",
      importCredentials: (raw, context) => this.#importOAuthState(raw, context)
    });
  }
  async discover(context = {}) {
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
    const raw = await readJsonFile(this.authFilePath);
    if (!raw) {
      return {
        candidates: [],
        source: this.authFilePath,
        diagnostics: [`\u672A\u53D1\u73B0 Codex OAuth \u6587\u4EF6\uFF1A${this.authFilePath}`]
      };
    }
    const tokens = normalizeTokens(raw);
    if (!tokens) {
      return {
        candidates: [],
        source: this.authFilePath,
        diagnostics: ["Codex OAuth \u6587\u4EF6\u5B58\u5728\uFF0C\u4F46\u5B57\u6BB5\u4E0D\u5B8C\u6574\u6216\u65E0\u6CD5\u89E3\u6790\u8D26\u53F7\u8EAB\u4EFD"]
      };
    }
    const candidate2 = candidateFromTokens(tokens, { source: this.authFilePath, now });
    return {
      candidates: [candidate2],
      source: this.authFilePath,
      diagnostics: []
    };
  }
  async importAccount(candidate2, context = {}) {
    const tokens = candidate2?.[CREDENTIAL_SLOT];
    if (!tokens) throw new Error("Codex candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    const credentialRef = createCredentialRef(PROVIDER_ID, tokens.accountId);
    await context.secretStore.write(credentialRef, {
      type: "oauth",
      providerId: PROVIDER_ID,
      access: tokens.access,
      refresh: tokens.refresh,
      idToken: tokens.idToken,
      accountId: tokens.accountId,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes
    });
    return accountInput(tokens, credentialRef, context.now instanceof Date ? context.now : /* @__PURE__ */ new Date());
  }
  async importSource(source, context = {}) {
    let raw;
    try {
      raw = typeof source?.content === "string" ? JSON.parse(source.content) : source?.content;
    } catch {
      throw new Error("Codex OAuth source is not valid JSON");
    }
    return this.#importOAuthState(raw, context, source?.fileName || "user_selected_oauth.json");
  }
  async #importOAuthState(raw, context = {}, source = "official_codex_oauth") {
    const tokens = normalizeTokens(raw);
    if (!tokens) throw new Error("Codex OAuth state does not contain a complete account token set");
    const candidate2 = candidateFromTokens(tokens, {
      source,
      now: context.now instanceof Date ? context.now : /* @__PURE__ */ new Date()
    });
    return [await this.importAccount(candidate2, context)];
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
  async #readCredential(account, context) {
    if (!context.secretStore) throw new Error("A secure credential store is required");
    const credentialRef = account.auth?.credentialRef ?? account.credentialRef;
    const stored = await context.secretStore.read(credentialRef);
    if (!stored?.access || !stored?.refresh) {
      const error = new Error("Codex credential is missing from secure storage");
      error.authExpired = true;
      throw error;
    }
    return {
      ...stored,
      accountId: stored.accountId ?? account.accountId,
      expiresAt: stored.expiresAt ?? account.refresh.accessTokenExpiresAt
    };
  }
  async #refreshCredential(credential, context) {
    const response = await fetchJson(this.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credential.refresh,
        client_id: this.clientId
      }),
      ...context.signal ? { signal: context.signal } : {}
    }, { fetchImpl: this.fetchImpl });
    const body = response.body ?? {};
    if (!body.access_token || !body.refresh_token || !Number.isFinite(Number(body.expires_in))) {
      throw new Error("Codex OAuth refresh response is incomplete");
    }
    const payload = decodeJwtPayload(body.access_token) ?? {};
    const auth = authClaims(payload);
    const accountId = stringValue(auth.chatgpt_account_id) ?? credential.accountId;
    return {
      ...credential,
      type: "oauth",
      access: body.access_token,
      refresh: body.refresh_token,
      idToken: body.id_token ?? credential.idToken ?? null,
      accountId,
      expiresAt: addSecondsIso(body.expires_in, context.now instanceof Date ? context.now : /* @__PURE__ */ new Date()),
      lastRefreshedAt: (context.now instanceof Date ? context.now : /* @__PURE__ */ new Date()).toISOString()
    };
  }
  async #liveCredential(account, context = {}, { force = false } = {}) {
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
    let credential = await this.#readCredential(account, context);
    if (credential.refresh && (force || isExpiring(credential, now, this.refreshLeewaySeconds))) {
      try {
        credential = await this.#refreshCredential(credential, context);
        await context.secretStore.write(account.auth?.credentialRef ?? account.credentialRef, credential);
      } catch (error) {
        const wrapped = new Error(`Codex OAuth refresh failed: ${redactError(error)}`);
        wrapped.authForbidden = error?.status === 403;
        wrapped.authExpired = error?.status === 400 || error?.status === 401;
        throw wrapped;
      }
    }
    return credential;
  }
  async refreshAccount(account, context = {}) {
    const credential = await this.#liveCredential(account, context, { force: Boolean(context.force) });
    return {
      refresh: {
        accessTokenExpiresAt: credential.expiresAt ?? null,
        nextRefreshAt: null,
        lastRefreshedAt: credential.lastRefreshedAt ?? account.refresh.lastRefreshedAt,
        refreshable: Boolean(credential.refresh)
      }
    };
  }
  async getQuota(account, context = {}) {
    const credential = await this.#liveCredential(account, context);
    let lastError = null;
    let sawAuthExpired = false;
    let sawAuthForbidden = false;
    for (const url of this.usageUrls) {
      try {
        const response = await fetchJson(url, {
          headers: {
            authorization: `Bearer ${credential.access}`,
            "chatgpt-account-id": credential.accountId ?? account.accountId
          },
          ...context.signal ? { signal: context.signal } : {}
        }, { fetchImpl: this.fetchImpl });
        const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
        const windows = recursiveQuotaWindows(response.body, {
          source: "codex_usage",
          now,
          prefix: "rate_limit"
        });
        const primary = selectPrimaryQuotaWindow(windows);
        return {
          quota: {
            ...primary,
            windows,
            updatedAt: now.toISOString(),
            source: "codex_usage"
          },
          subscription: {
            plan: stringValue(response.body?.plan_type),
            status: stringValue(response.body?.subscription_status),
            expiresAt: null
          },
          identity: {
            accountId: stringValue(response.body?.account_id) ?? account.accountId,
            email: stringValue(response.body?.email) ?? account.email
          },
          refresh: {
            accessTokenExpiresAt: credential.expiresAt ?? account.refresh.accessTokenExpiresAt,
            lastRefreshedAt: credential.lastRefreshedAt ?? account.refresh.lastRefreshedAt,
            refreshable: Boolean(credential.refresh)
          }
        };
      } catch (error) {
        lastError = error;
        sawAuthExpired ||= error?.status === 401;
        sawAuthForbidden ||= error?.status === 403;
      }
    }
    const wrapped = new Error(sawAuthExpired ? "Codex OAuth credential rejected (401); reauthorization required" : `Codex quota request failed: ${redactError(lastError)}`);
    wrapped.rateLimited = lastError?.status === 429;
    wrapped.authExpired = sawAuthExpired;
    wrapped.authForbidden = !sawAuthExpired && sawAuthForbidden;
    throw wrapped;
  }
  async getCatalog() {
    if (this.catalogLoader) {
      try {
        const catalog = await this.catalogLoader();
        if (Array.isArray(catalog?.models) && catalog.models.length > 0) return catalog;
      } catch {
      }
    }
    return {
      models: [],
      source: "no_live_catalog_endpoint",
      diagnostic: "Codex model identifiers are accepted from the active DSH configuration; this module does not invent a model list."
    };
  }
  async invoke(request, invocation, context = {}) {
    const credential = await this.#liveCredential(invocation.account, context);
    const executor = context.requestExecutor ?? this.requestExecutor ?? nativeCodexExecutor;
    return executor({ request, invocation, credential, context });
  }
  async stream(request, invocation, context = {}) {
    return this.invoke(request, invocation, context);
  }
};
function createCodexPiAiExecutor({
  PiAiAdapter,
  createProvider,
  openAICodexResponsesApi,
  modelResolver = null
}) {
  if (!PiAiAdapter || !createProvider || !openAICodexResponsesApi) {
    throw new Error("Codex DSH transport dependencies are incomplete");
  }
  return async function executeCodex({ request, credential, context = {} }) {
    const modelId = String(request.model);
    const requestedEffort = typeof request.reasoningEffort === "string" ? request.reasoningEffort : void 0;
    const catalogModel2 = typeof modelResolver === "function" ? modelResolver(modelId) : null;
    const contextWindow = catalogModel2?.contextWindow;
    const maxTokens = catalogModel2?.maxTokens;
    if (!Number.isInteger(contextWindow) || contextWindow <= 0 || !Number.isInteger(maxTokens) || maxTokens <= 0) {
      throw new Error(`Codex live model catalog did not return context/output capacities for "${modelId}"`);
    }
    const thinkingLevelMap = catalogModel2?.thinkingLevelMap;
    const model = {
      id: modelId,
      name: typeof catalogModel2?.name === "string" && catalogModel2.name.length > 0 ? catalogModel2.name : modelId,
      api: "openai-codex-responses",
      provider: PROVIDER_ID,
      baseUrl: DEFAULT_CODEX_BASE_URL,
      reasoning: typeof catalogModel2?.reasoning === "boolean" ? catalogModel2.reasoning : requestedEffort !== void 0,
      ...thinkingLevelMap ? { thinkingLevelMap: { ...thinkingLevelMap } } : {},
      input: Array.isArray(catalogModel2?.input) && catalogModel2.input.length > 0 ? [...catalogModel2.input] : ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow,
      maxTokens
    };
    const provider = createProvider({
      id: PROVIDER_ID,
      name: "OpenAI Codex",
      baseUrl: DEFAULT_CODEX_BASE_URL,
      auth: {
        apiKey: {
          name: "Dockyard DSH OAuth",
          resolve: ({ credential: supplied }) => ({
            auth: { apiKey: supplied?.key },
            source: "Dockyard DSH OAuth"
          })
        }
      },
      models: [model],
      api: openAICodexResponsesApi()
    });
    const profile = {
      provider: PROVIDER_ID,
      displayName: "OpenAI Codex",
      piProvider: provider,
      configuredMaxTokens: /* @__PURE__ */ new Map(),
      streamIdleTimeoutMs: 3e5
    };
    const adapter = new PiAiAdapter({
      profiles: () => /* @__PURE__ */ new Map([[PROVIDER_ID, profile]]),
      resolveApiKey: async () => credential.access,
      // DSH's durable attachment store is required for image input. Keep the
      // resolver lazy so text-only requests remain compatible with standalone
      // Codex driver callers and tests that do not mount attachments.
      resolveAttachments: () => context.attachments
    });
    return adapter.stream(request);
  };
}
async function nativeCodexExecutor(envelope2) {
  try {
    const [{ PiAiAdapter }, { createProvider }, { openAICodexResponsesApi }] = await Promise.all([
      import("@deepseek-ai/dsh-llm-pi-ai"),
      import("@earendil-works/pi-ai"),
      import("@earendil-works/pi-ai/api/openai-codex-responses.lazy")
    ]);
    return createCodexPiAiExecutor({ PiAiAdapter, createProvider, openAICodexResponsesApi })(envelope2);
  } catch (error) {
    throw new Error(`Codex DSH transport dependencies are unavailable: ${redactError(error)}`);
  }
}
function createCodexDriver(options = {}) {
  return new CodexOAuthDriver(options);
}
var codexDriverConstants = Object.freeze({
  providerId: PROVIDER_ID,
  defaultUsageUrls: DEFAULT_USAGE_URLS,
  defaultBaseUrl: DEFAULT_CODEX_BASE_URL
});

// modules/provider-codex/src/index.mjs
function createCodexModule({ driver = {} } = {}) {
  return defineProviderModule({
    id: "openai-codex",
    displayName: "Codex",
    capabilities: [
      "oauth_discovery",
      "oauth_import",
      "oauth_authorization",
      "oauth_refresh",
      "quota",
      "catalog",
      "invoke",
      "stream"
    ],
    driver
  });
}

// modules/provider-antigravity/src/driver.mjs
import { spawn as spawn4 } from "node:child_process";
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";
import { mkdtemp as mkdtemp2, rm as rm2 } from "node:fs/promises";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join6 } from "node:path";

// packages/providers/src/cli-agent-transport.mjs
import { spawn as spawn3 } from "node:child_process";
function cliFailure(code, signal, output, errorOutput, providerId) {
  const error = new Error(`${providerId ?? "provider"} CLI failed (${signal ?? code})`);
  error.code = code;
  error.detail = String(errorOutput || output || "").replace(/\s+/g, " ").trim().slice(0, 500);
  return error;
}
function parseJsonOutput(output) {
  if (output && typeof output === "object") return output;
  try {
    return JSON.parse(String(output));
  } catch {
    for (const line of String(output ?? "").split(/\r?\n/).reverse()) {
      if (!line.trim()) continue;
      try {
        return JSON.parse(line);
      } catch {
      }
    }
    return null;
  }
}
function runCliCommand(command, args, {
  env = process.env,
  cwd,
  timeoutMs = 3e4,
  signal,
  providerId
} = {}) {
  return new Promise((resolve2, reject) => {
    const child = spawn3(command, args, {
      env,
      ...cwd ? { cwd } : {},
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...signal ? { signal } : {}
    });
    const stdout = [];
    const stderr = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, closeSignal) => {
      clearTimeout(timer);
      const output = Buffer.concat(stdout).toString("utf8");
      const errorOutput = Buffer.concat(stderr).toString("utf8");
      if (code === 0) {
        resolve2({ output, errorOutput });
        return;
      }
      reject(cliFailure(code, timedOut ? "SIGTERM" : closeSignal, output, errorOutput, providerId));
    });
  });
}
var cliAgentTransportConstants = Object.freeze({
  defaultOutputFormat: "stream-json"
});

// modules/provider-antigravity/src/native-transport.mjs
import { readFileSync } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { join as join5 } from "node:path";
import { execFileSync } from "node:child_process";

// packages/providers/src/native-transport.mjs
function numericStatus(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function isLoopbackHostname(hostname) {
  const normalized = String(hostname ?? "").toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}
function validateNativeEndpoint(value, { providerId = "provider" } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${providerId} endpoint is required`);
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${providerId} endpoint is invalid`);
  }
  if (url.username || url.password) {
    throw new Error(`${providerId} endpoint must not include embedded credentials`);
  }
  if (url.hash) {
    throw new Error(`${providerId} endpoint must not include a URL fragment`);
  }
  const localHttp = url.protocol === "http:" && isLoopbackHostname(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error(`${providerId} endpoint must use HTTPS; HTTP is only allowed for loopback development`);
  }
  return url.toString();
}
function diagnosticText(value) {
  if (typeof value === "string") return value;
  if (value === void 0 || value === null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function errorDetails(value) {
  if (value === void 0 || value === null) return {};
  if (typeof value === "string") {
    const text2 = value.replace(/\s+/g, " ").trim();
    if (!text2) return {};
    try {
      return errorDetails(JSON.parse(value));
    } catch {
      return { message: text2 };
    }
  }
  if (typeof value !== "object") return { message: String(value) };
  const nested = value.error;
  const nestedObject = nested && typeof nested === "object" ? nested : null;
  const message = [
    nestedObject?.message,
    typeof nested === "string" ? nested : null,
    value.message,
    nestedObject?.status,
    value.status
  ].find((candidate2) => typeof candidate2 === "string" && candidate2.trim().length > 0);
  const code = [
    nestedObject?.code,
    value.code,
    nestedObject?.status,
    value.status
  ].find((candidate2) => candidate2 !== void 0 && candidate2 !== null && candidate2 !== "");
  const status = [nestedObject?.status, value.status].find((candidate2) => candidate2 !== void 0 && candidate2 !== null && candidate2 !== "");
  return {
    ...message ? { message: String(message).replace(/\s+/g, " ").trim().slice(0, 500) } : {},
    ...code !== void 0 ? { code } : {},
    ...status !== void 0 ? { status } : {}
  };
}
function isAuthenticationFailure(message, body) {
  const text2 = `${diagnosticText(message)} ${diagnosticText(body)}`.toLowerCase().replace(/[_-]+/g, " ");
  return [
    /access token.{0,80}(?:could not be validated|invalid|expired|revok|not valid|unauthor)/,
    /(?:invalid|expired|revok|unauthor|not valid).{0,80}(?:access token|token|credential)/,
    /\b(?:unauthorized|authentication failed|login required)\b/,
    /\bcredentials?\b.{0,50}\b(?:invalid|expired|missing|unavailable)\b/
  ].some((pattern) => pattern.test(text2));
}
function nativeProviderError(providerId, message, { status, body, code } = {}) {
  const bodyDetails = errorDetails(body);
  const messageDetails = errorDetails(message);
  const resolvedMessage = messageDetails.message ?? bodyDetails.message ?? (message ? String(message) : null);
  const resolvedCode = code ?? messageDetails.code ?? bodyDetails.code;
  const upstreamStatus = messageDetails.status ?? bodyDetails.status;
  const statusCode = numericStatus(status);
  const codeText = String(upstreamStatus ?? resolvedCode ?? "").toUpperCase();
  const exhaustionText = `${resolvedMessage ?? ""} ${diagnosticText(body)} ${diagnosticText(upstreamStatus)} ${diagnosticText(resolvedCode)}`.toLowerCase();
  const quotaExhausted = codeText === "RESOURCE_EXHAUSTED" || /\bresources?\b[\s\S]{0,80}\bexhausted\b/.test(exhaustionText) || /\bquota\b[\s\S]{0,80}\b(?:exhausted|depleted|exceeded)\b/.test(exhaustionText) || /\bcapacity\b[\s\S]{0,80}\bexhausted\b/.test(exhaustionText);
  const rateLimited = statusCode === 429 || numericStatus(resolvedCode) === 429 || numericStatus(upstreamStatus) === 429 || codeText === "RESOURCE_EXHAUSTED" || codeText === "RATE_LIMITED" || quotaExhausted;
  const displayMessage = quotaExhausted ? "\u989D\u5EA6\u6216\u4E0A\u6E38\u8D44\u6E90\u5DF2\u8017\u5C3D\uFF0C\u8BF7\u5237\u65B0\u989D\u5EA6\u3001\u5207\u6362\u8D26\u53F7\u6216\u7A0D\u540E\u91CD\u8BD5" : rateLimited ? "\u8BF7\u6C42\u9891\u7387\u53D7\u9650\uFF0C\u8BF7\u5207\u6362\u8D26\u53F7\u6216\u7A0D\u540E\u91CD\u8BD5" : resolvedMessage;
  const error = new Error(`${providerId ?? "provider"} native request failed${displayMessage ? `: ${displayMessage}` : ""}`);
  error.providerId = providerId ?? null;
  if (status !== void 0 && status !== null) error.status = status;
  if (resolvedCode !== void 0 && resolvedCode !== null) {
    error.code = resolvedCode;
    error.upstreamCode = resolvedCode;
  }
  if (resolvedMessage) error.upstreamMessage = resolvedMessage;
  if (upstreamStatus !== void 0 && upstreamStatus !== null) error.upstreamStatus = upstreamStatus;
  error.authExpired = statusCode === 401 || isAuthenticationFailure(resolvedMessage, body);
  error.authForbidden = !error.authExpired && statusCode === 403;
  error.quotaExhausted = quotaExhausted;
  error.rateLimited = rateLimited;
  if (body !== void 0) error.body = body;
  return error;
}
async function fetchNativeResponse(url, init = {}, {
  providerId,
  timeoutMs = 3e5,
  fetchImpl = fetch
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const upstreamSignal = init.signal;
  const abort = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal) {
    if (upstreamSignal.aborted) abort();
    else upstreamSignal.addEventListener("abort", abort, { once: true });
  }
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    if (response.ok === false || response.status !== void 0 && response.status >= 400) {
      let body = null;
      try {
        body = await response.text();
      } catch {
      }
      const details = errorDetails(body);
      throw nativeProviderError(providerId, details.message, {
        status: response.status,
        body,
        code: details.code
      });
    }
    return response;
  } catch (error) {
    if (error?.name === "AbortError" && !error.providerId) {
      const timeout = nativeProviderError(providerId, "request timed out");
      timeout.code = "ETIMEDOUT";
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    upstreamSignal?.removeEventListener?.("abort", abort);
  }
}
async function* responseChunks(response) {
  if (!response?.body) return;
  if (typeof response.body[Symbol.asyncIterator] === "function") {
    for await (const chunk of response.body) yield chunk;
    return;
  }
  const reader = response.body.getReader?.();
  if (!reader) return;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) return;
      yield next.value;
    }
  } finally {
    reader.releaseLock?.();
  }
}
function parseSseEvent(lines) {
  let event = "message";
  const data = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "event") event = value;
    if (field === "data") data.push(value);
  }
  if (data.length === 0) return null;
  const raw = data.join("\n");
  if (raw.trim() === "[DONE]") return { event, data: null, done: true };
  try {
    return { event, data: JSON.parse(raw), raw };
  } catch {
    return { event, data: raw, raw };
  }
}
async function* readSseEvents(response) {
  const decoder = new TextDecoder();
  let buffer = "";
  let lines = [];
  for await (const chunk of responseChunks(response)) {
    buffer += decoder.decode(chunk, { stream: true });
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      if (line !== "") {
        lines.push(line);
        continue;
      }
      const parsed2 = parseSseEvent(lines);
      lines = [];
      if (parsed2) {
        yield parsed2;
        if (parsed2.done) return;
      }
    }
  }
  buffer += decoder.decode();
  if (buffer) lines.push(buffer);
  const parsed = parseSseEvent(lines);
  if (parsed) yield parsed;
}
function normalizeUsage(value) {
  if (!value || typeof value !== "object") return null;
  const inputTokens = Number(value.input_tokens ?? value.inputTokens ?? value.prompt_tokens ?? value.promptTokens);
  const outputTokens = Number(value.output_tokens ?? value.outputTokens ?? value.completion_tokens ?? value.completionTokens);
  const totalTokens = Number(value.total_tokens ?? value.totalTokens);
  const cacheReadTokens = Number(value.cache_read_input_tokens ?? value.cacheReadInputTokens);
  const cacheWriteTokens = Number(value.cache_creation_input_tokens ?? value.cacheCreationInputTokens);
  const result = {};
  if (Number.isFinite(inputTokens)) result.inputTokens = inputTokens;
  if (Number.isFinite(outputTokens)) result.outputTokens = outputTokens;
  if (Number.isFinite(totalTokens)) result.totalTokens = totalTokens;
  if (Number.isFinite(cacheReadTokens)) result.cacheReadTokens = cacheReadTokens;
  if (Number.isFinite(cacheWriteTokens)) result.cacheWriteTokens = cacheWriteTokens;
  return Object.keys(result).length > 0 ? result : null;
}
function textFromContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => textFromContent(part)).filter(Boolean).join("");
  if (!content || typeof content !== "object") return "";
  if (content.type === "image") return "";
  if (content.type === "tool-result") {
    return textFromContent(content.content ?? content.output ?? content.result ?? content.text);
  }
  return content.text ?? content.value ?? content.content ?? content.delta ?? "";
}
function parseToolArguments(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || value.length === 0) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
function base64FromBytes(value) {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) return Buffer.from(value).toString("base64");
  return null;
}
function dataUrlParts(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/s);
  if (!match) return null;
  const mediaType = match[1] || "application/octet-stream";
  const encoded = match[0].includes(";base64,") ? match[2] : Buffer.from(decodeURIComponent(match[2]), "utf8").toString("base64");
  return { mediaType, data: encoded };
}
async function resolveImageData(content, attachments) {
  const direct = content?.data ?? content?.base64 ?? content?.source?.data;
  const directData = base64FromBytes(direct);
  if (directData) {
    return {
      mediaType: content.mediaType ?? content.mimeType ?? content.source?.media_type ?? "application/octet-stream",
      data: directData
    };
  }
  const dataUrl = dataUrlParts(content?.url ?? content?.source?.url);
  if (dataUrl) return dataUrl;
  const reference = content?.attachment ?? content?.ref ?? content?.source;
  if (!reference || !attachments?.readImage) return null;
  const image = await attachments.readImage(reference);
  const data = base64FromBytes(image?.data ?? image?.bytes ?? image?.base64);
  if (!data) return null;
  return {
    mediaType: content.mediaType ?? content.mimeType ?? image?.ref?.mediaType ?? image?.mediaType ?? "application/octet-stream",
    data
  };
}
function finishReason(value, fallback = "stop") {
  const reason = String(value ?? fallback).toLowerCase();
  if (reason.includes("tool") || reason === "function_call" || reason === "tool_use") {
    return { kind: "tool-calls" };
  }
  if (reason.includes("length") || reason.includes("max")) return { kind: "length" };
  if (reason.includes("error") || reason.includes("cancel")) return { kind: "error" };
  return { kind: "stop" };
}

// modules/provider-antigravity/src/native-transport.mjs
var PROVIDER_ID2 = "antigravity";
var DEFAULT_ENDPOINT = "https://daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse";
var DEFAULT_QUOTA_ENDPOINT = "https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary";
var ANTIGRAVITY_INFO_PATHS = [
  "/Applications/Antigravity.app/Contents/Info.plist",
  join5(homedir3(), "Applications/Antigravity.app/Contents/Info.plist")
];
function normalizeAntigravityClientVersion(value) {
  const version = String(value ?? "").trim();
  return /^\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?$/.test(version) ? version : null;
}
function detectAntigravityUserAgent() {
  for (const infoPath of ANTIGRAVITY_INFO_PATHS) {
    try {
      const version = normalizeAntigravityClientVersion(execFileSync(
        "/usr/libexec/PlistBuddy",
        ["-c", "Print :CFBundleShortVersionString", infoPath],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      ));
      if (version) return `antigravity/hub/${version} ${process.platform}/${process.arch}`;
    } catch {
    }
  }
  return null;
}
function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}
function tokenFromObject(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 5) return null;
  const direct = firstString(value.access_token, value.accessToken);
  if (direct) return direct;
  for (const child of Object.values(value)) {
    const token = tokenFromObject(child, depth + 1);
    if (token) return token;
  }
  return null;
}
function readOfficialTokenFile(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const token = tokenFromObject(parsed);
    return token ? { token, kind: "oauth" } : null;
  } catch {
    return null;
  }
}
function readAntigravityTokenFile({ env = process.env, home = homedir3() } = {}) {
  return readOfficialTokenFile(
    env.DOCKYARD_ANTIGRAVITY_TOKEN_FILE || join5(home, ".gemini", "antigravity-cli", "antigravity-oauth-token")
  );
}
function resolveAntigravityAccessToken({ credential, env = process.env, home = homedir3() } = {}) {
  const stored = firstString(credential?.access, credential?.token);
  if (stored) return { token: stored, kind: "oauth" };
  const fromCredentialObject = tokenFromObject(credential);
  if (fromCredentialObject) return { token: fromCredentialObject, kind: "oauth" };
  const fromEnv = firstString(env.DOCKYARD_ANTIGRAVITY_ACCESS_TOKEN, env.GEMINI_ACCESS_TOKEN);
  if (fromEnv) return { token: fromEnv, kind: "oauth" };
  return readAntigravityTokenFile({ env, home });
}
async function geminiParts(content, attachments) {
  const values = Array.isArray(content) ? content : [content];
  const parts = [];
  for (const part of values) {
    if (typeof part === "string") {
      if (part) parts.push({ text: part });
      continue;
    }
    if (!part || typeof part !== "object") continue;
    if (part.type === "image") {
      const image = await resolveImageData(part, attachments);
      if (!image) throw nativeProviderError(PROVIDER_ID2, "image attachment could not be resolved");
      parts.push({ inlineData: { mimeType: image.mediaType, data: image.data } });
      continue;
    }
    if (part.type === "tool-result" || part.type === "tool_result") {
      parts.push({ text: `[Tool Result ${part.toolCallId ?? part.id ?? ""}]
${textFromContent(part.content ?? part.output ?? part.result ?? part.text)}` });
      continue;
    }
    if (part.type === "tool-call" || part.type === "tool_call" || part.type === "function-call") {
      parts.push({ functionCall: { name: part.name ?? part.function?.name ?? "tool", args: parseToolArguments(part.arguments ?? part.input ?? part.function?.arguments) } });
      continue;
    }
    const text2 = textFromContent(part);
    if (text2) parts.push({ text: text2 });
  }
  return parts;
}
async function buildGeminiContents(request, attachments) {
  const contents = [];
  for (const message of Array.isArray(request.messages) ? request.messages : []) {
    const parts = await geminiParts(message?.content ?? message?.text, attachments);
    if (parts.length === 0) continue;
    contents.push({
      role: message?.role === "assistant" ? "model" : "user",
      parts
    });
  }
  if (contents.length === 0) contents.push({ role: "user", parts: [{ text: "Continue the conversation." }] });
  return contents;
}
function sanitizeSchema(value) {
  if (Array.isArray(value)) return value.map(sanitizeSchema);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (["$schema", "additionalProperties", "strict"].includes(key)) continue;
    result[key] = sanitizeSchema(child);
  }
  return result;
}
function buildGeminiTools(tools) {
  if (!Array.isArray(tools)) return void 0;
  const declarations = tools.map((tool) => ({
    name: tool?.name ?? tool?.function?.name ?? "tool",
    ...tool?.description ? { description: String(tool.description) } : {},
    parameters: sanitizeSchema(tool?.parameters ?? tool?.input_schema ?? tool?.function?.parameters ?? { type: "object" })
  }));
  return declarations.length > 0 ? [{ functionDeclarations: declarations }] : void 0;
}
async function buildAntigravityRequest(request = {}, context = {}) {
  const nativeRequest = {
    contents: await buildGeminiContents(request, context.attachments)
  };
  if (typeof request.system === "string" && request.system.length > 0) {
    nativeRequest.systemInstruction = { parts: [{ text: request.system }] };
  }
  nativeRequest.generationConfig = {
    temperature: request.temperature ?? 0.7,
    maxOutputTokens: request.maxTokens ?? 4096
  };
  const tools = buildGeminiTools(request.tools);
  if (tools) nativeRequest.tools = tools;
  return nativeRequest;
}
function responsePayload(value) {
  if (!value || typeof value !== "object") return null;
  return value.response && typeof value.response === "object" ? value.response : value;
}
async function* streamAntigravityResponse(response) {
  let text2 = "";
  let textClosed = false;
  let usage = null;
  let stop = "stop";
  let toolIndex = 0;
  yield { type: "block-start", index: 0, blockType: "text" };
  for await (const event of readSseEvents(response)) {
    const payload = responsePayload(event.data);
    if (!payload) continue;
    if (payload.error) {
      throw nativeProviderError(PROVIDER_ID2, payload.error.message ?? "Antigravity returned an error", {
        status: payload.error.code,
        body: payload.error
      });
    }
    usage = normalizeUsage(payload.usageMetadata ?? payload.usage) ?? usage;
    const candidate2 = payload.candidates?.[0] ?? payload.candidate ?? payload;
    stop = candidate2.finishReason ?? stop;
    for (const part of candidate2.content?.parts ?? candidate2.parts ?? []) {
      if (part?.text) {
        if (part.thought === true || part.thoughtSignature) {
          const index2 = 100;
          yield { type: "reasoning-delta", index: index2, text: part.text };
          continue;
        }
        text2 += part.text;
        yield { type: "text-delta", index: 0, text: part.text };
        continue;
      }
      const call = part?.functionCall ?? part?.function_call;
      if (!call) continue;
      if (!textClosed) {
        yield { type: "block-end", index: 0, block: { type: "text", text: text2 } };
        textClosed = true;
      }
      const index = ++toolIndex;
      const id = firstString(call.id, call.name, `tool-${index}`);
      const name2 = firstString(call.name, "tool");
      const argumentsValue = JSON.stringify(call.args ?? call.arguments ?? {});
      yield { type: "block-start", index, blockType: "tool-call" };
      yield { type: "tool-call-delta", index, id, name: name2, argumentsDelta: argumentsValue };
      yield { type: "block-end", index, block: { type: "tool-call", id, name: name2, arguments: argumentsValue } };
      stop = "tool_calls";
    }
  }
  if (!textClosed) yield { type: "block-end", index: 0, block: { type: "text", text: text2 } };
  if (usage) yield { type: "usage", usage };
  yield { type: "finish", reason: finishReason(stop) };
}
function createAntigravityNativeExecutor({
  endpoint: endpoint2 = process.env.DOCKYARD_ANTIGRAVITY_ENDPOINT || DEFAULT_ENDPOINT,
  project = process.env.DOCKYARD_ANTIGRAVITY_PROJECT || "default-cli-project",
  env = process.env,
  timeoutMs = 3e5,
  fetchImpl = fetch,
  tokenResolver = resolveAntigravityAccessToken,
  projectResolver = null,
  userAgent = process.env.DOCKYARD_ANTIGRAVITY_USER_AGENT || detectAntigravityUserAgent()
} = {}) {
  const safeEndpoint = validateNativeEndpoint(endpoint2, { providerId: PROVIDER_ID2 });
  const executor = async ({ request = {}, invocation, context = {} } = {}) => {
    let credential = null;
    if (context.secretStore) {
      const ref = invocation?.auth?.credentialRef ?? invocation?.account?.auth?.credentialRef ?? invocation?.account?.credentialRef;
      if (ref) credential = await context.secretStore.read(ref);
    }
    const auth = await tokenResolver({ credential, env: { ...env, ...context.env ?? {} }, home: homedir3() });
    if (!auth?.token) {
      const error = nativeProviderError(PROVIDER_ID2, "Antigravity OAuth token is unavailable; authorize Antigravity first");
      error.authExpired = true;
      throw error;
    }
    const resolvedProject = typeof projectResolver === "function" ? await projectResolver({ credential, account: invocation?.account, context }) : project;
    if (!resolvedProject) {
      throw nativeProviderError(PROVIDER_ID2, "Antigravity Code Assist project is unavailable for the selected account");
    }
    const body = {
      project: resolvedProject,
      model: request.model,
      request: await buildAntigravityRequest(request, context)
    };
    const headers = {
      authorization: `Bearer ${auth.token}`,
      "content-type": "application/json"
    };
    const resolvedUserAgent = userAgent ?? context.env?.DOCKYARD_ANTIGRAVITY_USER_AGENT ?? detectAntigravityUserAgent();
    if (resolvedUserAgent) headers["user-agent"] = resolvedUserAgent;
    const response = await fetchNativeResponse(safeEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: context.signal
    }, { providerId: PROVIDER_ID2, timeoutMs, fetchImpl });
    return streamAntigravityResponse(response);
  };
  executor.nativeTransport = "gemini-stream-generate-content";
  return executor;
}
function createAntigravityNativeQuotaReader({
  endpoint: endpoint2 = process.env.DOCKYARD_ANTIGRAVITY_QUOTA_ENDPOINT || DEFAULT_QUOTA_ENDPOINT,
  env = process.env,
  home = homedir3(),
  timeoutMs = 2e4,
  fetchImpl = fetch,
  tokenResolver = resolveAntigravityAccessToken,
  project = env.DOCKYARD_ANTIGRAVITY_PROJECT,
  projectResolver = null,
  userAgent = env.DOCKYARD_ANTIGRAVITY_USER_AGENT || detectAntigravityUserAgent()
} = {}) {
  const safeEndpoint = validateNativeEndpoint(endpoint2, { providerId: PROVIDER_ID2 });
  return async ({ credential = null, account = null, context = {} } = {}) => {
    const auth = await tokenResolver({
      credential,
      env: { ...env, ...context.env ?? {} },
      home
    });
    if (!auth?.token) {
      const error = nativeProviderError(PROVIDER_ID2, "Antigravity OAuth token is unavailable; authorize Antigravity first");
      error.authExpired = true;
      throw error;
    }
    const resolvedProject = typeof projectResolver === "function" ? await projectResolver({ credential, account, context }) : project;
    const body = resolvedProject ? { project: resolvedProject } : {};
    const resolvedUserAgent = userAgent ?? context.env?.DOCKYARD_ANTIGRAVITY_USER_AGENT ?? detectAntigravityUserAgent();
    const headers = {
      authorization: `Bearer ${auth.token}`,
      "content-type": "application/json",
      accept: "application/json"
    };
    if (resolvedUserAgent) headers["user-agent"] = resolvedUserAgent;
    const response = await fetchNativeResponse(safeEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: context.signal
    }, { providerId: PROVIDER_ID2, timeoutMs, fetchImpl });
    const raw = typeof response.json === "function" ? await response.json() : JSON.parse(await response.text());
    if (!raw || typeof raw !== "object") {
      throw nativeProviderError(PROVIDER_ID2, "quota summary response was not an object");
    }
    return raw;
  };
}
var antigravityNativeTransportConstants = Object.freeze({
  providerId: PROVIDER_ID2,
  endpoint: DEFAULT_ENDPOINT,
  quotaEndpoint: DEFAULT_QUOTA_ENDPOINT
});

// modules/provider-antigravity/src/driver.mjs
var PROVIDER_ID3 = "antigravity";
var DEFAULT_CLI = "agy";
var DEFAULT_CATALOG_TTL_MS = 6e4;
var DEFAULT_AUTH_TIMEOUT_MS = 10 * 60 * 1e3;
var CREDENTIAL_SLOT2 = Symbol("dockyard-antigravity-session");
var ANTIGRAVITY_PTY_SCRIPT = String.raw`
import os
import pty
import select
import signal
import sys

command = sys.argv[1]
command_args = sys.argv[1:]
child_pid, pty_fd = pty.fork()
if child_pid == 0:
    os.execvpe(command, command_args, os.environ)

def terminate(_signum, _frame):
    try:
        os.kill(child_pid, signal.SIGTERM)
    except OSError:
        pass
    os._exit(143)

signal.signal(signal.SIGTERM, terminate)
signal.signal(signal.SIGINT, terminate)
stdin_open = True
exit_code = 1
try:
    while True:
        inputs = [pty_fd]
        if stdin_open:
            inputs.append(0)
        ready, _, _ = select.select(inputs, [], [], 0.25)
        if pty_fd in ready:
            try:
                data = os.read(pty_fd, 8192)
            except OSError:
                data = b""
            if not data:
                break
            os.write(1, data)
        if stdin_open and 0 in ready:
            data = os.read(0, 8192)
            if data:
                os.write(pty_fd, data)
            else:
                stdin_open = False
        waited_pid, status = os.waitpid(child_pid, os.WNOHANG)
        if waited_pid:
            exit_code = os.waitstatus_to_exitcode(status)
            break
finally:
    try:
        os.close(pty_fd)
    except OSError:
        pass
    try:
        os.kill(child_pid, signal.SIGTERM)
    except OSError:
        pass
sys.exit(exit_code)
`;
function hash2(value) {
  return createHash3("sha256").update(String(value)).digest("hex");
}
var EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
function normalizeEmail(value) {
  const email = String(value ?? "").trim();
  return EMAIL_PATTERN.test(email) ? email : null;
}
function extractAntigravityAccountEmail(...values) {
  for (const value of values) {
    const direct = normalizeEmail(
      value?.email ?? value?.account?.email ?? value?.user?.email ?? value?.identity?.email ?? value?.command?.data?.email
    );
    if (direct) return direct;
    const text2 = typeof value === "string" ? value : "";
    const explicit = text2.match(
      /(?:applyAuthResult:\s*)?email\s*=\s*([^\s,;]+)|authenticated\s+successfully\s+as\s+([^\s,;]+)/i
    );
    const matched = normalizeEmail(explicit?.[1] ?? explicit?.[2]);
    if (matched) return matched;
  }
  return null;
}
function sessionFingerprint(session) {
  const token = typeof session?.token === "string" && session.token.length > 0 ? session.token : null;
  return token ? hash2(`antigravity-session:${token}`).slice(0, 10).toUpperCase() : null;
}
function sameEmail(left, right) {
  const a = normalizeEmail(left)?.toLowerCase();
  const b = normalizeEmail(right)?.toLowerCase();
  return Boolean(a && b && a === b);
}
function cliFailure2(code, signal, output, errorOutput) {
  const error = new Error(`Antigravity CLI failed (${signal ?? code})`);
  error.code = code;
  const structured = parseJsonOutput2(output);
  const structuredDetail = structured?.error ?? structured?.response ?? structured?.result?.error ?? structured?.result?.response;
  error.detail = String(errorOutput || structuredDetail || "").replace(/\s+/g, " ").trim().slice(0, 300);
  return error;
}
function runCommand(command, args, { env = process.env, timeoutMs = 3e4, signal } = {}) {
  return new Promise((resolve2, reject) => {
    const child = spawn4(command, args, {
      env: { ...env, AGY_CLI_HIDE_ACCOUNT_INFO: env.AGY_CLI_HIDE_ACCOUNT_INFO ?? "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...signal ? { signal } : {}
    });
    const stdout = [];
    const stderr = [];
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal2) => {
      clearTimeout(timer);
      const output = Buffer.concat(stdout).toString("utf8");
      const errorOutput = Buffer.concat(stderr).toString("utf8");
      if (code === 0) {
        resolve2({ output, errorOutput });
        return;
      }
      reject(cliFailure2(code, signal2, output, errorOutput));
    });
  });
}
function parseJsonOutput2(output) {
  try {
    return JSON.parse(output);
  } catch {
    for (const line of String(output).split(/\r?\n/).reverse()) {
      if (!line.trim()) continue;
      try {
        return JSON.parse(line);
      } catch {
      }
    }
    return null;
  }
}
function normalizeToken(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function modelTier(model) {
  const labelMatch = /\(([^()]+)\)\s*$/.exec(model.name ?? "");
  if (!labelMatch) return null;
  const idParts = model.id.split("-");
  const id = idParts.at(-1);
  const label = labelMatch[1].trim();
  if (!id || !label || normalizeToken(id) !== normalizeToken(label)) return null;
  return { id, name: label };
}
function parseAntigravityModelCatalog(output) {
  const rows = String(output).split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !/^fetching available models/i.test(line)).map((line) => {
    const [id, ...nameParts] = line.split("	");
    return { id, name: nameParts.join("	") || id };
  }).filter((model) => model.id);
  const families = /* @__PURE__ */ new Map();
  for (const model of rows) {
    const tier = modelTier(model);
    if (!tier) continue;
    const familyId = model.id.slice(0, -(tier.id.length + 1));
    const family = families.get(familyId) ?? /* @__PURE__ */ new Map();
    family.set(tier.id, tier);
    families.set(familyId, family);
  }
  return rows.map((model) => {
    const tier = modelTier(model);
    if (!tier) return model;
    const familyId = model.id.slice(0, -(tier.id.length + 1));
    const family = families.get(familyId);
    if (!family || family.size < 2) return model;
    const efforts = [...family.values()];
    return {
      ...model,
      reasoning: {
        efforts: efforts.map((effort) => ({ id: effort.id, name: effort.name })),
        defaultEffort: tier.id
      }
    };
  });
}
function registryModels(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.models)) return value.models;
  return [];
}
function registryMatch(model, registry) {
  const candidates = registryModels(registry).filter((candidate2) => candidate2 && typeof candidate2.id === "string" && candidate2.id.length > 0).filter((candidate2) => model.id === candidate2.id || model.id.startsWith(`${candidate2.id}-`)).sort((left, right) => right.id.length - left.id.length);
  const exact = candidates.find((candidate2) => candidate2.id === model.id);
  if (exact) return exact;
  const family = candidates[0];
  if (!family || !model.reasoning?.efforts?.length) return null;
  const suffix = model.id.slice(family.id.length + 1);
  return model.reasoning.efforts.some((effort) => normalizeToken(effort.id) === normalizeToken(suffix)) ? family : null;
}
function enrichAntigravityModelCatalog(models, registry) {
  return (Array.isArray(models) ? models : []).map((model) => {
    const match = registryMatch(model, registry);
    if (!match) return model;
    const contextWindow = finiteNumber(model.contextWindow ?? match.contextWindow ?? match.context_window ?? match.context_length);
    const maxTokens = finiteNumber(model.maxTokens ?? match.maxTokens ?? match.max_tokens ?? match.max_output_tokens);
    const inputModalities = Array.isArray(model.inputModalities) ? model.inputModalities : Array.isArray(match.input) ? match.input : void 0;
    return {
      ...model,
      ...Number.isInteger(contextWindow) ? { contextWindow } : {},
      ...Number.isInteger(maxTokens) ? { maxTokens } : {},
      ...inputModalities?.length ? { inputModalities: [...inputModalities] } : {}
    };
  });
}
function createAntigravityCatalogLoader({
  cliPath = process.env.DOCKYARD_ANTIGRAVITY_CLI || DEFAULT_CLI,
  env = process.env,
  timeoutMs = 3e4,
  cacheTtlMs = Number(process.env.DOCKYARD_ANTIGRAVITY_CATALOG_TTL_MS) || DEFAULT_CATALOG_TTL_MS,
  commandRunner = runCommand,
  registryLoader = null
} = {}) {
  let cached = null;
  let cachedAt = 0;
  let pending = null;
  return async function loadCatalog({ force = false } = {}) {
    const now = Date.now();
    if (!force && cached && now - cachedAt < cacheTtlMs) return cached;
    const refresh = () => Promise.resolve(commandRunner(cliPath, ["models"], {
      env,
      timeoutMs
    })).then(async (result) => {
      let registry = [];
      if (typeof registryLoader === "function") {
        try {
          registry = await registryLoader();
        } catch {
        }
      }
      const liveModels = parseAntigravityModelCatalog(result.output);
      const models = enrichAntigravityModelCatalog(liveModels, registry);
      const enriched = models.some((model, index) => {
        const original = liveModels[index];
        return model.contextWindow !== original?.contextWindow || model.maxTokens !== original?.maxTokens;
      });
      const value = {
        models,
        source: enriched ? "official_antigravity_cli+model_registry" : "official_antigravity_cli"
      };
      cached = value;
      cachedAt = Date.now();
      return value;
    }).catch((error) => {
      const unavailable = {
        models: [],
        source: error?.code === "ENOENT" ? "antigravity_cli_not_found" : "antigravity_cli_unavailable",
        diagnostics: [redactError(error)]
      };
      cached = unavailable;
      cachedAt = Date.now();
      return unavailable;
    }).finally(() => {
      pending = null;
    });
    if (!force && cached) {
      if (!pending) pending = refresh();
      return cached;
    }
    if (pending) return pending;
    pending = refresh();
    return pending;
  };
}
function quotaGroups(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.groups)) return data.groups;
  if (Array.isArray(data.quota_groups)) return data.quota_groups;
  if (Array.isArray(data.quotaGroups)) return data.quotaGroups;
  return [];
}
function findQuotaData(value, depth = 0, seen = /* @__PURE__ */ new Set()) {
  if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) return null;
  seen.add(value);
  if (quotaGroups(value).length > 0) return value;
  for (const key of ["command", "data", "response", "quota_summary", "quotaSummary", "result"]) {
    const found = findQuotaData(value[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}
function findCreditsData(value, depth = 0, seen = /* @__PURE__ */ new Set()) {
  if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) return null;
  seen.add(value);
  if (Object.hasOwn(value, "remaining_credits") || Object.hasOwn(value, "remainingCredits")) return value;
  for (const child of Object.values(value)) {
    const found = findCreditsData(child, depth + 1, seen);
    if (found) return found;
  }
  return null;
}
function parseQuotaData(data, now = /* @__PURE__ */ new Date(), source = "antigravity_cli") {
  const windows = [];
  for (const group of quotaGroups(data)) {
    for (const bucket of group?.buckets ?? []) {
      const fraction = finiteNumber(bucket.remaining_fraction ?? bucket.remainingFraction);
      const percent = finiteNumber(bucket.remaining_percent ?? bucket.remainingPercent);
      const remaining = fraction ?? (percent === null ? null : percent / 100);
      windows.push({
        id: stringValue(bucket.id) ?? `${group.name ?? "group"}:${bucket.name ?? "window"}`,
        name: [group.name, bucket.name].filter(Boolean).join(" / ") || null,
        remaining,
        limit: remaining === null ? null : 1,
        unit: remaining === null ? null : "fraction",
        resetAt: isoFromEpoch(bucket.reset_time ?? bucket.resetTime),
        updatedAt: now.toISOString(),
        source
      });
    }
  }
  return windows;
}
function parseQuotaText(text2, now = /* @__PURE__ */ new Date(), source = "antigravity_cli") {
  const windows = [];
  for (const line of text2.split(/\r?\n/)) {
    const parts = line.split("	");
    if (parts.length < 3 || !/%$/.test(parts[2])) continue;
    const remaining = finiteNumber(parts[2].replace(/%$/, ""));
    if (remaining === null) continue;
    windows.push({
      id: `${parts[0]}:${parts[1]}`,
      name: `${parts[0]} / ${parts[1]}`,
      remaining,
      limit: 100,
      unit: "percent",
      resetAt: isoFromEpoch(parts[3]),
      updatedAt: now.toISOString(),
      source
    });
  }
  return windows;
}
function parseAntigravityNativeQuota(value, now = /* @__PURE__ */ new Date()) {
  const data = findQuotaData(value);
  let windows = parseQuotaData(data, now, "antigravity_native");
  if (windows.length === 0) {
    windows = recursiveQuotaWindows(value, { source: "antigravity_native", now, prefix: "antigravity" });
  }
  const credits = findCreditsData(value);
  return {
    windows,
    credits: credits ? {
      remaining: finiteNumber(credits.remaining_credits ?? credits.remainingCredits),
      upgradeUri: stringValue(credits.upgrade_uri ?? credits.upgradeUri)
    } : null
  };
}
function candidate(now, { email = null, session = null, existingAccounts = [] } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const fingerprint = sessionFingerprint(session);
  const stableAccountId = normalizedEmail ? `antigravity:google:${hash2(`email:${normalizedEmail.toLowerCase()}`).slice(0, 20)}` : fingerprint ? `antigravity:session:${hash2(`fingerprint:${fingerprint}`).slice(0, 20)}` : "antigravity:active";
  const known = existingAccounts.find((account) => fingerprint && account?.resources?.sessionFingerprint === fingerprint || sameEmail(account?.email, normalizedEmail));
  const legacy = existingAccounts.find((account) => account?.accountId === "antigravity:active");
  const accountId = known?.accountId ?? (legacy && !legacy.resources?.sessionFingerprint && stableAccountId !== "antigravity:active" ? legacy.accountId : stableAccountId);
  const identityLabel = normalizedEmail ?? (fingerprint ? `Antigravity \u5B98\u65B9\u4F1A\u8BDD \xB7 ${fingerprint}` : "Antigravity \u5B98\u65B9\u5F53\u524D\u4F1A\u8BDD");
  const identitySource = normalizedEmail ? "official_cli_auth_status" : fingerprint ? "local_oauth_session_fingerprint" : "official_active_session";
  const credentialRef = createCredentialRef(PROVIDER_ID3, accountId);
  const value = {
    candidateId: `antigravity:${hash2(accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID3,
    source: "official_antigravity_cli",
    accountId,
    displayName: identityLabel,
    email: normalizedEmail,
    subscription: { plan: null, status: null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: null
    },
    imported: false,
    status: "available",
    diagnostic: null,
    credentialRef,
    resources: {
      identitySource,
      identityLabel,
      ...fingerprint ? { sessionFingerprint: fingerprint } : {},
      identityNote: normalizedEmail ? "\u8D26\u53F7\u90AE\u7BB1\u6765\u81EA\u5B98\u65B9 Antigravity \u767B\u5F55\u6001" : fingerprint ? "\u5B98\u65B9\u767B\u5F55\u6001\u672A\u8FD4\u56DE\u90AE\u7BB1\uFF1B\u4F7F\u7528\u4F1A\u8BDD\u6307\u7EB9\u533A\u5206\u8D26\u53F7" : "\u5B98\u65B9\u53EA\u8FD4\u56DE\u5F53\u524D\u4F1A\u8BDD\uFF1B\u5207\u6362\u8D26\u53F7\u540E\u8BF7\u91CD\u65B0\u626B\u63CF",
      sessionPersistence: session?.token ? "captured" : "active"
    }
  };
  Object.defineProperty(value, CREDENTIAL_SLOT2, {
    value: {
      type: "official_cli_session",
      providerId: PROVIDER_ID3,
      ...session?.token ? { access: session.token } : {}
    },
    enumerable: false
  });
  return value;
}
function summarizeAntigravityCandidate(value) {
  return {
    providerId: PROVIDER_ID3,
    candidateId: value.candidateId,
    source: value.source,
    accountId: value.accountId,
    displayName: value.displayName,
    email: value.email,
    subscription: { ...value.subscription },
    refresh: { ...value.refresh },
    resources: { ...value.resources },
    imported: Boolean(value.imported),
    status: value.status ?? "available",
    diagnostic: value.diagnostic ?? null
  };
}
var ANTIGRAVITY_AUTH_URL_PATTERN = /https:\/\/accounts\.google\.com\/o\/oauth2\/auth\?[^\s"'<>]+/i;
function cleanAntigravityAuthUrl(value) {
  return String(value ?? "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/[),.;]+$/, "");
}
function publicAntigravityAuthSession(session) {
  return {
    sessionId: session.sessionId,
    providerId: PROVIDER_ID3,
    status: session.status ?? (session.exitCode === null ? "pending" : "processing"),
    authorizationUrl: session.authorizationUrl,
    instructions: session.instructions,
    startedAt: session.startedAt,
    ...session.browserOpened ? { browserOpened: true } : {},
    ...session.inputRequired ? { inputRequired: true } : {},
    diagnostic: session.diagnostic ?? null
  };
}
function createAntigravityOAuthAuthorizer({
  cliPath = process.env.DOCKYARD_ANTIGRAVITY_CLI || DEFAULT_CLI,
  environment = process.env,
  timeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
  prompt = "Reply with OK",
  spawnImpl = spawn4,
  tokenReader = readAntigravityTokenFile,
  usePty = process.platform === "darwin",
  ptyPythonPath = process.env.DOCKYARD_ANTIGRAVITY_PTY_PYTHON || "python3",
  instructions = "\u5DF2\u6253\u5F00 Google \u5B98\u65B9\u9A8C\u8BC1\u9875\uFF1B\u9009\u62E9\u8D26\u53F7\u5E76\u5B8C\u6210\u9A8C\u8BC1\u540E\uFF0CDSH \u4F1A\u81EA\u52A8\u63A5\u5165\u3002"
} = {}) {
  if (!cliPath) throw new Error("Antigravity OAuth authorizer requires an agy CLI path");
  if (typeof spawnImpl !== "function") throw new Error("Antigravity OAuth authorizer requires a process spawner");
  if (typeof tokenReader !== "function") throw new Error("Antigravity OAuth authorizer requires a token reader");
  const sessions = /* @__PURE__ */ new Map();
  async function cleanup(session) {
    if (!session.profileDir) return;
    await rm2(session.profileDir, { recursive: true, force: true }).catch(() => {
    });
    session.profileDir = null;
  }
  function capture(session, chunk) {
    session.output = `${session.output}${String(chunk ?? "")}`.slice(-32e3);
    if (!session.authorizationUrl) {
      const match = session.output.match(ANTIGRAVITY_AUTH_URL_PATTERN);
      if (match?.[0]) session.authorizationUrl = cleanAntigravityAuthUrl(match[0]);
    }
    if (/authorization code|redirect URL/i.test(session.output)) session.inputRequired = true;
  }
  function readToken(session) {
    try {
      return tokenReader({ env: session.childEnv, home: session.profileDir });
    } catch {
      return null;
    }
  }
  async function finalize(session, context, credential = null) {
    if (session.result) return session.result;
    if (session.finalizing) return session.finalizing;
    session.finalizing = (async () => {
      try {
        const auth = credential ?? readToken(session);
        if (!auth?.token) {
          if (session.exitCode === null) return publicAntigravityAuthSession(session);
          session.status = "failed";
          session.diagnostic = session.timedOut ? "Google \u9A8C\u8BC1\u8D85\u65F6\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7\u3002" : session.launchError ? `\u65E0\u6CD5\u542F\u52A8 agy \u5B98\u65B9\u9A8C\u8BC1\uFF1A${session.launchError}` : `agy \u5B98\u65B9\u9A8C\u8BC1\u672A\u5B8C\u6210\uFF08\u9000\u51FA\u7801 ${session.exitCode ?? "unknown"}\uFF09\u3002`;
          return publicAntigravityAuthSession(session);
        }
        if (session.child && session.exitCode === null) session.child.kill("SIGTERM");
        const account = candidate(context?.now instanceof Date ? context.now : /* @__PURE__ */ new Date(), {
          email: extractAntigravityAccountEmail(session.output),
          session: auth,
          existingAccounts: context?.accounts ?? []
        });
        session.status = "completed";
        session.result = {
          ...publicAntigravityAuthSession(session),
          status: "completed",
          accounts: [account],
          diagnostic: null
        };
        return session.result;
      } catch (error) {
        session.status = "failed";
        session.diagnostic = redactError(error);
        return publicAntigravityAuthSession(session);
      } finally {
        if (session.status === "completed" || session.status === "failed") {
          if (session.timer) clearTimeout(session.timer);
          await cleanup(session);
        }
      }
    })();
    return session.finalizing;
  }
  async function begin() {
    const profileDir = await mkdtemp2(join6(tmpdir2(), "dockyard-antigravity-oauth-"));
    const tokenPath = join6(profileDir, ".gemini", "antigravity-cli", "antigravity-oauth-token");
    const childEnv = {
      ...environment,
      HOME: profileDir,
      XDG_CONFIG_HOME: join6(profileDir, ".config"),
      DOCKYARD_ANTIGRAVITY_TOKEN_FILE: tokenPath
    };
    delete childEnv.AGY_CLI_HIDE_ACCOUNT_INFO;
    const session = {
      sessionId: `${PROVIDER_ID3}:${randomUUID3()}`,
      providerId: PROVIDER_ID3,
      profileDir,
      childEnv,
      status: "pending",
      authorizationUrl: null,
      instructions,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      // agy owns the official browser OAuth flow and opens this URL itself.
      // The DSH host must not open the captured URL a second time.
      browserOpened: true,
      exitCode: null,
      launchError: null,
      output: "",
      inputRequired: false,
      timedOut: false,
      child: null,
      timer: null,
      finalizing: null,
      result: null,
      diagnostic: null
    };
    sessions.set(session.sessionId, session);
    try {
      const command = usePty ? ptyPythonPath : cliPath;
      const args = usePty ? ["-u", "-c", ANTIGRAVITY_PTY_SCRIPT, cliPath, "-p", prompt, "--output-format", "json"] : ["-p", prompt, "--output-format", "json"];
      const child = spawnImpl(command, args, {
        env: childEnv,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      });
      session.child = child;
      child.stdout?.on("data", (chunk) => capture(session, chunk));
      child.stderr?.on("data", (chunk) => capture(session, chunk));
      child.once("error", (error) => {
        session.launchError = redactError(error);
        session.exitCode = -1;
      });
      child.once("close", (code) => {
        session.exitCode = typeof code === "number" ? code : -1;
      });
      session.timer = setTimeout(() => {
        if (session.exitCode !== null) return;
        session.timedOut = true;
        child.kill("SIGTERM");
      }, timeoutMs);
      session.timer.unref?.();
    } catch (error) {
      session.launchError = redactError(error);
      session.exitCode = -1;
    }
    return publicAntigravityAuthSession(session);
  }
  async function poll(sessionId, context = {}) {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        providerId: PROVIDER_ID3,
        status: "missing",
        instructions,
        diagnostic: "\u9A8C\u8BC1\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u7ED3\u675F\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7\u3002"
      };
    }
    if (session.result) return session.result;
    const credential = readToken(session);
    if (!credential?.token && session.exitCode === null) return publicAntigravityAuthSession(session);
    const result = await finalize(session, context, credential);
    if (!["pending", "processing"].includes(result.status)) sessions.delete(sessionId);
    return result;
  }
  async function submitAuthorizationCode(sessionId, value) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error("\u9A8C\u8BC1\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u7ED3\u675F\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7");
    const code = String(value ?? "").trim();
    if (!code) throw new Error("\u8BF7\u8F93\u5165 Google \u9A8C\u8BC1\u7801\u6216\u56DE\u8C03\u5730\u5740");
    if (!session.child || session.exitCode !== null || !session.child.stdin?.writable) {
      throw new Error("agy \u9A8C\u8BC1\u8FDB\u7A0B\u5DF2\u7ED3\u675F\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7");
    }
    session.child.stdin.write(`${code}
`);
    session.inputRequired = false;
    session.status = "processing";
    session.instructions = "\u6388\u6743\u7801\u5DF2\u63D0\u4EA4\uFF0C\u6B63\u5728\u7B49\u5F85\u5B98\u65B9\u767B\u5F55\u5B8C\u6210\u3002";
    return publicAntigravityAuthSession(session);
  }
  async function cancel(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return { sessionId, providerId: PROVIDER_ID3, status: "missing" };
    if (session.timer) clearTimeout(session.timer);
    if (session.child && session.exitCode === null) session.child.kill("SIGTERM");
    await cleanup(session);
    sessions.delete(sessionId);
    return { sessionId, providerId: PROVIDER_ID3, status: "cancelled" };
  }
  return Object.freeze({ begin, poll, cancel, submitAuthorizationCode });
}
var AntigravityOfficialCliDriver = class {
  constructor({
    cliPath = process.env.DOCKYARD_ANTIGRAVITY_CLI || DEFAULT_CLI,
    env = process.env,
    timeoutMs = 3e4,
    commandRunner = runCommand,
    requestExecutor = null,
    catalogLoader = null,
    quotaReader = null,
    tokenResolver = resolveAntigravityAccessToken,
    identityFromOfficialCli = true,
    oauthAuthorizer = null,
    authorizationTimeoutMs = DEFAULT_AUTH_TIMEOUT_MS
  } = {}) {
    this.cliPath = cliPath;
    this.env = env;
    this.timeoutMs = timeoutMs;
    this.commandRunner = commandRunner;
    this.requestExecutor = requestExecutor;
    this.quotaReader = quotaReader;
    this.tokenResolver = tokenResolver;
    this.identityFromOfficialCli = identityFromOfficialCli;
    this.oauthAuthorizer = oauthAuthorizer ?? createAntigravityOAuthAuthorizer({
      cliPath,
      environment: env,
      timeoutMs: authorizationTimeoutMs
    });
    this.catalogLoader = catalogLoader ?? createAntigravityCatalogLoader({
      cliPath,
      env,
      timeoutMs,
      commandRunner
    });
  }
  async #slash(command, signal) {
    const result = await this.commandRunner(this.cliPath, ["-p", command, "--output-format", "json"], {
      env: this.env,
      timeoutMs: this.timeoutMs,
      ...signal ? { signal } : {}
    });
    const parsed = parseJsonOutput2(result.output);
    return { ...result, parsed };
  }
  async #nativeQuota(account, context, now) {
    if (typeof this.quotaReader !== "function") return null;
    let credential = null;
    const credentialRef = account?.auth?.credentialRef;
    if (credentialRef && context.secretStore && typeof context.secretStore.read === "function") {
      credential = await context.secretStore.read(credentialRef);
    }
    const value = await this.quotaReader({ account, credential, context });
    const parsed = parseAntigravityNativeQuota(value, now);
    if (parsed.windows.length === 0 && !parsed.credits) return null;
    return parsed;
  }
  async discover(context = {}) {
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
    try {
      let session = null;
      try {
        session = typeof this.tokenResolver === "function" ? await this.tokenResolver({ env: this.env }) : null;
      } catch {
      }
      let windows = [];
      let source = "official_antigravity_cli";
      try {
        const native = await this.#nativeQuota(null, context, now);
        windows = native?.windows ?? [];
        if (windows.length > 0) source = "antigravity_native";
      } catch {
      }
      let result = null;
      let cliIdentityError = null;
      if (windows.length === 0 || this.identityFromOfficialCli) {
        try {
          result = await this.#slash("/quota", context.signal);
          const data = result.parsed?.command?.data;
          if (windows.length === 0) {
            windows = parseQuotaData(data, now);
            if (windows.length === 0) windows = parseQuotaText(result.parsed?.response ?? "", now);
          }
        } catch (error) {
          cliIdentityError = error;
          if (windows.length === 0) throw error;
        }
      }
      const email = extractAntigravityAccountEmail(
        result?.parsed,
        result?.output,
        result?.errorOutput
      );
      const found = candidate(now, {
        email,
        session,
        existingAccounts: context.accounts ?? []
      });
      found.status = windows.length ? "available" : "degraded";
      found.diagnostic = windows.length ? null : "\u5B98\u65B9 CLI \u5DF2\u542F\u52A8\uFF0C\u4F46\u6CA1\u6709\u8FD4\u56DE\u7ED3\u6784\u5316 quota \u7A97\u53E3";
      return {
        candidates: [found],
        source,
        diagnostics: [
          ...result?.parsed?.status === "SUCCESS" || !result ? [] : ["Antigravity CLI \u8FD4\u56DE\u4E86\u975E\u6210\u529F\u72B6\u6001"],
          ...cliIdentityError && windows.length ? ["\u5B98\u65B9 CLI \u8D26\u53F7\u8EAB\u4EFD\u6682\u672A\u8FD4\u56DE\uFF1B\u5DF2\u4F7F\u7528\u672C\u5730\u4F1A\u8BDD\u6807\u8BC6"] : []
        ]
      };
    } catch (error) {
      return {
        candidates: [],
        source: "official_antigravity_cli",
        diagnostics: [`\u65E0\u6CD5\u8BFB\u53D6 Antigravity \u5B98\u65B9\u4F1A\u8BDD\uFF1A${redactError(error)}`]
      };
    }
  }
  async importAccount(value, context = {}) {
    const session = value?.[CREDENTIAL_SLOT2];
    if (!session) throw new Error("Antigravity candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    await context.secretStore.write(value.credentialRef, session);
    return {
      providerId: PROVIDER_ID3,
      accountId: value.accountId,
      credentialRef: value.credentialRef,
      displayName: value.displayName,
      email: value.email ?? null,
      auth: { kind: "official_cli_session", scopes: [] },
      subscription: { plan: null, status: null, expiresAt: null },
      refresh: {
        accessTokenExpiresAt: null,
        nextRefreshAt: null,
        lastRefreshedAt: null,
        refreshable: null
      },
      resources: {
        transport: "gemini_stream_generate_content_sse",
        authSource: "official_antigravity_cli_session",
        quotaSource: "antigravity_cli_status",
        ...value.resources ?? {}
      }
    };
  }
  async startAuthorization(context = {}) {
    return this.oauthAuthorizer.begin(context);
  }
  async pollAuthorization(sessionId, context = {}) {
    return this.oauthAuthorizer.poll(sessionId, context);
  }
  async submitAuthorizationCode(sessionId, code, context = {}) {
    return this.oauthAuthorizer.submitAuthorizationCode(sessionId, code, context);
  }
  async cancelAuthorization(sessionId, context = {}) {
    return this.oauthAuthorizer.cancel(sessionId, context);
  }
  async refreshAccount(account, context = {}) {
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
    let nativeError = null;
    try {
      const native = await this.#nativeQuota(account, context, now);
      if (native) {
        const primary2 = selectPrimaryQuotaWindow(native.windows);
        return {
          quota: {
            ...primary2,
            windows: native.windows,
            updatedAt: now.toISOString(),
            source: "antigravity_native"
          },
          credits: native.credits,
          resources: { quotaSource: "antigravity_native" },
          refresh: {
            accessTokenExpiresAt: null,
            nextRefreshAt: null,
            lastRefreshedAt: now.toISOString(),
            refreshable: null
          }
        };
      }
    } catch (error) {
      nativeError = error;
    }
    if (typeof this.quotaReader === "function" && account?.auth?.credentialRef) {
      throw nativeError ?? new Error("Antigravity native quota did not return data for the selected account");
    }
    const [result, creditsResult] = await Promise.all([
      this.#slash("/quota", context.signal),
      this.#slash("/credits", context.signal).catch(() => null)
    ]);
    if (result.parsed?.status && result.parsed.status !== "SUCCESS") {
      throw new Error("Antigravity official quota command did not complete");
    }
    const windows = parseQuotaData(result.parsed?.command?.data, now);
    const fallbackWindows = windows.length ? windows : parseQuotaText(result.parsed?.response ?? "", now);
    const primary = selectPrimaryQuotaWindow(fallbackWindows);
    return {
      quota: {
        ...primary,
        windows: fallbackWindows,
        updatedAt: now.toISOString(),
        source: "antigravity_cli"
      },
      credits: creditsResult?.parsed?.command?.data ? {
        remaining: finiteNumber(creditsResult.parsed.command.data.remaining_credits),
        upgradeUri: stringValue(creditsResult.parsed.command.data.upgrade_uri)
      } : null,
      refresh: {
        accessTokenExpiresAt: null,
        nextRefreshAt: null,
        lastRefreshedAt: now.toISOString(),
        refreshable: null
      }
    };
  }
  async getQuota(account, context = {}) {
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
    let nativeError = null;
    try {
      const native = await this.#nativeQuota(account, context, now);
      if (native) {
        const primary2 = selectPrimaryQuotaWindow(native.windows);
        return {
          quota: {
            ...primary2,
            windows: native.windows,
            updatedAt: now.toISOString(),
            source: "antigravity_native"
          },
          credits: native.credits,
          resources: { quotaSource: "antigravity_native" },
          refresh: {
            accessTokenExpiresAt: null,
            nextRefreshAt: null,
            lastRefreshedAt: now.toISOString(),
            refreshable: null
          }
        };
      }
    } catch (error) {
      nativeError = error;
    }
    if (typeof this.quotaReader === "function" && account?.auth?.credentialRef) {
      throw nativeError ?? new Error("Antigravity native quota did not return data for the selected account");
    }
    const [quotaResult, creditsResult] = await Promise.all([
      this.#slash("/quota", context.signal),
      this.#slash("/credits", context.signal).catch(() => null)
    ]);
    const data = quotaResult.parsed?.command?.data;
    const windows = parseQuotaData(data, now);
    const fallbackWindows = windows.length ? windows : parseQuotaText(quotaResult.parsed?.response ?? "", now);
    const credits = creditsResult?.parsed?.command?.data ?? null;
    const primary = selectPrimaryQuotaWindow(fallbackWindows);
    return {
      quota: {
        ...primary,
        windows: fallbackWindows,
        updatedAt: now.toISOString(),
        source: "antigravity_cli"
      },
      credits: credits ? { remaining: finiteNumber(credits.remaining_credits), upgradeUri: stringValue(credits.upgrade_uri) } : null,
      refresh: {
        accessTokenExpiresAt: null,
        nextRefreshAt: null,
        lastRefreshedAt: now.toISOString(),
        refreshable: null
      }
    };
  }
  async getCatalog(context = {}) {
    return this.catalogLoader({ force: Boolean(context.force) });
  }
  async invoke(request, invocation, context = {}) {
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") {
      throw new Error("Antigravity native invocation transport is not mounted");
    }
    return executor({ request, invocation, context });
  }
  async stream(request, invocation, context = {}) {
    return this.invoke(request, invocation, context);
  }
};
function createAntigravityDriver(options = {}) {
  return new AntigravityOfficialCliDriver(options);
}
var antigravityDriverConstants = Object.freeze({ providerId: PROVIDER_ID3 });

// modules/provider-antigravity/src/index.mjs
function createAntigravityModule({ driver = {} } = {}) {
  return defineProviderModule({
    id: "antigravity",
    displayName: "Antigravity",
    capabilities: [
      "oauth_discovery",
      "oauth_import",
      "oauth_authorization",
      "oauth_refresh",
      "quota",
      "catalog",
      "invoke",
      "stream"
    ],
    driver
  });
}

// modules/provider-grok/src/driver.mjs
import { createHash as createHash4 } from "node:crypto";
import { mkdtemp as mkdtemp3, readFile as readFile4, rm as rm3, writeFile as writeFile2 } from "node:fs/promises";
import { homedir as homedir4 } from "node:os";
import { tmpdir as tmpdir3 } from "node:os";
import { join as join7 } from "node:path";
var PROVIDER_ID4 = "grok";
var DEFAULT_GROK_HOME = join7(homedir4(), ".grok");
var DEFAULT_CATALOG_TTL_MS2 = 6e4;
var CREDENTIAL_SLOT3 = Symbol("dockyard-grok-credential");
function hash3(value) {
  return createHash4("sha256").update(String(value)).digest("hex");
}
function firstString2(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}
function grokHomePath({ env = process.env, home = homedir4(), grokHome } = {}) {
  return grokHome ?? env.GROK_HOME ?? join7(home, ".grok");
}
function grokCommandEnvironment(env, grokHome) {
  return { ...env, GROK_HOME: grokHome };
}
function authRecords(raw) {
  if (!raw || typeof raw !== "object") return [];
  if (typeof raw.key === "string" || typeof raw.access_token === "string" || typeof raw.accessToken === "string") {
    return [{ scopeKey: "default", value: raw }];
  }
  return Object.entries(raw).filter(([, value]) => value && typeof value === "object").map(([scopeKey, value]) => ({ scopeKey, value }));
}
function parseGrokAuth(raw) {
  return authRecords(raw).map(({ scopeKey, value }) => {
    const access2 = firstString2(value.key, value.access_token, value.accessToken);
    if (!access2) return null;
    const accessPayload = decodeJwtPayload(access2) ?? {};
    const expiresAt = firstString2(
      value.expires_at,
      value.expiresAt,
      isoFromEpoch(accessPayload.exp)
    );
    const accountId = firstString2(
      value.user_id,
      value.userId,
      value.principal_id,
      value.principalId,
      value.team_id,
      value.teamId
    ) ?? `${scopeKey}:${hash3(access2).slice(0, 20)}`;
    const email = firstString2(value.email, value.user_email, value.userEmail);
    return {
      access: access2,
      refresh: firstString2(value.refresh_token, value.refreshToken),
      accountId,
      email,
      displayName: firstString2(value.first_name, value.firstName, value.name, email, accountId),
      plan: firstString2(value.subscription_level, value.subscriptionLevel),
      expiresAt,
      createdAt: firstString2(value.create_time, value.createdAt),
      scopes: Array.isArray(value.scopes) ? value.scopes.map(String) : typeof value.scope === "string" ? value.scope.split(/\s+/).filter(Boolean) : [],
      issuer: firstString2(value.oidc_issuer, value.oidcIssuer, scopeKey.split("::")[0]),
      clientId: firstString2(value.oidc_client_id, value.oidcClientId),
      authMode: firstString2(value.auth_mode, value.authMode),
      scopeKey
    };
  }).filter(Boolean);
}
function accountInput2(tokens, credentialRef, now = /* @__PURE__ */ new Date()) {
  return {
    providerId: PROVIDER_ID4,
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
      refreshable: Boolean(tokens.refresh)
    },
    resources: {
      transport: "xai_chat_completions_sse",
      accountScope: "oauth_account",
      quotaSource: "official_grok_cli"
    }
  };
}
function attachCredential2(candidate2, tokens) {
  Object.defineProperty(candidate2, CREDENTIAL_SLOT3, {
    value: tokens,
    enumerable: false,
    configurable: false
  });
  return candidate2;
}
function candidateFromTokens2(tokens, { source, now = /* @__PURE__ */ new Date() } = {}) {
  const expired = tokens.expiresAt && new Date(tokens.expiresAt).getTime() <= now.getTime();
  return attachCredential2({
    candidateId: `grok:${hash3(tokens.accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID4,
    source,
    accountId: tokens.accountId,
    displayName: tokens.displayName ?? tokens.email ?? tokens.accountId,
    email: tokens.email,
    subscription: { plan: tokens.plan, status: null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: tokens.expiresAt,
      nextRefreshAt: null,
      lastRefreshedAt: tokens.createdAt ?? now.toISOString(),
      refreshable: Boolean(tokens.refresh)
    },
    credentialRef: createCredentialRef(PROVIDER_ID4, tokens.accountId),
    imported: false,
    status: expired ? "degraded" : "available",
    diagnostic: expired ? "Grok OAuth access token \u5DF2\u8FC7\u671F\uFF0C\u5BFC\u5165\u540E\u9700\u8981\u5B98\u65B9 OAuth \u5237\u65B0" : null
  }, tokens);
}
function summarizeGrokCandidate(candidate2) {
  return {
    providerId: PROVIDER_ID4,
    candidateId: candidate2.candidateId,
    source: candidate2.source,
    accountId: candidate2.accountId,
    displayName: candidate2.displayName,
    email: candidate2.email,
    subscription: { ...candidate2.subscription },
    refresh: { ...candidate2.refresh },
    imported: Boolean(candidate2.imported),
    status: candidate2.status ?? "available",
    diagnostic: candidate2.diagnostic ?? null
  };
}
function cacheEntries(cache) {
  if (!cache?.models || typeof cache.models !== "object") return [];
  return Array.isArray(cache.models) ? cache.models.map((value) => [value?.id, value]).filter(([id]) => id) : Object.entries(cache.models);
}
function normalizeReasoning(info) {
  const raw = Array.isArray(info?.reasoning_efforts) ? info.reasoning_efforts : [];
  const efforts = raw.map((effort) => {
    const id = firstString2(effort?.id, effort?.value);
    if (!id) return null;
    return {
      id,
      name: firstString2(effort?.label, effort?.name, id),
      ...typeof effort?.description === "string" ? { description: effort.description } : {},
      ...effort?.default === true ? { default: true } : {}
    };
  }).filter(Boolean);
  if (!efforts.length) return void 0;
  const preferred = efforts.find((effort) => effort.default)?.id ?? firstString2(info?.reasoning_effort);
  return {
    efforts: efforts.map(({ default: _default, ...effort }) => effort),
    ...preferred && efforts.some((effort) => effort.id === preferred) ? { defaultEffort: preferred } : {}
  };
}
function parseGrokModelCatalog(output = "", cache = null) {
  const discovered = [...String(output).matchAll(/^\s*[*-]\s+(\S+)(?:\s+\(([^)]+)\))?/gm)].map((match) => ({ id: match[1], name: match[2] ?? match[1] }));
  const cached = new Map(cacheEntries(cache).map(([id, value]) => [id, value?.info ?? value ?? {}]));
  const ids = [.../* @__PURE__ */ new Set([...discovered.map((model) => model.id), ...cached.keys()])];
  return ids.map((id) => {
    const fromOutput = discovered.find((model2) => model2.id === id);
    const info = cached.get(id) ?? {};
    const outputName = fromOutput?.name === "default" ? null : fromOutput?.name;
    const model = { id, name: firstString2(info.name, info.model, outputName, id) };
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
function createGrokCatalogLoader({
  env = process.env,
  home = homedir4(),
  grokHome,
  cliPath = env.DOCKYARD_GROK_CLI || "grok",
  commandRunner = null,
  timeoutMs = 3e4,
  readJson: readJson3 = readJsonFile,
  cacheTtlMs = Number(process.env.DOCKYARD_GROK_CATALOG_TTL_MS) || DEFAULT_CATALOG_TTL_MS2
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
      const cache = await readJson3(join7(resolvedHome, "models_cache.json"));
      let value;
      if (typeof commandRunner === "function") {
        try {
          const result = await commandRunner(cliPath, ["models"], {
            env,
            timeoutMs,
            providerId: PROVIDER_ID4
          });
          const models = parseGrokModelCatalog(result.output, cache);
          value = {
            models,
            source: "official_grok_cli",
            ...models.length ? {} : { diagnostics: ["Grok \u5B98\u65B9 CLI \u6CA1\u6709\u8FD4\u56DE\u53EF\u7528\u6A21\u578B"] }
          };
        } catch (error) {
          value = {
            models: parseGrokModelCatalog("", cache),
            source: cache ? "official_grok_local_cache" : "official_grok_cli",
            diagnostics: [`Grok \u5B98\u65B9\u6A21\u578B\u76EE\u5F55\u8BFB\u53D6\u5931\u8D25\uFF1A${error.message}`]
          };
        }
      } else {
        value = {
          models: parseGrokModelCatalog("", cache),
          source: "official_grok_local_cache",
          ...cache ? {} : { diagnostics: [`\u672A\u627E\u5230 Grok \u5B9E\u65F6\u6A21\u578B\u7F13\u5B58\uFF1A${join7(resolvedHome, "models_cache.json")}`] }
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
var GrokOAuthDriver = class {
  constructor({
    authFilePath,
    env = process.env,
    home = homedir4(),
    grokHome,
    catalogLoader = null,
    oauthAuthorizer = null,
    cliPath = env.DOCKYARD_GROK_CLI || "grok",
    commandRunner = runCliCommand,
    requestExecutor = null,
    timeoutMs = 3e4
  } = {}) {
    this.env = env;
    this.grokHome = grokHomePath({ env, home, grokHome });
    this.authFilePath = authFilePath ?? join7(this.grokHome, "auth.json");
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
      timeoutMs
    });
    this.oauthAuthorizer = oauthAuthorizer ?? createCliOAuthAuthorizer({
      providerId: PROVIDER_ID4,
      cliPath,
      loginArgs: ["login", "--oauth"],
      environmentKey: "GROK_HOME",
      environment: env,
      profileDirectory: this.grokHome,
      browserOpened: true,
      instructions: "\u5DF2\u542F\u52A8\u5B98\u65B9 Grok OAuth \u767B\u5F55\u3002\u8BF7\u5728 auth.x.ai \u5B98\u65B9\u7F51\u9875\u5B8C\u6210\u767B\u5F55\uFF0C\u5B8C\u6210\u540E\u56DE\u5230 Dockyard DSH\u3002",
      importCredentials: (raw, context) => this.#importOAuthState(raw, context)
    });
  }
  async discover(context = {}) {
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
    const raw = await readJsonFile(this.authFilePath);
    if (!raw) {
      return { candidates: [], source: this.authFilePath, diagnostics: [`\u672A\u53D1\u73B0 Grok OAuth \u6587\u4EF6\uFF1A${this.authFilePath}`] };
    }
    const candidates = parseGrokAuth(raw).map((tokens) => candidateFromTokens2(tokens, { source: "official_grok_oauth", now }));
    return {
      candidates,
      source: "official_grok_oauth",
      diagnostics: candidates.length ? [] : ["Grok OAuth \u6587\u4EF6\u5B58\u5728\uFF0C\u4F46\u6CA1\u6709\u53EF\u8BC6\u522B\u7684 access token"]
    };
  }
  async importAccount(candidate2, context = {}) {
    const tokens = candidate2?.[CREDENTIAL_SLOT3];
    if (!tokens) throw new Error("Grok candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    const credentialRef = createCredentialRef(PROVIDER_ID4, tokens.accountId);
    await context.secretStore.write(credentialRef, {
      type: "oauth",
      providerId: PROVIDER_ID4,
      access: tokens.access,
      refresh: tokens.refresh,
      accountId: tokens.accountId,
      expiresAt: tokens.expiresAt,
      issuer: tokens.issuer,
      clientId: tokens.clientId,
      scopes: tokens.scopes,
      scopeKey: tokens.scopeKey
    });
    return accountInput2(tokens, credentialRef, context.now instanceof Date ? context.now : /* @__PURE__ */ new Date());
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
      accounts.push(await this.importAccount(candidateFromTokens2(value, {
        source,
        now: context.now instanceof Date ? context.now : /* @__PURE__ */ new Date()
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
    const profileDir = await mkdtemp3(join7(tmpdir3(), "dockyard-grok-run-"));
    const authPath = join7(profileDir, "auth.json");
    const key = account.accountId ?? credential.accountId;
    const raw = {
      [key]: {
        key: credential.access,
        ...credential.refresh ? { refresh_token: credential.refresh } : {},
        user_id: credential.accountId ?? account.accountId,
        ...account.email ? { email: account.email } : {},
        ...account.subscription?.plan ? { subscription_level: account.subscription.plan } : {},
        ...credential.expiresAt ? { expires_at: credential.expiresAt } : {}
      }
    };
    await writeFile2(authPath, JSON.stringify(raw), { mode: 384 });
    return { profileDir, authPath, credential, env: grokCommandEnvironment(this.env, profileDir) };
  }
  async #finishCredentialEnvironment(prepared, account, context = {}) {
    try {
      const raw = JSON.parse(await readFile4(prepared.authPath, "utf8"));
      const updated = parseGrokAuth(raw).find((value) => value.accountId === (account.accountId ?? prepared.credential.accountId)) ?? parseGrokAuth(raw)[0];
      if (updated && context.secretStore) {
        const credentialRef = account.auth?.credentialRef ?? account.credentialRef;
        await context.secretStore.write(credentialRef, {
          ...prepared.credential,
          access: updated.access,
          ...updated.refresh ? { refresh: updated.refresh } : {},
          ...updated.expiresAt ? { expiresAt: updated.expiresAt } : {},
          accountId: updated.accountId,
          lastRefreshedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return updated;
    } catch {
      return null;
    } finally {
      await rm3(prepared.profileDir, { recursive: true, force: true }).catch(() => {
      });
    }
  }
  async refreshAccount(account, context = {}) {
    const prepared = await this.#prepareCredentialEnvironment(account, context);
    let updated = null;
    try {
      await this.commandRunner(this.cliPath, ["models"], {
        env: prepared.env,
        timeoutMs: this.timeoutMs,
        providerId: PROVIDER_ID4
      });
    } catch (error) {
      error.authExpired = error.code === 401 || /auth|login|expired|credential|access token.{0,80}(?:valid|invalid|expired|revok)/i.test(String(error.message));
      throw error;
    } finally {
      updated = await this.#finishCredentialEnvironment(prepared, account, context);
    }
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
    return {
      refresh: {
        accessTokenExpiresAt: updated?.expiresAt ?? account.refresh?.accessTokenExpiresAt ?? null,
        nextRefreshAt: null,
        lastRefreshedAt: now.toISOString(),
        refreshable: Boolean(updated?.refresh ?? prepared.credential.refresh)
      }
    };
  }
  async getQuota(account, context = {}) {
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
    return {
      quota: {
        remaining: null,
        limit: null,
        unit: null,
        resetAt: null,
        windows: [],
        updatedAt: now.toISOString(),
        source: "official_grok_cli"
      },
      subscription: { ...account.subscription },
      resources: {
        quotaDiagnostic: "Grok \u5B98\u65B9 CLI/\u516C\u5F00\u6587\u6863\u6CA1\u6709\u63D0\u4F9B\u53EF\u4F9D\u8D56\u7684\u8BA2\u9605\u989D\u5EA6 JSON\uFF1BDockyard \u4E0D\u663E\u793A\u4F30\u7B97\u767E\u5206\u6BD4"
      }
    };
  }
  async getCatalog(context = {}) {
    return this.catalogLoader({ force: Boolean(context.force) });
  }
  async invoke(request, invocation, context = {}) {
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") throw new Error("Grok native invocation transport is not mounted");
    const account = invocation?.account;
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
        context: { ...context, env: prepared.env }
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
  async stream(request, invocation, context = {}) {
    return this.invoke(request, invocation, context);
  }
};
function createGrokDriver(options = {}) {
  return new GrokOAuthDriver(options);
}
var grokDriverConstants = Object.freeze({ providerId: PROVIDER_ID4 });

// modules/provider-grok/src/native-transport.mjs
var PROVIDER_ID5 = "grok";
var DEFAULT_ENDPOINT2 = "https://api.x.ai/v1/chat/completions";
function firstString3(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}
function toolCallPart(part) {
  const type = String(part?.type ?? "").toLowerCase().replace(/[_-]/g, "");
  return type === "toolcall" || type === "functioncall" || type === "tooluse" ? part : null;
}
async function openAiContent(content, attachments) {
  const values = Array.isArray(content) ? content : [content];
  const blocks = [];
  for (const part of values) {
    if (typeof part === "string") {
      if (part) blocks.push({ type: "text", text: part });
      continue;
    }
    if (!part || typeof part !== "object") continue;
    if (part.type === "image") {
      const image = await resolveImageData(part, attachments);
      if (!image) throw nativeProviderError(PROVIDER_ID5, "image attachment could not be resolved");
      blocks.push({ type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.data}` } });
      continue;
    }
    if (part.type === "tool-result" || part.type === "tool_result") {
      blocks.push({ type: "text", text: `[Tool Result ${part.toolCallId ?? part.id ?? ""}]
${textFromContent(part.content ?? part.output ?? part.result ?? part.text)}` });
      continue;
    }
    const call = toolCallPart(part);
    if (call) {
      blocks.push({ type: "text", text: `[Tool Call ${call.name ?? call.function?.name ?? "tool"}] ${JSON.stringify(parseToolArguments(call.arguments ?? call.input ?? call.function?.arguments))}` });
      continue;
    }
    const text2 = textFromContent(part);
    if (text2) blocks.push({ type: "text", text: text2 });
  }
  return blocks;
}
async function buildGrokMessages(request, attachments) {
  const result = [];
  if (typeof request.system === "string" && request.system.length > 0) {
    result.push({ role: "system", content: request.system });
  }
  for (const message of Array.isArray(request.messages) ? request.messages : []) {
    const role = message?.role === "assistant" ? "assistant" : message?.role === "tool" ? "tool" : "user";
    if (role === "tool") {
      result.push({
        role: "tool",
        tool_call_id: firstString3(message.toolCallId, message.tool_call_id, message.id, "tool-result"),
        content: textFromContent(message.content ?? message.text ?? message.output ?? message.result)
      });
      continue;
    }
    const content = await openAiContent(message?.content ?? message?.text, attachments);
    const calls = (Array.isArray(message?.content) ? message.content : [message?.content]).map(toolCallPart).filter(Boolean).map((call, index) => ({
      id: firstString3(call.id, call.toolCallId, call.tool_call_id, `tool-${index}`),
      type: "function",
      function: {
        name: firstString3(call.name, call.function?.name, "tool"),
        arguments: typeof (call.arguments ?? call.function?.arguments) === "string" ? call.arguments ?? call.function.arguments : JSON.stringify(call.arguments ?? call.input ?? call.function?.arguments ?? {})
      }
    }));
    const messageValue = {
      role,
      content: content.length === 0 ? "" : content.length === 1 && content[0].type === "text" ? content[0].text : content
    };
    if (role === "assistant" && calls.length > 0) messageValue.tool_calls = calls;
    result.push(messageValue);
  }
  if (!result.some((message) => message.role === "user")) result.push({ role: "user", content: "Continue the conversation." });
  return result;
}
function buildGrokTools(tools) {
  if (!Array.isArray(tools)) return void 0;
  const result = tools.map((tool) => ({
    type: "function",
    function: {
      name: tool?.name ?? tool?.function?.name ?? "tool",
      ...tool?.description ? { description: String(tool.description) } : {},
      parameters: tool?.parameters ?? tool?.input_schema ?? tool?.function?.parameters ?? { type: "object" }
    }
  }));
  return result.length > 0 ? result : void 0;
}
async function buildGrokRequest(request = {}, context = {}) {
  const body = {
    model: request.model,
    messages: await buildGrokMessages(request, context.attachments),
    stream: true,
    stream_options: { include_usage: true }
  };
  if (request.temperature !== void 0) body.temperature = request.temperature;
  const maxTokens = request.maxTokens ?? request.modelContext?.maxTokens;
  if (Number.isInteger(maxTokens) && maxTokens > 0) body.max_tokens = maxTokens;
  if (request.reasoningEffort) body.reasoning_effort = request.reasoningEffort;
  const tools = buildGrokTools(request.tools);
  if (tools) body.tools = tools;
  return body;
}
async function* streamGrokResponse(response) {
  let text2 = "";
  let textClosed = false;
  let usage = null;
  let stop = "stop";
  const tools = /* @__PURE__ */ new Map();
  yield { type: "block-start", index: 0, blockType: "text" };
  for await (const event of readSseEvents(response)) {
    const payload = event.data;
    if (!payload || typeof payload !== "object") continue;
    if (payload.error) {
      throw nativeProviderError(PROVIDER_ID5, payload.error.message ?? "xAI returned an error", {
        status: payload.error.code ?? payload.error.status,
        body: payload.error
      });
    }
    usage = normalizeUsage(payload.usage) ?? usage;
    const choice = payload.choices?.[0];
    if (!choice) continue;
    stop = choice.finish_reason ?? stop;
    const delta = choice.delta ?? {};
    const content = typeof delta.content === "string" ? delta.content : textFromContent(delta.content);
    if (content) {
      text2 += content;
      yield { type: "text-delta", index: 0, text: content };
    }
    const reasoning = delta.reasoning_content ?? delta.reasoningContent;
    if (reasoning) yield { type: "reasoning-delta", index: 1, text: String(reasoning) };
    for (const call of Array.isArray(delta.tool_calls) ? delta.tool_calls : []) {
      const key = Number(call.index ?? tools.size);
      if (!tools.has(key)) {
        if (!textClosed) {
          yield { type: "block-end", index: 0, block: { type: "text", text: text2 } };
          textClosed = true;
        }
        const state2 = {
          index: key + 1,
          id: firstString3(call.id, `tool-${key}`),
          name: firstString3(call.function?.name, call.name, "tool"),
          arguments: ""
        };
        tools.set(key, state2);
        yield { type: "block-start", index: state2.index, blockType: "tool-call" };
      }
      const state = tools.get(key);
      const argumentDelta = call.function?.arguments ?? call.arguments ?? "";
      if (call.id) state.id = call.id;
      if (call.function?.name) state.name = call.function.name;
      state.arguments += argumentDelta;
      if (argumentDelta) {
        yield { type: "tool-call-delta", index: state.index, id: state.id, name: state.name, argumentsDelta: argumentDelta };
      }
    }
  }
  if (!textClosed) yield { type: "block-end", index: 0, block: { type: "text", text: text2 } };
  for (const state of tools.values()) {
    yield { type: "block-end", index: state.index, block: { type: "tool-call", id: state.id, name: state.name, arguments: state.arguments || "{}" } };
  }
  if (usage) yield { type: "usage", usage };
  yield { type: "finish", reason: finishReason(stop) };
}
function createGrokNativeExecutor({
  endpoint: endpoint2 = process.env.DOCKYARD_GROK_ENDPOINT || DEFAULT_ENDPOINT2,
  env = process.env,
  timeoutMs = 3e5,
  fetchImpl = fetch,
  userAgent = process.env.DOCKYARD_GROK_USER_AGENT
} = {}) {
  const safeEndpoint = validateNativeEndpoint(endpoint2, { providerId: PROVIDER_ID5 });
  const executor = async ({ request = {}, credential, context = {} } = {}) => {
    const effectiveEnv = { ...env, ...context.env ?? {} };
    const token = firstString3(credential?.access, effectiveEnv.XAI_API_KEY, effectiveEnv.GROK_API_KEY);
    if (!token) {
      const error = nativeProviderError(PROVIDER_ID5, "Grok OAuth token is missing from secure storage");
      error.authExpired = true;
      throw error;
    }
    const headers = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "text/event-stream"
    };
    const configuredUserAgent = userAgent ?? effectiveEnv.DOCKYARD_GROK_USER_AGENT;
    if (configuredUserAgent) headers["user-agent"] = configuredUserAgent;
    const response = await fetchNativeResponse(safeEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(await buildGrokRequest(request, context)),
      signal: context.signal
    }, { providerId: PROVIDER_ID5, timeoutMs, fetchImpl });
    return streamGrokResponse(response);
  };
  executor.nativeTransport = "xai-chat-completions";
  return executor;
}
var grokNativeTransportConstants = Object.freeze({
  providerId: PROVIDER_ID5,
  endpoint: DEFAULT_ENDPOINT2
});

// modules/provider-grok/src/index.mjs
function createGrokModule({ driver = {} } = {}) {
  return defineProviderModule({
    id: "grok",
    displayName: "Grok",
    capabilities: [
      "oauth_discovery",
      "oauth_import",
      "oauth_authorization",
      "oauth_refresh",
      "quota",
      "catalog",
      "invoke",
      "stream"
    ],
    driver
  });
}

// modules/provider-claude/src/driver.mjs
import { createHash as createHash5 } from "node:crypto";

// packages/oauth/src/cli-status-authorizer.mjs
import { randomUUID as randomUUID4 } from "node:crypto";
import { spawn as spawn5 } from "node:child_process";
var URL_PATTERN2 = /https?:\/\/[^\s"'<>]+/gi;
var CHILD_STOP_GRACE_MS2 = 2e3;
function cleanUrl2(value) {
  return String(value ?? "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/[),.;]+$/, "");
}
function publicSession2(session) {
  return {
    sessionId: session.sessionId,
    providerId: session.providerId,
    status: session.status ?? (session.exitCode === null ? "pending" : "processing"),
    authorizationUrl: session.authorizationUrl,
    instructions: session.instructions,
    startedAt: session.startedAt,
    diagnostic: session.diagnostic ?? null,
    ...session.browserOpened ? { browserOpened: true } : {}
  };
}
function stopChild2(session) {
  const child = session.child;
  if (!child || session.exitCode !== null) return Promise.resolve();
  return new Promise((resolve2) => {
    let settled = false;
    let timer;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (session.exitCode === null) session.exitCode = -1;
      resolve2();
    };
    child.once("close", finish);
    if (session.exitCode !== null) {
      finish();
      return;
    }
    try {
      child.kill("SIGTERM");
    } catch {
      finish();
      return;
    }
    timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
      }
      finish();
    }, CHILD_STOP_GRACE_MS2);
    timer.unref?.();
  });
}
function createCliStatusAuthorizer({
  providerId,
  cliPath,
  loginArgs,
  environment = process.env,
  timeoutMs = 10 * 60 * 1e3,
  instructions = "\u8BF7\u5728\u5B98\u65B9\u6388\u6743\u9875\u9762\u5B8C\u6210\u767B\u5F55\uFF0C\u5B8C\u6210\u540E\u56DE\u5230 Dockyard DSH\u3002",
  browserOpened = false,
  importStatus
} = {}) {
  if (!providerId || !cliPath || !Array.isArray(loginArgs) || loginArgs.length === 0) {
    throw new Error(`Invalid CLI status authorizer configuration for ${providerId ?? "provider"}`);
  }
  if (typeof importStatus !== "function") throw new Error(`Missing status importer for ${providerId}`);
  const sessions = /* @__PURE__ */ new Map();
  function capture(session, chunk) {
    session.output = `${session.output}${String(chunk ?? "")}`.slice(-32e3);
    if (!session.authorizationUrl) {
      const match = session.output.match(URL_PATTERN2);
      if (match?.[0]) session.authorizationUrl = cleanUrl2(match[0]);
    }
  }
  async function finalize(session, context) {
    if (session.result) return session.result;
    if (session.finalizing) return session.finalizing;
    session.finalizing = (async () => {
      try {
        if (session.timedOut) {
          session.status = "failed";
          session.diagnostic = "\u5B98\u65B9 OAuth \u767B\u5F55\u8D85\u65F6\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7\u3002";
          return publicSession2(session);
        }
        if (session.launchError) {
          session.status = "failed";
          session.diagnostic = `\u65E0\u6CD5\u542F\u52A8\u5B98\u65B9\u767B\u5F55\u547D\u4EE4\uFF1A${session.launchError}`;
          return publicSession2(session);
        }
        if (session.exitCode !== 0) {
          session.status = "failed";
          session.diagnostic = `\u5B98\u65B9 OAuth \u767B\u5F55\u672A\u5B8C\u6210\uFF08\u9000\u51FA\u7801 ${session.exitCode ?? "unknown"}\uFF09\u3002`;
          return publicSession2(session);
        }
        const accounts = await importStatus(context);
        if (!Array.isArray(accounts) || accounts.length === 0) {
          session.status = "failed";
          session.diagnostic = "\u5B98\u65B9\u767B\u5F55\u5B8C\u6210\uFF0C\u4F46 provider status \u6CA1\u6709\u8FD4\u56DE\u53EF\u63A5\u5165\u7684\u8BA2\u9605\u8D26\u53F7\u3002";
          return publicSession2(session);
        }
        session.status = "completed";
        session.result = { ...publicSession2(session), accounts, diagnostic: null };
        return session.result;
      } catch (error) {
        session.status = "failed";
        session.diagnostic = redactError(error);
        return publicSession2(session);
      } finally {
        if (session.timer) clearTimeout(session.timer);
      }
    })();
    return session.finalizing;
  }
  async function begin() {
    const session = {
      sessionId: `${providerId}:${randomUUID4()}`,
      providerId,
      browserOpened,
      status: "pending",
      authorizationUrl: null,
      instructions,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exitCode: null,
      launchError: null,
      output: "",
      timedOut: false,
      child: null,
      timer: null,
      finalizing: null,
      result: null,
      diagnostic: null
    };
    sessions.set(session.sessionId, session);
    try {
      const child = spawn5(cliPath, loginArgs, {
        env: environment,
        stdio: ["ignore", "pipe", "pipe"]
      });
      session.child = child;
      child.stdout?.on("data", (chunk) => capture(session, chunk));
      child.stderr?.on("data", (chunk) => capture(session, chunk));
      child.once("error", (error) => {
        session.launchError = redactError(error);
        session.exitCode = -1;
      });
      child.once("close", (code) => {
        session.exitCode = typeof code === "number" ? code : -1;
      });
      session.timer = setTimeout(() => {
        if (session.exitCode !== null) return;
        session.timedOut = true;
        void stopChild2(session);
      }, timeoutMs);
      session.timer.unref?.();
    } catch (error) {
      session.launchError = redactError(error);
      session.exitCode = -1;
    }
    return publicSession2(session);
  }
  async function poll(sessionId, context) {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        providerId,
        status: "missing",
        instructions,
        diagnostic: "OAuth \u767B\u5F55\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u7ED3\u675F\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7\u3002"
      };
    }
    if (session.exitCode === null) return publicSession2(session);
    const result = await finalize(session, context);
    if (result.status !== "pending" && result.status !== "processing") sessions.delete(sessionId);
    return result;
  }
  async function cancel(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return { sessionId, providerId, status: "missing" };
    if (session.timer) clearTimeout(session.timer);
    await stopChild2(session);
    sessions.delete(sessionId);
    return { sessionId, providerId, status: "cancelled" };
  }
  return Object.freeze({ begin, poll, cancel });
}

// modules/provider-claude/src/driver.mjs
var PROVIDER_ID6 = "claude";
var CREDENTIAL_SLOT4 = Symbol("dockyard-claude-session");
function hash4(value) {
  return createHash5("sha256").update(String(value)).digest("hex");
}
function firstString4(...values) {
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
  return method.includes("oauth") || method.includes("claude") || method.includes("subscription") || provider.includes("claude") || provider.includes("firstparty");
}
function statusIdentity(value) {
  const profile = value.profile ?? value.user ?? value.account ?? {};
  const email = firstString4(value.email, value.userEmail, profile.email, profile.userEmail);
  const accountId = firstString4(
    value.accountId,
    value.account_id,
    value.userId,
    value.user_id,
    profile.accountId,
    profile.id,
    email
  ) ?? "claude:active";
  const plan = firstString4(
    value.plan,
    value.planName,
    value.plan_type,
    value.subscriptionType,
    value.subscription?.plan,
    value.subscription?.name
  );
  const displayName = firstString4(value.name, profile.name, email, accountId);
  return { accountId, email, plan, displayName };
}
function parseClaudeAuthStatus(output) {
  const value = statusObject(null, output);
  const identity = statusIdentity(value);
  return {
    loggedIn: statusLoggedIn(value, output),
    authMethod: firstString4(value.authMethod, value.auth_method),
    apiProvider: firstString4(value.apiProvider, value.api_provider),
    apiKeySource: firstString4(value.apiKeySource, value.api_key_source),
    isApiKey: isApiKeyStatus(value),
    isSubscription: isSubscriptionStatus(value),
    ...identity,
    raw: value
  };
}
function candidateFromStatus(status, { source = "official_claude_cli", imported = false } = {}) {
  const credentialRef = createCredentialRef(PROVIDER_ID6, status.accountId);
  const candidate2 = {
    candidateId: `claude:${hash4(status.accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID6,
    source,
    accountId: status.accountId,
    displayName: status.displayName ?? status.accountId,
    email: status.email,
    subscription: { plan: status.plan, status: status.isSubscription ? "active" : null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: false
    },
    credentialRef,
    imported,
    status: status.isSubscription ? "available" : "degraded",
    diagnostic: status.isApiKey ? "\u5F53\u524D Claude CLI \u4F7F\u7528 API key\uFF0C\u4E0D\u662F Claude Pro/Max \u8BA2\u9605 OAuth" : status.isSubscription ? null : "Claude CLI \u6CA1\u6709\u8FD4\u56DE\u53EF\u8BC6\u522B\u7684 Claude \u8BA2\u9605 OAuth \u72B6\u6001"
  };
  Object.defineProperty(candidate2, CREDENTIAL_SLOT4, {
    value: {
      type: "official_cli_session",
      providerId: PROVIDER_ID6,
      accountId: status.accountId,
      authMethod: status.authMethod
    },
    enumerable: false
  });
  return candidate2;
}
function summarizeClaudeCandidate(candidate2) {
  return {
    providerId: PROVIDER_ID6,
    candidateId: candidate2.candidateId,
    source: candidate2.source,
    accountId: candidate2.accountId,
    displayName: candidate2.displayName,
    email: candidate2.email,
    subscription: { ...candidate2.subscription },
    refresh: { ...candidate2.refresh },
    imported: Boolean(candidate2.imported),
    status: candidate2.status ?? "available",
    diagnostic: candidate2.diagnostic ?? null
  };
}
function catalogModel(model) {
  const reasoning = model?.thinkingLevelMap && typeof model.thinkingLevelMap === "object" ? {
    efforts: Object.keys(model.thinkingLevelMap).filter((id) => id !== "off").map((id) => ({ id, name: id.replace(/[-_]+/g, " ").replace(/\b\w/g, (value) => value.toUpperCase()) }))
  } : model?.reasoning && typeof model.reasoning === "object" ? model.reasoning : void 0;
  return {
    id: model.id,
    name: model.name ?? model.id,
    ...Array.isArray(model.input) ? { inputModalities: [...model.input] } : {},
    ...Number.isInteger(model.contextWindow) ? { contextWindow: model.contextWindow } : {},
    ...Number.isInteger(model.maxTokens) ? { maxTokens: model.maxTokens } : {},
    ...reasoning ? { reasoning } : {}
  };
}
function createClaudeCatalogLoader({ registryLoader = null } = {}) {
  let cached = null;
  return async function loadCatalog({ force = false } = {}) {
    if (cached && !force) return cached;
    const registry = typeof registryLoader === "function" ? await registryLoader() : [];
    const modelsById = /* @__PURE__ */ new Map();
    for (const rawModel of Array.isArray(registry) ? registry : []) {
      if (!rawModel || rawModel.provider !== "anthropic" && rawModel.api !== "anthropic-messages") continue;
      const model = catalogModel(rawModel);
      if (typeof model.id !== "string" || model.id.length === 0) continue;
      const previous = modelsById.get(model.id);
      if (!previous) {
        modelsById.set(model.id, model);
        continue;
      }
      modelsById.set(model.id, {
        ...previous,
        ...previous.name === model.id && model.name !== model.id ? { name: model.name } : {},
        ...previous.inputModalities === void 0 && model.inputModalities !== void 0 ? { inputModalities: [...model.inputModalities] } : {},
        ...previous.contextWindow === void 0 && model.contextWindow !== void 0 ? { contextWindow: model.contextWindow } : {},
        ...previous.maxTokens === void 0 && model.maxTokens !== void 0 ? { maxTokens: model.maxTokens } : {},
        ...previous.reasoning === void 0 && model.reasoning !== void 0 ? { reasoning: model.reasoning } : {}
      });
    }
    const models = [...modelsById.values()];
    cached = {
      models,
      source: "dsh_live_provider_registry",
      ...models.length ? {} : { diagnostics: ["Claude CLI \u6CA1\u6709\u516C\u5F00\u6A21\u578B\u76EE\u5F55\uFF0C\u4E14\u5F53\u524D DSH registry \u672A\u8FD4\u56DE Anthropic \u6A21\u578B"] }
    };
    return cached;
  };
}
var ClaudeSubscriptionDriver = class {
  constructor({
    cliPath = process.env.DOCKYARD_CLAUDE_CLI || "claude",
    env = process.env,
    commandRunner = runCliCommand,
    requestExecutor = null,
    catalogLoader = null
  } = {}) {
    this.cliPath = cliPath;
    this.env = env;
    this.commandRunner = commandRunner;
    this.requestExecutor = requestExecutor;
    this.catalogLoader = catalogLoader ?? createClaudeCatalogLoader();
    this.oauthAuthorizer = createCliStatusAuthorizer({
      providerId: PROVIDER_ID6,
      cliPath,
      loginArgs: ["auth", "login", "--claudeai"],
      environment: env,
      browserOpened: true,
      instructions: "\u5DF2\u542F\u52A8\u5B98\u65B9 Claude \u8BA2\u9605 OAuth \u767B\u5F55\u3002\u8BF7\u5728 Claude \u5B98\u65B9\u7F51\u9875\u5B8C\u6210\u767B\u5F55\uFF0C\u5B8C\u6210\u540E\u56DE\u5230 Dockyard DSH\u3002",
      importStatus: async (context) => {
        const result = await this.#readStatus();
        const status = parseClaudeAuthStatus(result.output);
        if (!status.loggedIn || !status.isSubscription) return [];
        return [await this.importAccount(candidateFromStatus(status), context)];
      }
    });
  }
  async #readStatus(signal) {
    return this.commandRunner(this.cliPath, ["auth", "status", "--json"], {
      env: this.env,
      providerId: PROVIDER_ID6,
      timeoutMs: 3e4,
      ...signal ? { signal } : {}
    });
  }
  async discover() {
    try {
      const result = await this.#readStatus();
      const status = parseClaudeAuthStatus(result.output);
      if (!status.loggedIn) {
        return { candidates: [], source: "official_claude_cli", diagnostics: ["Claude CLI \u5F53\u524D\u672A\u767B\u5F55"] };
      }
      if (status.isApiKey) {
        return { candidates: [], source: "official_claude_cli", diagnostics: ["Claude CLI \u5F53\u524D\u4F7F\u7528 API key\uFF1B\u8BF7\u4F7F\u7528 Claude \u8BA2\u9605 OAuth \u767B\u5F55"] };
      }
      if (!status.isSubscription) {
        return { candidates: [], source: "official_claude_cli", diagnostics: ["Claude CLI \u5F53\u524D\u767B\u5F55\u6001\u4E0D\u662F\u53EF\u8BC6\u522B\u7684 Claude \u8BA2\u9605 OAuth"] };
      }
      return { candidates: [candidateFromStatus(status, { source: "official_claude_cli" })], source: "official_claude_cli", diagnostics: [] };
    } catch (error) {
      return { candidates: [], source: "official_claude_cli", diagnostics: [`\u65E0\u6CD5\u8BFB\u53D6 Claude \u5B98\u65B9\u767B\u5F55\u6001\uFF1A${error.message}`] };
    }
  }
  async importAccount(candidate2, context = {}) {
    const session = candidate2?.[CREDENTIAL_SLOT4];
    if (!session) throw new Error("Claude candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    await context.secretStore.write(candidate2.credentialRef, session);
    return {
      providerId: PROVIDER_ID6,
      accountId: candidate2.accountId,
      credentialRef: candidate2.credentialRef,
      displayName: candidate2.displayName,
      email: candidate2.email,
      auth: { kind: "official_cli_session", scopes: [] },
      subscription: { ...candidate2.subscription },
      refresh: { ...candidate2.refresh },
      resources: {
        transport: "anthropic_messages_sse",
        accountScope: "active_cli_session",
        quotaSource: "official_cli_status"
      }
    };
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
      refresh: { lastRefreshedAt: (context.now instanceof Date ? context.now : /* @__PURE__ */ new Date()).toISOString(), refreshable: false }
    };
  }
  async getQuota(account, context = {}) {
    const result = await this.#readStatus(context.signal);
    const status = parseClaudeAuthStatus(result.output);
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
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
        source: "claude_cli_status"
      },
      subscription: { plan: status.plan, status: status.isSubscription ? "active" : null, expiresAt: null },
      resources: {
        quotaDiagnostic: windows.length ? null : "Claude \u5B98\u65B9 CLI auth status \u672A\u8FD4\u56DE\u5B9E\u65F6\u8BA2\u9605\u989D\u5EA6\uFF1BDockyard \u4E0D\u663E\u793A\u4F30\u7B97\u767E\u5206\u6BD4"
      }
    };
  }
  async getCatalog(context = {}) {
    return this.catalogLoader({ force: Boolean(context.force) });
  }
  async invoke(request, invocation, context = {}) {
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") throw new Error("Claude native invocation transport is not mounted");
    return executor({ request, invocation, context });
  }
  async stream(request, invocation, context = {}) {
    return this.invoke(request, invocation, context);
  }
};
function createClaudeDriver(options = {}) {
  return new ClaudeSubscriptionDriver(options);
}
var claudeDriverConstants = Object.freeze({ providerId: PROVIDER_ID6 });

// modules/provider-claude/src/native-transport.mjs
import { readFile as readFile5 } from "node:fs/promises";
import { homedir as homedir5 } from "node:os";
import { join as join8 } from "node:path";
var PROVIDER_ID7 = "claude";
var DEFAULT_ENDPOINT3 = "https://api.anthropic.com/v1/messages";
function firstString5(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}
async function readJson(path) {
  try {
    return JSON.parse(await readFile5(path, "utf8"));
  } catch {
    return null;
  }
}
function oauthTokenFromJson(value) {
  const oauth = value?.claudeAiOauth ?? value?.oauth ?? value?.credentials ?? value;
  const token = firstString5(oauth?.accessToken, oauth?.access_token, value?.accessToken, value?.access_token);
  return token ? { token, kind: "oauth" } : null;
}
async function resolveClaudeAccessToken({
  credential,
  env = process.env,
  home = homedir5()
} = {}) {
  const stored = firstString5(credential?.access, credential?.token);
  if (stored) return { token: stored, kind: credential?.type === "api_key" ? "apiKey" : "oauth" };
  const apiKey = firstString5(env.ANTHROPIC_API_KEY);
  if (apiKey) return { token: apiKey, kind: "apiKey" };
  const envToken = firstString5(env.CLAUDE_CODE_OAUTH_TOKEN, env.ANTHROPIC_AUTH_TOKEN);
  if (envToken) return { token: envToken, kind: "oauth" };
  for (const path of [
    join8(home, ".claude", ".credentials.json"),
    join8(home, ".opencodex", "claude_desktop_auth.json")
  ]) {
    const found = oauthTokenFromJson(await readJson(path));
    if (found) return found;
  }
  return null;
}
function toolCallPart2(part) {
  const type = String(part?.type ?? "").toLowerCase().replace(/[_-]/g, "");
  return type === "toolcall" || type === "tooluse" || type === "functioncall" ? part : null;
}
async function anthropicContent(content, attachments) {
  const values = Array.isArray(content) ? content : [content];
  const blocks = [];
  for (const part of values) {
    if (typeof part === "string") {
      if (part) blocks.push({ type: "text", text: part });
      continue;
    }
    if (!part || typeof part !== "object") continue;
    if (part.type === "image") {
      const image = await resolveImageData(part, attachments);
      if (!image) throw nativeProviderError(PROVIDER_ID7, "image attachment could not be resolved");
      blocks.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
      continue;
    }
    if (part.type === "tool-result" || part.type === "tool_result") {
      blocks.push({
        type: "tool_result",
        tool_use_id: firstString5(part.toolCallId, part.tool_call_id, part.id, "tool-result"),
        content: textFromContent(part.content ?? part.output ?? part.result ?? part.text),
        ...part.isError || part.is_error ? { is_error: true } : {}
      });
      continue;
    }
    const tool = toolCallPart2(part);
    if (tool) {
      blocks.push({
        type: "tool_use",
        id: firstString5(tool.id, tool.toolCallId, tool.tool_call_id, `tool-${blocks.length}`),
        name: firstString5(tool.name, tool.function?.name, "tool"),
        input: parseToolArguments(tool.arguments ?? tool.input ?? tool.function?.arguments)
      });
      continue;
    }
    const text2 = textFromContent(part);
    if (text2) blocks.push({ type: "text", text: text2 });
  }
  return blocks;
}
async function buildAnthropicMessages(request, attachments) {
  const messages = [];
  for (const message of Array.isArray(request.messages) ? request.messages : []) {
    const role = message?.role === "assistant" ? "assistant" : message?.role === "tool" ? "user" : "user";
    const content = await anthropicContent(message?.content ?? message?.text, attachments);
    if (role === "user" && message?.role === "tool" && content.length === 0) continue;
    if (content.length > 0) messages.push({ role, content: content.length === 1 && content[0].type === "text" ? content[0].text : content });
  }
  if (messages.length === 0) messages.push({ role: "user", content: "Continue the conversation." });
  return messages;
}
function buildAnthropicTools(tools) {
  if (!Array.isArray(tools)) return void 0;
  const result = tools.map((tool) => ({
    name: firstString5(tool?.name, tool?.function?.name, "tool"),
    ...tool?.description ? { description: String(tool.description) } : {},
    input_schema: tool?.parameters ?? tool?.input_schema ?? tool?.function?.parameters ?? { type: "object" }
  }));
  return result.length > 0 ? result : void 0;
}
function thinkingBudget(request) {
  const value = request?.reasoningBudget ?? request?.thinkingBudget;
  if (Number.isInteger(value) && value > 0) return value;
  const effort = String(request?.reasoningEffort ?? "").toLowerCase();
  if (effort === "high" || effort === "xhigh") return 16e3;
  if (effort === "medium") return 8e3;
  if (effort === "low") return 4e3;
  return null;
}
async function buildClaudeRequest(request = {}, context = {}) {
  const body = {
    model: request.model,
    messages: await buildAnthropicMessages(request, context.attachments),
    max_tokens: Number.isInteger(request.maxTokens) ? request.maxTokens : Number.isInteger(request.modelContext?.maxTokens) ? request.modelContext.maxTokens : 4096,
    stream: true
  };
  if (typeof request.system === "string" && request.system.length > 0) body.system = request.system;
  if (request.temperature !== void 0) body.temperature = request.temperature;
  const tools = buildAnthropicTools(request.tools);
  if (tools) body.tools = tools;
  const budget = thinkingBudget(request);
  if (budget && body.max_tokens > budget) body.thinking = { type: "enabled", budget_tokens: budget };
  return body;
}
function headersForToken(auth) {
  const headers = {
    "content-type": "application/json",
    accept: "text/event-stream",
    "anthropic-version": "2023-06-01"
  };
  if (auth.kind === "apiKey" || auth.token.startsWith("sk-ant-")) {
    headers["x-api-key"] = auth.token;
  } else {
    headers.authorization = `Bearer ${auth.token}`;
    headers["anthropic-beta"] = "oauth-2025-04-20";
    headers["anthropic-client-platform"] = "DESKTOP_APP";
    headers["anthropic-client-version"] = "1.0.0";
  }
  return headers;
}
function mergeUsage(previous, next) {
  return next ? { ...previous ?? {}, ...next } : previous;
}
async function* streamClaudeResponse(response) {
  let text2 = "";
  let textClosed = false;
  let usage = null;
  let stop = "stop";
  const tools = /* @__PURE__ */ new Map();
  const reasoning = /* @__PURE__ */ new Map();
  yield { type: "block-start", index: 0, blockType: "text" };
  for await (const event of readSseEvents(response)) {
    const payload = event.data;
    if (!payload || typeof payload !== "object") continue;
    if (payload.type === "message_start") {
      usage = mergeUsage(usage, normalizeUsage(payload.message?.usage));
      continue;
    }
    if (payload.type === "content_block_start") {
      const block = payload.content_block ?? {};
      if (block.type === "tool_use") {
        if (!textClosed) {
          yield { type: "block-end", index: 0, block: { type: "text", text: text2 } };
          textClosed = true;
        }
        const index = Number(payload.index) + 1;
        tools.set(payload.index, {
          index,
          id: firstString5(block.id, `tool-${payload.index}`),
          name: firstString5(block.name, "tool"),
          arguments: ""
        });
        yield { type: "block-start", index, blockType: "tool-call" };
        continue;
      }
      if (block.type === "thinking" || block.type === "redacted_thinking") {
        const index = Number(payload.index) + 1;
        reasoning.set(payload.index, index);
        yield { type: "block-start", index, blockType: "reasoning" };
      }
      continue;
    }
    if (payload.type === "content_block_delta") {
      const delta = payload.delta ?? {};
      if (delta.type === "text_delta" && delta.text) {
        text2 += delta.text;
        yield { type: "text-delta", index: 0, text: delta.text };
      } else if (delta.type === "thinking_delta" && delta.thinking) {
        const index = reasoning.get(payload.index) ?? Number(payload.index) + 1;
        yield { type: "reasoning-delta", index, text: delta.thinking };
      } else if (delta.type === "input_json_delta" && tools.has(payload.index)) {
        const tool = tools.get(payload.index);
        tool.arguments += delta.partial_json ?? "";
        yield { type: "tool-call-delta", index: tool.index, id: tool.id, name: tool.name, argumentsDelta: delta.partial_json ?? "" };
      }
      continue;
    }
    if (payload.type === "message_delta") {
      stop = payload.delta?.stop_reason ?? stop;
      usage = mergeUsage(usage, normalizeUsage(payload.usage));
      continue;
    }
    if (payload.type === "error") {
      throw nativeProviderError(PROVIDER_ID7, payload.error?.message ?? "Anthropic returned an error", {
        status: payload.error?.status,
        body: payload.error
      });
    }
  }
  if (!textClosed) yield { type: "block-end", index: 0, block: { type: "text", text: text2 } };
  for (const tool of tools.values()) {
    yield {
      type: "block-end",
      index: tool.index,
      block: { type: "tool-call", id: tool.id, name: tool.name, arguments: tool.arguments || "{}" }
    };
  }
  if (usage) yield { type: "usage", usage };
  yield { type: "finish", reason: finishReason(stop) };
}
function createClaudeNativeExecutor({
  endpoint: endpoint2 = process.env.DOCKYARD_CLAUDE_ENDPOINT || DEFAULT_ENDPOINT3,
  env = process.env,
  home = homedir5(),
  timeoutMs = 3e5,
  fetchImpl = fetch,
  tokenResolver = resolveClaudeAccessToken
} = {}) {
  const safeEndpoint = validateNativeEndpoint(endpoint2, { providerId: PROVIDER_ID7 });
  const executor = async ({ request = {}, invocation, context = {} } = {}) => {
    let credential = null;
    if (context.secretStore) {
      const ref = invocation?.auth?.credentialRef ?? invocation?.account?.auth?.credentialRef ?? invocation?.account?.credentialRef;
      if (ref) credential = await context.secretStore.read(ref);
    }
    const auth = await tokenResolver({ credential, env: { ...env, ...context.env ?? {} }, home });
    if (!auth?.token) {
      const error = nativeProviderError(PROVIDER_ID7, "Claude OAuth token is unavailable; authorize Claude first");
      error.authExpired = true;
      throw error;
    }
    const body = await buildClaudeRequest(request, context);
    const response = await fetchNativeResponse(safeEndpoint, {
      method: "POST",
      headers: headersForToken(auth),
      body: JSON.stringify(body),
      signal: context.signal
    }, { providerId: PROVIDER_ID7, timeoutMs, fetchImpl });
    return streamClaudeResponse(response);
  };
  executor.nativeTransport = "anthropic-messages";
  return executor;
}
var claudeNativeTransportConstants = Object.freeze({
  providerId: PROVIDER_ID7,
  endpoint: DEFAULT_ENDPOINT3
});

// modules/provider-claude/src/index.mjs
function createClaudeModule({ driver = {} } = {}) {
  return defineProviderModule({
    id: "claude",
    displayName: "Claude",
    capabilities: [
      "oauth_discovery",
      "oauth_import",
      "oauth_authorization",
      "oauth_refresh",
      "quota",
      "catalog",
      "invoke",
      "stream"
    ],
    driver
  });
}

// modules/provider-cursor/src/driver.mjs
import { execFileSync as execFileSync3 } from "node:child_process";
import { createHash as createHash7, randomUUID as randomUUID7 } from "node:crypto";
import { homedir as homedir7 } from "node:os";

// modules/provider-cursor/src/native-transport.mjs
import { execFileSync as execFileSync2 } from "node:child_process";
import * as http2 from "node:http2";
import { homedir as homedir6 } from "node:os";
import { join as join9 } from "node:path";
import { randomBytes, randomUUID as randomUUID6 } from "node:crypto";

// modules/provider-cursor/src/native-protocol.mjs
import { createHash as createHash6, randomUUID as randomUUID5 } from "node:crypto";
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();
function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
function encodeVarint(value) {
  let current = BigInt(Math.max(0, Number(value) || 0));
  const result = [];
  while (current >= 0x80n) {
    result.push(Number(current & 0x7fn | 0x80n));
    current >>= 7n;
  }
  result.push(Number(current));
  return Uint8Array.from(result);
}
function fieldKey(field, wireType) {
  return encodeVarint(field << 3 | wireType);
}
function bytesField(field, value) {
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value instanceof Uint8Array ? value : Uint8Array.from(value ?? []);
  return concatBytes([fieldKey(field, 2), encodeVarint(bytes.byteLength), bytes]);
}
function stringField(field, value) {
  return bytesField(field, textEncoder.encode(String(value ?? "")));
}
function varintField(field, value) {
  return concatBytes([fieldKey(field, 0), encodeVarint(value)]);
}
function frameConnectMessage(message, flags = 0) {
  const payload = message instanceof Uint8Array ? message : Uint8Array.from(message ?? []);
  const header = new Uint8Array(5);
  header[0] = flags & 255;
  new DataView(header.buffer).setUint32(1, payload.byteLength, false);
  return concatBytes([header, payload]);
}
function decodeProtoFields(bytes) {
  const value = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes ?? []);
  const fields = [];
  let offset = 0;
  while (offset < value.length) {
    const key = readVarint(value, offset);
    if (!key) break;
    offset = key.offset;
    const field = Number(key.value >> 3n);
    const wireType = Number(key.value & 7n);
    if (wireType === 0) {
      const parsed = readVarint(value, offset);
      if (!parsed) break;
      offset = parsed.offset;
      fields.push({ field, wireType, value: Number(parsed.value) });
      continue;
    }
    if (wireType === 1) {
      if (offset + 8 > value.length) break;
      fields.push({ field, wireType, value: value.slice(offset, offset + 8) });
      offset += 8;
      continue;
    }
    if (wireType === 2) {
      const length = readVarint(value, offset);
      if (!length) break;
      offset = length.offset;
      const end = offset + Number(length.value);
      if (end > value.length) break;
      fields.push({ field, wireType, value: value.slice(offset, end) });
      offset = end;
      continue;
    }
    if (wireType === 5) {
      if (offset + 4 > value.length) break;
      fields.push({ field, wireType, value: value.slice(offset, offset + 4) });
      offset += 4;
      continue;
    }
    break;
  }
  return fields;
}
function readVarint(bytes, start) {
  let offset = start;
  let value = 0n;
  let shift = 0n;
  while (offset < bytes.length && shift <= 63n) {
    const byte = bytes[offset++];
    value |= BigInt(byte & 127) << shift;
    if ((byte & 128) === 0) return { value, offset };
    shift += 7n;
  }
  return null;
}
function firstBytes(fields, field) {
  return fields.find((entry) => entry.field === field && entry.wireType === 2)?.value ?? null;
}
function firstString6(fields, field) {
  const bytes = firstBytes(fields, field);
  return bytes ? textDecoder.decode(bytes) : "";
}
function sha256(bytes) {
  return new Uint8Array(createHash6("sha256").update(bytes).digest());
}
function putBlob(store, value) {
  const bytes = value instanceof Uint8Array ? value : textEncoder.encode(String(value));
  const id = sha256(bytes);
  store.set(Buffer.from(id).toString("hex"), bytes);
  return id;
}
function jsonBlob(store, value) {
  return putBlob(store, textEncoder.encode(JSON.stringify(value)));
}
function normalizeText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(normalizeText).filter(Boolean).join("");
  if (!content || typeof content !== "object") return "";
  if (content.type === "image") return "[image attachment]";
  if (content.type === "tool-result" || content.type === "tool_result") {
    return `[Tool Result]
${normalizeText(content.content ?? content.output ?? content.result ?? content.text)}`;
  }
  if (content.type === "tool-call" || content.type === "tool_call") {
    return `[Tool Call ${content.name ?? "tool"}] ${content.arguments ?? "{}"}`;
  }
  return String(content.text ?? content.value ?? content.content ?? content.delta ?? "");
}
function normalizedMessages(messages) {
  return (Array.isArray(messages) ? messages : []).map((message) => ({
    role: String(message?.role ?? "user"),
    content: normalizeText(message?.content ?? message?.text).trim()
  })).filter((message) => message.content.length > 0);
}
function encodeUserMessage(text2, messageId, mode = 1) {
  return concatBytes([stringField(1, text2), stringField(2, messageId), varintField(4, mode)]);
}
function encodeAssistantStep(text2) {
  const assistantMessage = stringField(1, text2);
  const conversationStep = bytesField(1, assistantMessage);
  return conversationStep;
}
function encodeConversationTurn(userMessageId, stepIds, requestId) {
  const agentTurn = concatBytes([
    bytesField(1, userMessageId),
    ...stepIds.map((id) => bytesField(2, id)),
    ...requestId ? [stringField(3, requestId)] : []
  ]);
  return bytesField(1, agentTurn);
}
function encodeConversationState(messages, blobStore, requestId) {
  const roots = [];
  const turns = [];
  const turnRecords = [];
  for (const message of messages) {
    if (message.role === "system") {
      roots.push(jsonBlob(blobStore, { role: "system", content: message.content }));
      continue;
    }
    if (message.role === "user") {
      const userMessage = { role: "user", content: [{ type: "text", text: message.content }] };
      roots.push(jsonBlob(blobStore, userMessage));
      turnRecords.push({ text: message.content, steps: [] });
      continue;
    }
    if (message.role === "assistant") {
      roots.push(jsonBlob(blobStore, { role: "assistant", content: [{ type: "text", text: message.content }] }));
      turnRecords.at(-1)?.steps.push(putBlob(blobStore, encodeAssistantStep(message.content)));
      continue;
    }
    const resultText = `[Tool Result]
${message.content}`;
    roots.push(jsonBlob(blobStore, { role: "user", content: [{ type: "text", text: resultText }] }));
    turnRecords.at(-1)?.steps.push(putBlob(blobStore, encodeAssistantStep(resultText)));
  }
  for (const record of turnRecords.slice(0, -1)) {
    const userMessageId = putBlob(blobStore, encodeUserMessage(record.text, randomUUID5()));
    const turn = encodeConversationTurn(userMessageId, record.steps, requestId);
    turns.push(putBlob(blobStore, turn));
  }
  return concatBytes([
    ...roots.map((id) => bytesField(1, id)),
    ...turns.map((id) => bytesField(8, id))
  ]);
}
function encodeRequestContext(timeZone = "UTC") {
  const env = stringField(10, timeZone);
  const requestContext = bytesField(4, env);
  return bytesField(2, requestContext);
}
function encodeModelDetails(model) {
  return concatBytes([
    stringField(1, model),
    stringField(3, model),
    stringField(4, model),
    stringField(5, model)
  ]);
}
function encodeMcpTools(tools) {
  const supported = (Array.isArray(tools) ? tools : []).map((tool) => {
    const name2 = String(tool?.name ?? tool?.function?.name ?? "").trim();
    if (!name2) return null;
    const fn = tool?.function ?? tool;
    const definition = concatBytes([
      stringField(1, name2),
      stringField(4, "opencodex-responses"),
      stringField(5, name2),
      stringField(2, fn?.description ?? "")
      // Cursor accepts a protobuf Value. A JSON string is intentionally not
      // sent here; unsupported schemas are omitted so the Agent turn does not
      // enter the heartbeat-only state caused by an invalid Value payload.
    ]);
    return bytesField(1, definition);
  }).filter(Boolean);
  return concatBytes(supported);
}
function encodeAgentRunRequest({
  messages,
  model,
  requestId = randomUUID5(),
  conversationId = requestId,
  tools = [],
  timeZone = "UTC"
} = {}) {
  const normalized = normalizedMessages(messages);
  const blobStore = /* @__PURE__ */ new Map();
  const latestUserIndex = normalized.map((message) => message.role).lastIndexOf("user");
  const latestUserText = latestUserIndex >= 0 ? normalized[latestUserIndex].content : normalized.at(-1)?.content ?? "Continue the conversation.";
  const priorConversation = latestUserIndex > 0 ? normalized.slice(0, latestUserIndex).filter((message) => message.role !== "system").map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`).join("\n\n") : "";
  const userText = priorConversation ? `Conversation history:
${priorConversation}

Current user message:
${latestUserText}` : latestUserText;
  const userMessage = encodeUserMessage(userText, requestId, 1);
  const userAction = concatBytes([
    bytesField(1, userMessage),
    encodeRequestContext(timeZone)
  ]);
  const action = bytesField(1, userAction);
  const run = concatBytes([
    bytesField(1, encodeConversationState(normalized, blobStore, requestId)),
    bytesField(2, action),
    bytesField(3, encodeModelDetails(String(model ?? ""))),
    bytesField(4, encodeMcpTools(tools)),
    stringField(5, conversationId)
  ]);
  const clientMessage = bytesField(1, run);
  return { frame: frameConnectMessage(clientMessage), blobs: blobStore, requestId, conversationId };
}
function encodeHeartbeat() {
  return frameConnectMessage(bytesField(7, new Uint8Array()));
}
function decodeConnectFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (buffer.length - offset >= 5) {
    const flags = buffer[offset];
    const length = new DataView(buffer.buffer, buffer.byteOffset + offset + 1, 4).getUint32(0, false);
    if (buffer.length - offset - 5 < length) break;
    frames.push({ flags, payload: buffer.slice(offset + 5, offset + 5 + length) });
    offset += 5 + length;
  }
  return { frames, rest: buffer.slice(offset) };
}
function decodeCursorText(message) {
  try {
    const interaction = firstBytes(decodeProtoFields(message), 1);
    if (!interaction) return "";
    const update = firstBytes(decodeProtoFields(interaction), 1);
    if (!update) return "";
    return firstString6(decodeProtoFields(update), 1);
  } catch {
    return "";
  }
}
function cursorTurnComplete(message) {
  try {
    const interaction = firstBytes(decodeProtoFields(message), 1);
    if (!interaction) return false;
    return decodeProtoFields(interaction).some((field) => field.wireType === 2 && [14, 18, 19].includes(field.field));
  } catch {
    return false;
  }
}
function decodeKvRequest(message) {
  const kv = firstBytes(decodeProtoFields(message), 4);
  if (!kv) return null;
  const fields = decodeProtoFields(kv);
  const id = fields.find((field) => field.field === 1 && field.wireType === 0)?.value ?? 0;
  const getArgs = firstBytes(fields, 2);
  const setArgs = firstBytes(fields, 3);
  if (getArgs) return { id, kind: "get", blobId: firstBytes(decodeProtoFields(getArgs), 1) };
  if (setArgs) return { id, kind: "set" };
  return null;
}
function encodeKvResponse(request, blobs) {
  if (request.kind === "get") {
    const key = request.blobId ? Buffer.from(request.blobId).toString("hex") : "";
    const value = blobs.get(key) ?? new Uint8Array();
    const result = bytesField(1, value);
    return frameConnectMessage(bytesField(3, concatBytes([varintField(1, request.id), bytesField(2, result)])));
  }
  return frameConnectMessage(bytesField(3, concatBytes([varintField(1, request.id), bytesField(3, new Uint8Array())])));
}
function decodeCursorKvRequest(message) {
  return decodeKvRequest(message);
}
var cursorNativeProtocolConstants = Object.freeze({
  endpoint: "https://agent.api5.cursor.sh/agent.v1.AgentService/Run",
  providerIdentifier: "opencodex-responses"
});

// modules/provider-cursor/src/native-transport.mjs
var PROVIDER_ID8 = "cursor";
var DEFAULT_ENDPOINT4 = cursorNativeProtocolConstants.endpoint;
var CURSOR_SESSION_KEYS = [
  "cursorAuth/accessToken",
  "cursorAuth/refreshToken",
  "cursorAuth/cachedEmail",
  "cursorAuth/stripeMembershipType"
];
function firstString7(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}
function createAsyncQueue() {
  const values = [];
  const waiters = [];
  let closed = false;
  let failure = null;
  return {
    push(value) {
      if (closed || failure) return;
      const waiter = waiters.shift();
      if (waiter) waiter.resolve({ value, done: false });
      else values.push(value);
    },
    close() {
      if (closed || failure) return;
      closed = true;
      while (waiters.length) waiters.shift().resolve({ value: void 0, done: true });
    },
    fail(error) {
      if (closed || failure) return;
      failure = error;
      while (waiters.length) waiters.shift().reject(error);
    },
    async next() {
      if (values.length) return { value: values.shift(), done: false };
      if (failure) throw failure;
      if (closed) return { value: void 0, done: true };
      return new Promise((resolve2, reject) => waiters.push({ resolve: resolve2, reject }));
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
function readCursorDesktopSession({
  credential,
  env = process.env,
  home = homedir6()
} = {}) {
  const stored = firstString7(credential?.access, credential?.token);
  if (stored) {
    return {
      token: stored,
      refreshToken: firstString7(credential?.refresh, credential?.refreshToken),
      email: firstString7(credential?.email),
      plan: firstString7(credential?.plan),
      kind: "oauth",
      source: "dockyard_credential"
    };
  }
  const fromEnv = firstString7(env.CURSOR_API_KEY, env.DOCKYARD_CURSOR_ACCESS_TOKEN);
  if (fromEnv) return { token: fromEnv, kind: "apiKey", source: "environment" };
  if (process.platform !== "darwin") return null;
  const dbPath = join9(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
  try {
    const quotedKeys = CURSOR_SESSION_KEYS.map((key) => `'${key}'`).join(",");
    const output = execFileSync2("sqlite3", ["-json", dbPath, `SELECT key, CAST(value AS TEXT) AS value FROM ItemTable WHERE key IN (${quotedKeys});`], {
      encoding: "utf8",
      timeout: 5e3,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const rows = JSON.parse(output || "[]");
    const valueFor = (key) => rows.find((row) => row.key === key)?.value;
    const access2 = valueFor("cursorAuth/accessToken");
    return access2 ? {
      token: access2,
      refreshToken: firstString7(valueFor("cursorAuth/refreshToken")),
      email: firstString7(valueFor("cursorAuth/cachedEmail")),
      plan: firstString7(valueFor("cursorAuth/stripeMembershipType")),
      kind: "oauth",
      source: "cursor_desktop_app"
    } : null;
  } catch {
    return null;
  }
}
function resolveCursorAccessToken(options = {}) {
  const session = readCursorDesktopSession(options);
  return session ? { token: session.token, kind: session.kind } : null;
}
function cursorHeaders(endpoint2, token, requestId, env) {
  const clientVersion = env.DOCKYARD_CURSOR_CLIENT_VERSION ?? `cli-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, ".")}-agent-host`;
  const clientKey = randomBytes(32).toString("hex");
  return {
    ":method": "POST",
    ":path": `${endpoint2.pathname}${endpoint2.search}`,
    ":scheme": "https",
    ":authority": endpoint2.host,
    authorization: `Bearer ${token}`,
    "content-type": "application/connect+proto",
    accept: "application/connect+proto",
    "connect-protocol-version": "1",
    "x-request-id": requestId,
    "x-cursor-client-version": clientVersion,
    "x-cursor-client-type": "cli",
    "x-cursor-client-key": clientKey,
    "x-cursor-streaming": "true"
  };
}
function cursorStatusError(status) {
  return nativeProviderError(PROVIDER_ID8, `Cursor AgentService returned HTTP ${status}`, { status });
}
function streamCursor({ endpoint: endpoint2, token, request, context, http2Module = http2 }) {
  return (async function* cursorStream() {
    const requestId = firstString7(request.requestId, context.requestId, randomUUID6());
    const conversationId = firstString7(request.sessionId, context.sessionId, requestId);
    const model = firstString7(request.model);
    if (!model) throw nativeProviderError(PROVIDER_ID8, "Cursor model is missing");
    const timeZone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch {
        return "UTC";
      }
    })();
    const encoded = encodeAgentRunRequest({
      messages: request.messages,
      model,
      requestId,
      conversationId,
      // Cursor's AgentService uses its own native tool/exec protocol. Keep
      // this request on the text path until DSH's tool bridge answers those
      // bidirectional ExecServer messages; no CLI prompt is involved.
      tools: [],
      timeZone
    });
    const url = new URL(endpoint2);
    const session = http2Module.connect(url.origin);
    const queue = createAsyncQueue();
    let stream = null;
    let responseStatus = 0;
    let responseBuffer = new Uint8Array();
    let completed = false;
    let cleaned = false;
    let heartbeat;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearInterval(heartbeat);
      context.signal?.removeEventListener?.("abort", onAbort);
      if (stream && !stream.destroyed && !stream.closed) stream.close();
      if (!session.closed && !session.destroyed) session.close();
    };
    const onAbort = () => {
      const error = nativeProviderError(PROVIDER_ID8, "Cursor request aborted");
      error.code = "ABORT_ERR";
      queue.fail(error);
      stream?.close(http2Module.constants?.NGHTTP2_CANCEL);
      session.close();
    };
    session.once("error", (error) => queue.fail(error));
    try {
      stream = session.request(cursorHeaders(url, token, requestId, context.env ?? process.env));
      stream.once("response", (headers) => {
        responseStatus = Number(headers[":status"] ?? 0);
        if (responseStatus >= 400) queue.fail(cursorStatusError(responseStatus));
      });
      stream.on("data", (chunk) => {
        const incoming = new Uint8Array(chunk);
        const merged = new Uint8Array(responseBuffer.byteLength + incoming.byteLength);
        merged.set(responseBuffer);
        merged.set(incoming, responseBuffer.byteLength);
        const decoded = decodeConnectFrames(merged);
        responseBuffer = decoded.rest;
        for (const frame of decoded.frames) {
          if ((frame.flags & 2) !== 0) {
            completed = true;
            queue.push({ type: "complete" });
            continue;
          }
          if ((frame.flags & 1) !== 0) {
            queue.fail(nativeProviderError(PROVIDER_ID8, "Cursor returned a compressed protobuf frame"));
            continue;
          }
          const kv = decodeCursorKvRequest(frame.payload);
          if (kv) {
            try {
              stream?.write(Buffer.from(encodeKvResponse(kv, encoded.blobs)));
            } catch (error) {
              queue.fail(error);
            }
            continue;
          }
          const text3 = decodeCursorText(frame.payload);
          if (text3) queue.push({ type: "text", text: text3 });
          if (cursorTurnComplete(frame.payload)) {
            completed = true;
            queue.push({ type: "complete" });
          }
        }
      });
      stream.once("end", () => queue.close());
      stream.once("error", (error) => queue.fail(error));
      stream.write(Buffer.from(encoded.frame));
      heartbeat = setInterval(() => {
        if (!stream || stream.destroyed || stream.closed) return;
        try {
          stream.write(Buffer.from(encodeHeartbeat()));
        } catch {
        }
      }, 5e3);
      context.signal?.addEventListener?.("abort", onAbort, { once: true });
      let text2 = "";
      let failed = false;
      yield { type: "block-start", index: 0, blockType: "text" };
      try {
        for await (const item of queue) {
          if (item.type === "text") {
            text2 += item.text;
            yield { type: "text-delta", index: 0, text: item.text };
          } else if (item.type === "complete") {
            completed = true;
            break;
          }
        }
      } catch (error) {
        failed = true;
        if (error?.status === 401 || error?.status === 403) error.authExpired = error.status === 401;
        throw error;
      } finally {
        cleanup();
      }
      if (!failed) {
        yield { type: "block-end", index: 0, block: { type: "text", text: text2 } };
        yield { type: "finish", reason: { kind: completed ? "stop" : "stop" } };
      }
    } catch (error) {
      cleanup();
      throw error;
    }
  })();
}
function createCursorNativeExecutor({
  endpoint: endpoint2 = process.env.DOCKYARD_CURSOR_ENDPOINT || DEFAULT_ENDPOINT4,
  env = process.env,
  home = homedir6(),
  tokenResolver = resolveCursorAccessToken,
  http2Module = http2
} = {}) {
  const safeEndpoint = validateNativeEndpoint(endpoint2, { providerId: PROVIDER_ID8 });
  const executor = async ({ request = {}, invocation, context = {} } = {}) => {
    let credential = null;
    if (context.secretStore) {
      const ref = invocation?.auth?.credentialRef ?? invocation?.account?.auth?.credentialRef ?? invocation?.account?.credentialRef;
      if (ref) credential = await context.secretStore.read(ref);
    }
    const auth = await tokenResolver({ credential, env: { ...env, ...context.env ?? {} }, home });
    if (!auth?.token) {
      const error = nativeProviderError(PROVIDER_ID8, "Cursor OAuth token is unavailable; authorize Cursor first");
      error.authExpired = true;
      throw error;
    }
    return streamCursor({ endpoint: safeEndpoint, token: auth.token, request, context, http2Module });
  };
  executor.nativeTransport = "cursor-connect-agent-service";
  return executor;
}
var cursorNativeTransportConstants = Object.freeze({
  providerId: PROVIDER_ID8,
  endpoint: DEFAULT_ENDPOINT4
});

// modules/provider-cursor/src/driver.mjs
var PROVIDER_ID9 = "cursor";
var CREDENTIAL_SLOT5 = Symbol("dockyard-cursor-session");
function hash5(value) {
  return createHash7("sha256").update(String(value)).digest("hex");
}
function firstString8(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}
function statusObject2(output) {
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
    execFileSync3("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function parseCursorAuthStatus(output) {
  const raw = statusObject2(output);
  const email = firstString8(
    statusValue(raw, "email", "user.email", "account.email", "accountEmail"),
    parseTextEmail(output)
  );
  const explicitLoggedIn = statusValue(raw, "loggedIn", "authenticated", "isAuthenticated");
  const text2 = String(output);
  const loggedIn = typeof explicitLoggedIn === "boolean" ? explicitLoggedIn : !/not authenticated|not logged in|unauthenticated|please login/i.test(text2) && /authenticated|logged in|account|endpoint/i.test(text2);
  const accountId = firstString8(
    statusValue(raw, "accountId", "account_id", "userId", "user_id", "user.id", "account.id"),
    email,
    "cursor:active"
  );
  const plan = firstString8(
    statusValue(raw, "plan", "planName", "subscription.plan", "subscription.name", "tier", "subscriptionTier")
  );
  const displayName = firstString8(statusValue(raw, "name", "user.name", "account.name"), email, accountId);
  const models = [
    statusValue(raw, "models"),
    statusValue(raw, "availableModels"),
    statusValue(raw, "modelCatalog")
  ].find((value) => Array.isArray(value)) ?? [];
  return {
    loggedIn,
    accountId,
    email,
    plan,
    displayName,
    models,
    raw
  };
}
function candidateFromStatus2(status, { source = "official_cursor_cli", imported = false } = {}) {
  const credentialRef = createCredentialRef(PROVIDER_ID9, status.accountId);
  const candidate2 = {
    candidateId: `cursor:${hash5(status.accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID9,
    source,
    accountId: status.accountId,
    displayName: status.displayName ?? status.accountId,
    email: status.email,
    subscription: { plan: status.plan, status: status.loggedIn ? "active" : null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: false
    },
    credentialRef,
    imported,
    status: status.loggedIn ? "available" : "degraded",
    diagnostic: status.loggedIn ? null : "Cursor CLI \u5F53\u524D\u672A\u8FD4\u56DE\u5DF2\u767B\u5F55\u72B6\u6001"
  };
  Object.defineProperty(candidate2, CREDENTIAL_SLOT5, {
    value: {
      type: "official_cli_session",
      providerId: PROVIDER_ID9,
      accountId: status.accountId
    },
    enumerable: false
  });
  return candidate2;
}
function desktopSessionAccountId(session) {
  return session.email ? `cursor:${hash5(session.email.toLowerCase()).slice(0, 20)}` : "cursor:desktop";
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
      plan: session.plan
    }
  };
}
function candidateFromDesktopSession(session) {
  const accountId = session.accountId ?? desktopSessionAccountId(session);
  const candidate2 = {
    candidateId: `cursor:desktop:${hash5(accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID9,
    source: "cursor_desktop_app",
    accountId,
    displayName: session.email ?? "Cursor desktop session",
    email: session.email,
    subscription: { plan: session.plan, status: "active", expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: Boolean(session.refreshToken)
    },
    credentialRef: createCredentialRef(PROVIDER_ID9, accountId),
    imported: false,
    status: "available",
    diagnostic: null,
    resources: {
      transport: "cursor_connect_agent_service",
      identitySource: "cursor_desktop_app",
      sessionPersistence: "captured",
      quotaSource: "cursor_desktop_app"
    }
  };
  Object.defineProperty(candidate2, CREDENTIAL_SLOT5, {
    value: {
      type: "oauth",
      providerId: PROVIDER_ID9,
      accountId,
      access: session.token,
      ...session.refreshToken ? { refresh: session.refreshToken } : {}
    },
    enumerable: false
  });
  return candidate2;
}
function summarizeCursorCandidate(candidate2) {
  return {
    providerId: PROVIDER_ID9,
    candidateId: candidate2.candidateId,
    source: candidate2.source,
    accountId: candidate2.accountId,
    displayName: candidate2.displayName,
    email: candidate2.email,
    subscription: { ...candidate2.subscription },
    refresh: { ...candidate2.refresh },
    imported: Boolean(candidate2.imported),
    status: candidate2.status ?? "available",
    diagnostic: candidate2.diagnostic ?? null
  };
}
function normalizeModel(value) {
  if (typeof value === "string") return { id: value, name: value };
  if (!value || typeof value !== "object") return null;
  const id = firstString8(value.id, value.model, value.modelId, value.name);
  if (!id) return null;
  return {
    id,
    name: firstString8(value.name, value.label, id),
    ...Number.isInteger(value.contextWindow ?? value.context_window) ? { contextWindow: value.contextWindow ?? value.context_window } : {},
    ...Number.isInteger(value.maxTokens ?? value.max_tokens ?? value.maxOutputTokens) ? { maxTokens: value.maxTokens ?? value.max_tokens ?? value.maxOutputTokens } : {},
    ...Array.isArray(value.input ?? value.inputModalities) ? { inputModalities: [...value.input ?? value.inputModalities] } : {},
    ...value.reasoning ? { reasoning: value.reasoning } : {}
  };
}
function createCursorCatalogLoader({
  cliPath = process.env.DOCKYARD_CURSOR_CLI || "cursor-agent",
  env = process.env,
  commandRunner = runCliCommand
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
          providerId: PROVIDER_ID9,
          timeoutMs: 3e4
        });
        const status = parseCursorAuthStatus(result.output);
        const models = status.models.map(normalizeModel).filter(Boolean);
        cached = {
          models,
          source: "official_cursor_cli_status",
          ...models.length ? {} : { diagnostics: ["Cursor \u5B98\u65B9 CLI status \u6CA1\u6709\u8FD4\u56DE\u6A21\u578B\u76EE\u5F55\uFF1B\u4E0D\u5728 Dockyard \u4E2D\u786C\u7F16\u7801\u6A21\u578B\u7248\u672C"] }
        };
      } catch (error) {
        const desktop = readCursorDesktopSession({ env });
        cached = {
          models: [],
          source: error?.code === "ENOENT" ? desktop ? "cursor_desktop_app" : "cursor_cli_not_found" : "official_cursor_cli_status",
          diagnostics: [desktop ? "\u5DF2\u68C0\u6D4B\u5230 Cursor \u684C\u9762\u7AEF OAuth\uFF1B\u5B98\u65B9\u6A21\u578B\u76EE\u5F55\u4ECD\u9700 cursor-agent status \u8FD4\u56DE\uFF0C\u672A\u786C\u7F16\u7801\u6A21\u578B" : `\u65E0\u6CD5\u8BFB\u53D6 Cursor \u5B98\u65B9\u6A21\u578B\u76EE\u5F55\uFF1A${error.message}`]
        };
      }
      return cached;
    })().finally(() => {
      pending = null;
    });
    return pending;
  };
}
var CursorSubscriptionDriver = class {
  constructor({
    cliPath = process.env.DOCKYARD_CURSOR_CLI || "cursor-agent",
    env = process.env,
    home = homedir7(),
    commandRunner = runCliCommand,
    requestExecutor = null,
    catalogLoader = null
  } = {}) {
    this.cliPath = cliPath;
    this.env = env;
    this.home = home;
    this.commandRunner = commandRunner;
    this.requestExecutor = requestExecutor;
    this.catalogLoader = catalogLoader ?? createCursorCatalogLoader({ cliPath, env, commandRunner });
    this.oauthAuthorizer = createCliStatusAuthorizer({
      providerId: PROVIDER_ID9,
      cliPath,
      loginArgs: ["login"],
      environment: env,
      browserOpened: true,
      instructions: "\u5DF2\u542F\u52A8\u5B98\u65B9 Cursor OAuth \u767B\u5F55\u3002\u8BF7\u5728 Cursor \u5B98\u65B9\u7F51\u9875\u5B8C\u6210\u767B\u5F55\uFF0C\u5B8C\u6210\u540E\u56DE\u5230 Dockyard DSH\u3002",
      importStatus: async (context) => {
        const status = await this.#readStatus();
        if (!status.loggedIn) return [];
        return [await this.importAccount(candidateFromStatus2(status), context)];
      }
    });
  }
  #readDesktopSession() {
    const session = readCursorDesktopSession({ env: this.env, home: this.home });
    if (!session?.token || session.source !== "cursor_desktop_app") return null;
    return {
      ...session,
      accountId: desktopSessionAccountId(session)
    };
  }
  async #readStatus(signal) {
    try {
      const result = await this.commandRunner(this.cliPath, ["status"], {
        env: this.env,
        providerId: PROVIDER_ID9,
        timeoutMs: 3e4,
        ...signal ? { signal } : {}
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
      if (!status.loggedIn) return { candidates: [], source, diagnostics: ["Cursor \u5B98\u65B9\u73AF\u5883\u5F53\u524D\u672A\u767B\u5F55"] };
      const desktop = source === "cursor_desktop_app" ? this.#readDesktopSession() : null;
      const candidate2 = desktop ? candidateFromDesktopSession(desktop) : candidateFromStatus2(status, { source });
      return { candidates: candidate2 ? [candidate2] : [], source, diagnostics: [] };
    } catch (error) {
      return { candidates: [], source: "official_cursor_cli", diagnostics: [`\u65E0\u6CD5\u8BFB\u53D6 Cursor \u5B98\u65B9\u767B\u5F55\u6001\uFF1A${error.message}`] };
    }
  }
  async importAccount(candidate2, context = {}) {
    const session = candidate2?.[CREDENTIAL_SLOT5];
    if (!session) throw new Error("Cursor candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    await context.secretStore.write(candidate2.credentialRef, session);
    return {
      providerId: PROVIDER_ID9,
      accountId: candidate2.accountId,
      credentialRef: candidate2.credentialRef,
      displayName: candidate2.displayName,
      email: candidate2.email,
      auth: {
        kind: candidate2.source === "cursor_desktop_app" ? "oauth" : "official_cli_session",
        scopes: []
      },
      subscription: { ...candidate2.subscription },
      refresh: { ...candidate2.refresh },
      resources: {
        transport: "cursor_agentservice_connect_proto",
        accountScope: candidate2.source === "cursor_desktop_app" ? "desktop_oauth_session" : "active_cli_session",
        quotaSource: candidate2.resources?.quotaSource ?? "official_cursor_cli_status",
        ...candidate2.resources ?? {}
      }
    };
  }
  async startAuthorization(context = {}) {
    if (!commandAvailable(this.cliPath)) {
      const desktop = this.#readDesktopSession();
      if (desktop) {
        const account = await this.importAccount(candidateFromDesktopSession(desktop), context);
        return {
          sessionId: `cursor:desktop:${randomUUID7()}`,
          providerId: PROVIDER_ID9,
          status: "completed",
          instructions: "\u5DF2\u68C0\u6D4B\u5230 Cursor \u684C\u9762\u7AEF\u5B98\u65B9 OAuth \u767B\u5F55\u6001\uFF0C\u5F53\u524D\u8D26\u53F7\u5DF2\u63A5\u5165 Dockyard DSH\u3002",
          accounts: [account],
          diagnostic: null
        };
      }
      return {
        sessionId: `cursor:missing:${randomUUID7()}`,
        providerId: PROVIDER_ID9,
        status: "failed",
        instructions: "\u672A\u627E\u5230\u5B98\u65B9 Cursor Agent CLI\uFF1B\u8BF7\u5148\u5728 Cursor \u5B98\u65B9\u5BA2\u6237\u7AEF\u5B8C\u6210\u767B\u5F55\uFF0C\u6216\u5B89\u88C5 cursor-agent \u540E\u91CD\u8BD5\u3002",
        diagnostic: "\u672C\u673A\u6CA1\u6709 cursor-agent \u53EF\u6267\u884C\u6587\u4EF6\uFF0C\u4E5F\u6CA1\u6709\u68C0\u6D4B\u5230 Cursor \u684C\u9762\u7AEF OAuth \u4F1A\u8BDD\uFF1B\u56E0\u6B64\u6CA1\u6709\u542F\u52A8\u7F51\u9875\u6388\u6743\u3002"
      };
    }
    return this.oauthAuthorizer.begin(context);
  }
  async pollAuthorization(sessionId, context = {}) {
    return this.oauthAuthorizer.poll(sessionId, context);
  }
  async cancelAuthorization(sessionId, context = {}) {
    return this.oauthAuthorizer.cancel(sessionId, context);
  }
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
      refresh: { lastRefreshedAt: (context.now instanceof Date ? context.now : /* @__PURE__ */ new Date()).toISOString(), refreshable: false }
    };
  }
  async getQuota(account, context = {}) {
    const status = await this.#readStatus(context.signal);
    const now = context.now instanceof Date ? context.now : /* @__PURE__ */ new Date();
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
        source: "cursor_cli_status"
      },
      subscription: { plan: status.plan, status: status.loggedIn ? "active" : null, expiresAt: null },
      resources: {
        quotaDiagnostic: windows.length ? null : "Cursor \u5B98\u65B9 CLI status \u672A\u8FD4\u56DE\u5B9E\u65F6\u8BA2\u9605\u989D\u5EA6\uFF1B\u8BE6\u7EC6 usage \u4ECD\u4EE5 Cursor \u5B98\u65B9 Dashboard \u4E3A\u51C6"
      }
    };
  }
  async getCatalog(context = {}) {
    return this.catalogLoader({ force: Boolean(context.force) });
  }
  async invoke(request, invocation, context = {}) {
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") throw new Error("Cursor native invocation transport is not mounted");
    return executor({ request, invocation, context });
  }
  async stream(request, invocation, context = {}) {
    return this.invoke(request, invocation, context);
  }
};
function createCursorDriver(options = {}) {
  return new CursorSubscriptionDriver(options);
}
var cursorDriverConstants = Object.freeze({ providerId: PROVIDER_ID9 });

// modules/provider-cursor/src/index.mjs
function createCursorModule({ driver = {} } = {}) {
  return defineProviderModule({
    id: "cursor",
    displayName: "Cursor",
    capabilities: [
      "oauth_discovery",
      "oauth_import",
      "oauth_authorization",
      "oauth_refresh",
      "quota",
      "catalog",
      "invoke",
      "stream"
    ],
    driver
  });
}

// packages/runtime/src/dockyard-runtime.mjs
var candidateSummarizers = /* @__PURE__ */ new Map([
  ["openai-codex", summarizeCodexCandidate],
  ["antigravity", summarizeAntigravityCandidate],
  ["grok", summarizeGrokCandidate],
  ["claude", summarizeClaudeCandidate],
  ["cursor", summarizeCursorCandidate]
]);
var DEFAULT_REFRESH_TIMEOUT_MS = 15e3;
function numericOption(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function refreshTimeoutError(providerId, accountId, timeoutMs) {
  const error = new Error(`\u5237\u65B0 ${providerId}/${accountId} \u8D85\u65F6\uFF08${Math.ceil(timeoutMs / 1e3)} \u79D2\uFF09\uFF1B\u5DF2\u4FDD\u7559\u4E0A\u6B21\u989D\u5EA6`);
  error.code = "ETIMEDOUT";
  error.refreshTimeout = true;
  error.timeoutMs = timeoutMs;
  return error;
}
function withRefreshTimeout(task, { providerId, accountId, timeoutMs }) {
  const controller = new AbortController();
  let timer = null;
  const operation = Promise.resolve().then(() => task(controller.signal));
  operation.catch(() => {
  });
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
  return executor ? { ...driverOptions ?? {}, requestExecutor: executor } : driverOptions;
}
function createDefaultProviderEntries(options = {}) {
  const requestExecutors = options.requestExecutors ?? {};
  const catalogLoaders = options.catalogLoaders ?? {};
  return [
    {
      module: createCodexModule({
        driver: options.codexDriver ?? createCodexDriver({
          ...withRequestExecutor("openai-codex", options.codex, requestExecutors),
          ...catalogLoaders["openai-codex"] ? { catalogLoader: catalogLoaders["openai-codex"] } : {}
        })
      }),
      driver: options.codexDriver
    },
    {
      module: createAntigravityModule({
        driver: options.antigravityDriver ?? createAntigravityDriver({
          ...withRequestExecutor("antigravity", options.antigravity, requestExecutors),
          ...catalogLoaders.antigravity ? { catalogLoader: catalogLoaders.antigravity } : {}
        })
      }),
      driver: options.antigravityDriver
    },
    {
      module: createGrokModule({
        driver: options.grokDriver ?? createGrokDriver({
          ...withRequestExecutor("grok", options.grok, requestExecutors),
          ...catalogLoaders.grok ? { catalogLoader: catalogLoaders.grok } : {}
        })
      }),
      driver: options.grokDriver
    },
    {
      module: createClaudeModule({
        driver: options.claudeDriver ?? createClaudeDriver({
          ...withRequestExecutor("claude", options.claude, requestExecutors),
          ...catalogLoaders.claude ? { catalogLoader: catalogLoaders.claude } : {}
        })
      }),
      driver: options.claudeDriver
    },
    {
      module: createCursorModule({
        driver: options.cursorDriver ?? createCursorDriver({
          ...withRequestExecutor("cursor", options.cursor, requestExecutors),
          ...catalogLoaders.cursor ? { catalogLoader: catalogLoaders.cursor } : {}
        })
      }),
      driver: options.cursorDriver
    }
  ];
}
function providerContext(app, extra = {}) {
  return {
    secretStore: app.secretStore,
    now: /* @__PURE__ */ new Date(),
    ...extra
  };
}
function providerAccount2(pool, accountId) {
  const account = pool.get(accountId);
  if (!account) throw new Error(`Account does not exist: ${accountId}`);
  const auth = pool.resolve(accountId);
  return {
    ...account,
    auth: {
      kind: auth.authKind,
      credentialRef: auth.credentialRef,
      scopes: [...auth.scopes]
    }
  };
}
function providerErrorStatus(error) {
  if (error?.authExpired) return "auth_expired";
  if (error?.authForbidden) return "error";
  if (error?.quotaExhausted) return "quota_exhausted";
  if (error?.rateLimited) return "rate_limited";
  return "error";
}
var DockyardRuntime = class {
  #entries = /* @__PURE__ */ new Map();
  #candidates = /* @__PURE__ */ new Map();
  #refreshPromises = /* @__PURE__ */ new Map();
  #initialized = false;
  #initPromise = null;
  constructor({
    providers = createDefaultProviderEntries(),
    runtime = new ModuleRuntime({ logger: { error() {
    }, warn() {
    }, info() {
    } } }),
    stateStore = new JsonStateStore(),
    secretStore = createDefaultSecretStore(),
    dshAdapter = null,
    refreshTimeoutMs = numericOption(process.env.DOCKYARD_DSH_REFRESH_TIMEOUT_MS, DEFAULT_REFRESH_TIMEOUT_MS)
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
          policy: stored.policy ?? ACCOUNT_SELECTION_POLICY.ROUND_ROBIN
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
    const entries = providerId ? [[providerId, this.#entry(providerId)]] : [...this.#entries];
    const providers = [];
    const changedProviderIds = /* @__PURE__ */ new Set();
    for (const [currentProviderId, entry] of entries) {
      let result;
      try {
        result = await entry.module.discover(providerContext(this, {
          accounts: entry.pool.list()
        }));
      } catch (error) {
        result = { candidates: [], source: "provider", diagnostics: [redactError(error)] };
      }
      const rawCandidates = Array.isArray(result?.candidates) ? result.candidates : [];
      this.#candidates.set(currentProviderId, new Map(rawCandidates.map((candidate2) => [candidate2.candidateId, candidate2])));
      for (const candidate2 of rawCandidates) {
        const existing = entry.pool.get(candidate2.accountId);
        const candidateIdentity = candidate2.resources ?? {};
        const existingIdentity = existing?.resources ?? {};
        if (!existing) continue;
        const identityChanged = candidate2.email !== existing.email || candidate2.displayName !== existing.displayName || candidateIdentity.identitySource !== existingIdentity.identitySource || candidateIdentity.identityLabel !== existingIdentity.identityLabel || candidateIdentity.sessionFingerprint !== existingIdentity.sessionFingerprint || candidateIdentity.identityNote !== existingIdentity.identityNote || candidateIdentity.sessionPersistence !== existingIdentity.sessionPersistence;
        if (identityChanged) {
          entry.pool.upsert({
            accountId: candidate2.accountId,
            ...candidate2.email !== void 0 ? { email: candidate2.email } : {},
            ...candidate2.displayName !== void 0 ? { displayName: candidate2.displayName } : {},
            ...candidate2.resources ? { resources: candidate2.resources } : {}
          });
          changedProviderIds.add(currentProviderId);
        }
        const fingerprintChanged = candidate2.resources?.sessionPersistence === "captured" && candidate2.resources.sessionFingerprint && candidate2.resources.sessionFingerprint !== existing.resources?.sessionFingerprint;
        if (fingerprintChanged && typeof entry.module.importAccount === "function") {
          try {
            const captured = await entry.module.importAccount(candidate2, providerContext(this));
            entry.pool.upsert(captured);
            changedProviderIds.add(currentProviderId);
          } catch {
          }
        }
      }
      const summarize = candidateSummarizers.get(currentProviderId) ?? ((candidate2) => ({ ...candidate2 }));
      const candidates = rawCandidates.map((candidate2) => ({
        ...summarize(candidate2),
        imported: Boolean(entry.pool.get(candidate2.accountId))
      }));
      providers.push({
        providerId: currentProviderId,
        manifest: { ...entry.module.manifest },
        policy: entry.pool.policy,
        accounts: entry.pool.list(),
        candidates,
        source: result?.source ?? "unknown",
        diagnostics: result?.diagnostics ?? []
      });
    }
    if (changedProviderIds.size > 0) await this.#saveState(changedProviderIds);
    return {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      providers,
      routes: this.bridge.listRoutes()
    };
  }
  async importCandidate(providerId, candidateId) {
    await this.init();
    const entry = this.#entry(providerId);
    const candidate2 = this.#candidates.get(providerId)?.get(candidateId);
    if (!candidate2) throw new Error("Candidate is missing; scan local OAuth states again");
    const rawAccount = await entry.module.importAccount(candidate2, providerContext(this));
    entry.pool.upsert(rawAccount);
    await this.#saveState([providerId]);
    return {
      account: entry.pool.get(rawAccount.accountId),
      diagnostics: [],
      needsRefresh: true
    };
  }
  async importSource(providerId, source) {
    await this.init();
    const entry = this.#entry(providerId);
    if (typeof entry.module.importSource !== "function") {
      throw new Error(`Provider ${providerId} does not support OAuth source import`);
    }
    const imported = await entry.module.importSource(source, providerContext(this));
    const rawAccounts = Array.isArray(imported) ? imported : Array.isArray(imported?.accounts) ? imported.accounts : [imported];
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
      accounts: entry.pool.list()
    }));
    return this.#persistAuthorizationResult(entry, providerId, result);
  }
  async pollAuthorization(providerId, sessionId) {
    await this.init();
    const entry = this.#entry(providerId);
    const result = await entry.module.pollAuthorization(sessionId, providerContext(this, {
      accounts: entry.pool.list()
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
      accounts: entry.pool.list()
    }));
  }
  async refreshAccount(providerId, accountId, { force = false, tolerateFailure = false } = {}) {
    try {
      return await withRefreshTimeout(
        (signal) => this.#refreshAccountNow(providerId, accountId, { force, tolerateFailure, signal }),
        { providerId, accountId, timeoutMs: this.refreshTimeoutMs }
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
    providerAccount2(entry.pool, accountId);
    const diagnostics = [];
    let authorizationFailure = null;
    let refresh = null;
    try {
      refresh = await entry.module.refreshAccount(
        providerAccount2(entry.pool, accountId),
        providerContext(this, { force, signal })
      );
      this.#applyPatch(entry.pool, accountId, refresh);
    } catch (error) {
      if (signal?.aborted) throw error;
      authorizationFailure = error;
      diagnostics.push(`\u5237\u65B0 OAuth \u72B6\u6001\u5931\u8D25\uFF1A${redactError(error)}`);
      entry.pool.report(accountId, {
        status: providerErrorStatus(error),
        message: diagnostics.at(-1)
      });
      if (!tolerateFailure) await this.#saveState([providerId]);
      if (!tolerateFailure) throw error;
    }
    if (authorizationFailure?.authExpired || authorizationFailure?.authForbidden) {
      await this.#saveState([providerId]);
      return { account: entry.pool.get(accountId), diagnostics };
    }
    try {
      if (refresh && Object.hasOwn(refresh, "quota")) {
        const health2 = entry.pool.get(accountId)?.health;
        if (health2?.status !== "expired") {
          entry.pool.report(accountId, { status: "success" });
        }
        await this.#saveState([providerId]);
        return { account: entry.pool.get(accountId), diagnostics };
      }
      const quota = await entry.module.getQuota(
        providerAccount2(entry.pool, accountId),
        providerContext(this, { signal })
      );
      this.#applyPatch(entry.pool, accountId, quota);
      const health = entry.pool.get(accountId)?.health;
      if (health?.status !== "expired") {
        entry.pool.report(accountId, { status: "success" });
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      diagnostics.push(`\u5237\u65B0\u5B9E\u65F6\u989D\u5EA6\u5931\u8D25\uFF1A${redactError(error)}`);
      entry.pool.report(accountId, {
        status: providerErrorStatus(error),
        message: diagnostics.at(-1)
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
  async setPolicy(providerId, policy, defaultAccountId = void 0) {
    await this.init();
    const pool = this.#entry(providerId).pool;
    pool.setPolicy(policy);
    if (defaultAccountId !== void 0) pool.setDefaultAccount(defaultAccountId);
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
        diagnostics.push(`\u6E05\u7406\u672C\u673A Keychain \u5F15\u7528\u5931\u8D25\uFF1A${redactError(error)}`);
      }
    }
    return {
      providerId,
      accountId,
      removed: true,
      defaultAccountId: entry.pool.getDefaultAccountId(),
      diagnostics
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
        try {
          await runtime.#saveState([providerId]);
        } catch {
        }
      }
    })();
  }
  snapshot() {
    return {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      providers: [...this.#entries].map(([providerId, entry]) => ({
        providerId,
        manifest: { ...entry.module.manifest },
        policy: entry.pool.policy,
        defaultAccountId: entry.pool.getDefaultAccountId(),
        accounts: entry.pool.list()
      })),
      routes: this.bridge.listRoutes()
    };
  }
  #applyPatch(pool, accountId, patch = {}) {
    if (!patch || typeof patch !== "object") return;
    const input = { accountId };
    for (const key of ["email", "displayName", "subscription", "quota", "refresh", "resources"]) {
      if (patch[key] !== void 0) input[key] = patch[key];
    }
    if (patch.identity?.email !== void 0) input.email = patch.identity.email;
    if (patch.identity?.displayName !== void 0) input.displayName = patch.identity.displayName;
    if (patch.credits !== void 0) input.resources = { credits: patch.credits };
    pool.upsert(input);
  }
  async #persistAuthorizationResult(entry, providerId, result) {
    if (result?.status !== "completed") return result;
    const rawAccounts = Array.isArray(result.accounts) ? result.accounts : result.account ? [result.account] : [];
    const accounts = await this.#storeImportedAccounts(entry, rawAccounts);
    await this.#saveState([providerId]);
    return { ...result, accounts };
  }
  async #storeImportedAccounts(entry, rawAccounts) {
    const accounts = [];
    for (const account of rawAccounts.filter((value) => value?.accountId)) {
      const alreadyImported = Boolean(
        account?.auth?.credentialRef || account?.auth?.kind && account?.credentialRef && !account?.candidateId
      );
      const imported = alreadyImported || typeof entry.module.importAccount !== "function" ? account : await entry.module.importAccount(account, providerContext(this));
      entry.pool.upsert(imported);
      accounts.push(entry.pool.get(imported.accountId));
    }
    return accounts;
  }
  async #saveState(changedProviderIds = null) {
    const changed = changedProviderIds === null ? new Set(this.#entries.keys()) : new Set(changedProviderIds);
    const latest = await this.stateStore.load().catch(() => ({ pools: {} }));
    const pools = {
      ...latest?.pools && typeof latest.pools === "object" ? latest.pools : {}
    };
    for (const [providerId, entry] of this.#entries) {
      if (!changed.has(providerId) && Object.hasOwn(pools, providerId)) continue;
      pools[providerId] = {
        policy: entry.pool.policy,
        defaultAccountId: entry.pool.getDefaultAccountId(),
        accounts: entry.pool.listForStorage()
      };
    }
    await this.stateStore.save({ ...latest, pools });
  }
};

// packages/dsh-plugin/src/codex-transport.mjs
import { access, readFile as readFile6 } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname as dirname3, join as join10, resolve } from "node:path";
import { pathToFileURL } from "node:url";
var DSH_LLM_PI_AI = "@deepseek-ai/dsh-llm-pi-ai";
var PI_AI = "@earendil-works/pi-ai";
var PI_AI_CODEX_API = "@earendil-works/pi-ai/api/openai-codex-responses.lazy";
var PI_AI_CODEX_PROVIDER = "@earendil-works/pi-ai/providers/openai-codex";
var PI_AI_BUILTIN_PROVIDERS = "@earendil-works/pi-ai/providers/all";
async function importBareDependencies() {
  const [{ PiAiAdapter }, { createProvider }, { openAICodexResponsesApi }, { openaiCodexProvider }, builtinProviders2] = await Promise.all([
    import(DSH_LLM_PI_AI),
    import(PI_AI),
    import(PI_AI_CODEX_API),
    import(PI_AI_CODEX_PROVIDER),
    import(PI_AI_BUILTIN_PROVIDERS)
  ]);
  return { PiAiAdapter, createProvider, openAICodexResponsesApi, openaiCodexProvider, builtinProviders: builtinProviders2 };
}
function exportTarget(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  for (const condition of ["import", "node", "default"]) {
    const target = exportTarget(value[condition]);
    if (target) return target;
  }
  return null;
}
async function isFile(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function findPackageRoot(startDirectory, packageName) {
  const packageParts = packageName.split("/");
  let current = resolve(startDirectory);
  while (true) {
    const candidate2 = join10(current, "node_modules", ...packageParts);
    if (await isFile(join10(candidate2, "package.json"))) return candidate2;
    const parent = dirname3(current);
    if (parent === current) return null;
    current = parent;
  }
}
async function packageImportUrl(packageRoot, subpath = null) {
  const packageJson = JSON.parse(await readFile6(join10(packageRoot, "package.json"), "utf8"));
  const exports = packageJson.exports;
  let target = null;
  if (!subpath) {
    target = exportTarget(exports?.["."] ?? exports) ?? packageJson.module ?? packageJson.main;
  } else {
    const key = `./${subpath}`;
    target = exportTarget(exports?.[key]);
    if (!target && exports && typeof exports === "object") {
      for (const [pattern, value] of Object.entries(exports)) {
        if (!pattern.includes("*")) continue;
        const prefix = pattern.slice(0, pattern.indexOf("*"));
        const suffix = pattern.slice(pattern.indexOf("*") + 1);
        if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue;
        target = exportTarget(value)?.replace("*", key.slice(prefix.length, key.length - suffix.length));
        break;
      }
    }
  }
  if (typeof target !== "string") {
    throw new Error(`Cannot resolve ${subpath ?? "."} from ${packageRoot}`);
  }
  return pathToFileURL(join10(packageRoot, target)).href;
}
async function importFromDshInstall(moduleAnchor) {
  const anchor = moduleAnchor ?? process.env.DOCKYARD_DSH_CLI_PATH ?? process.argv[1] ?? import.meta.url;
  const dshRequire = createRequire(anchor);
  const dshLlmPath = dshRequire.resolve(DSH_LLM_PI_AI);
  const dshPackageRoot = dirname3(dirname3(dshLlmPath));
  const piRoot = await findPackageRoot(dshPackageRoot, PI_AI);
  if (!piRoot) throw new Error(`Cannot find ${PI_AI} beside ${DSH_LLM_PI_AI}`);
  const [{ PiAiAdapter }, { createProvider }, { openAICodexResponsesApi }, { openaiCodexProvider }, builtinProviders2] = await Promise.all([
    import(pathToFileURL(dshLlmPath).href),
    import(await packageImportUrl(piRoot)),
    import(await packageImportUrl(piRoot, "api/openai-codex-responses.lazy")),
    import(await packageImportUrl(piRoot, "providers/openai-codex")),
    import(await packageImportUrl(piRoot, "providers/all"))
  ]);
  return { PiAiAdapter, createProvider, openAICodexResponsesApi, openaiCodexProvider, builtinProviders: builtinProviders2 };
}
async function loadExecutor(moduleAnchor) {
  let dependencies;
  try {
    dependencies = await importBareDependencies();
  } catch {
    dependencies = await importFromDshInstall(moduleAnchor);
  }
  const { PiAiAdapter, createProvider, openAICodexResponsesApi, openaiCodexProvider } = dependencies;
  const models = openaiCodexProvider().getModels();
  const modelById = new Map(models.map((model) => [model.id, model]));
  return createCodexPiAiExecutor({
    PiAiAdapter,
    createProvider,
    openAICodexResponsesApi,
    modelResolver: (modelId) => modelById.get(modelId)
  });
}
async function loadDependencies(moduleAnchor) {
  try {
    return await importBareDependencies();
  } catch {
    return importFromDshInstall(moduleAnchor);
  }
}
function createCodexDshRequestExecutor({ moduleAnchor = null } = {}) {
  let executorPromise;
  return (envelope2) => {
    executorPromise ??= loadExecutor(moduleAnchor);
    return executorPromise.then((executor) => executor(envelope2));
  };
}
function createPiAiModelRegistryLoader({ moduleAnchor = null } = {}) {
  let registryPromise;
  return async () => {
    registryPromise ??= loadDependencies(moduleAnchor).then(({ builtinProviders: builtinProviders2 }) => {
      if (typeof builtinProviders2?.getBuiltinModels !== "function" || typeof builtinProviders2?.getBuiltinProviders !== "function") return [];
      return builtinProviders2.getBuiltinProviders().flatMap((provider) => builtinProviders2.getBuiltinModels(provider));
    });
    return registryPromise;
  };
}
function reasoningFromThinkingLevelMap(thinkingLevelMap) {
  if (!thinkingLevelMap || typeof thinkingLevelMap !== "object") return void 0;
  const efforts = Object.entries(thinkingLevelMap).filter(([id, providerValue]) => id !== "off" && typeof providerValue === "string" && providerValue.length > 0).map(([id, providerValue]) => ({
    id,
    name: id.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
    ...providerValue === id ? {} : { description: `provider value: ${providerValue}` }
  }));
  return efforts.length > 0 ? { efforts } : void 0;
}
function codexModelToDshCatalog(model) {
  const reasoning = reasoningFromThinkingLevelMap(model?.thinkingLevelMap);
  return {
    id: model.id,
    name: model.name,
    ...Array.isArray(model.input) ? { inputModalities: [...model.input] } : {},
    ...Number.isInteger(model.contextWindow) ? { contextWindow: model.contextWindow } : {},
    ...Number.isInteger(model.maxTokens) ? { maxTokens: model.maxTokens } : {},
    ...reasoning ? { reasoning } : {}
  };
}
function createCodexDshCatalogLoader({ moduleAnchor = null } = {}) {
  let dependenciesPromise;
  return async () => {
    dependenciesPromise ??= loadDependencies(moduleAnchor);
    const { openaiCodexProvider } = await dependenciesPromise;
    const models = openaiCodexProvider().getModels();
    return {
      models: models.map(codexModelToDshCatalog),
      source: "dsh_pi_ai_provider_catalog"
    };
  };
}

// packages/dsh-plugin/src/dockyard-service.mjs
import { spawn as spawn6 } from "node:child_process";
var DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1e3;
var AUTH_POLL_INTERVAL_MS = 750;
var AUTH_URL_WAIT_MS = 2e3;
var POLICY_ALIASES = /* @__PURE__ */ new Map([
  ["manual", ACCOUNT_SELECTION_POLICY.MANUAL],
  ["sticky", ACCOUNT_SELECTION_POLICY.STICKY_SESSION],
  ["sticky-session", ACCOUNT_SELECTION_POLICY.STICKY_SESSION],
  ["sticky_session", ACCOUNT_SELECTION_POLICY.STICKY_SESSION],
  ["round-robin", ACCOUNT_SELECTION_POLICY.ROUND_ROBIN],
  ["round_robin", ACCOUNT_SELECTION_POLICY.ROUND_ROBIN],
  ["failover", ACCOUNT_SELECTION_POLICY.FAILOVER]
]);
function sleep(milliseconds) {
  return new Promise((resolve2) => setTimeout(resolve2, milliseconds));
}
function numericOption2(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function providerName(manifest) {
  return manifest?.displayName ?? manifest?.id ?? "provider";
}
function displayNumber(value, unit = "") {
  if (value === null || value === void 0) return "\u672A\u77E5";
  return `${value}${unit ? ` ${unit}` : ""}`;
}
function displayTime(value) {
  return value ? new Date(value).toLocaleString() : "\u672A\u77E5";
}
function displayQuota(quota) {
  if (!quota) return "\u989D\u5EA6\uFF1A\u672A\u77E5";
  const topLevel = quota.limit === null || quota.limit === void 0 ? displayNumber(quota.remaining, quota.unit) : `${displayNumber(quota.remaining)} / ${displayNumber(quota.limit)}${quota.unit ? ` ${quota.unit}` : ""}`;
  const windows = Array.isArray(quota.windows) ? quota.windows.map((window) => {
    const label = window.name ?? window.id ?? "window";
    const value = window.limit === null || window.limit === void 0 ? displayNumber(window.remaining, window.unit) : `${displayNumber(window.remaining)} / ${displayNumber(window.limit)}${window.unit ? ` ${window.unit}` : ""}`;
    return `${label}: ${value}\uFF0C\u91CD\u7F6E ${displayTime(window.resetAt)}`;
  }) : [];
  return [
    `\u989D\u5EA6\uFF1A${topLevel}`,
    ...windows,
    `\u989D\u5EA6\u66F4\u65B0\u65F6\u95F4\uFF1A${displayTime(quota.updatedAt)}`
  ].join("\uFF1B");
}
function displayAccount(account) {
  const identity = account.email ?? account.displayName ?? account.accountId;
  const plan = account.subscription?.plan ?? "\u8BA2\u9605\u672A\u77E5";
  const health = account.health?.status ?? "unknown";
  const lastChecked = account.health?.lastCheckedAt ?? account.quota?.updatedAt;
  const oauthState = health === "expired" ? "OAuth \u6388\u6743\uFF1A\u9700\u91CD\u65B0\u6388\u6743" : `OAuth token \u6709\u6548\u81F3\uFF1A${displayTime(account.refresh?.accessTokenExpiresAt)}`;
  return [
    `${identity} (${account.accountId})`,
    `\u72B6\u6001\uFF1A${health}`,
    `\u5957\u9910\uFF1A${plan}`,
    `\u8BA2\u9605\u5230\u671F\uFF1A${displayTime(account.subscription?.expiresAt)}`,
    displayQuota(account.quota),
    `\u989D\u5EA6\u68C0\u67E5\uFF1A${displayTime(lastChecked)}`,
    oauthState,
    `OAuth \u4E0B\u6B21\u5237\u65B0\uFF1A${displayTime(account.refresh?.nextRefreshAt)}`
  ].join("\uFF1B");
}
function manifestFor2(runtime, input) {
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return null;
  const manifests = runtime.listProviderManifests?.() ?? [];
  return manifests.find((manifest) => String(manifest.id).toLowerCase() === value) ?? manifests.find((manifest) => String(manifest.displayName ?? "").toLowerCase() === value) ?? manifests.find((manifest) => String(manifest.id).toLowerCase().endsWith(`-${value}`)) ?? null;
}
function providerIdFor(runtime, input) {
  return manifestFor2(runtime, input)?.id ?? null;
}
function commandTokens(rawInput) {
  return String(rawInput ?? "").trim().split(/\s+/).filter(Boolean);
}
function commandSuccess(text2) {
  return { kind: "success", text: text2 };
}
function commandError(text2) {
  return { kind: "error", text: text2 };
}
function openDefaultBrowser(url) {
  if (process.platform !== "darwin" || !url) return;
  try {
    const child = spawn6("open", [url], { detached: true, stdio: "ignore" });
    child.unref();
  } catch {
  }
}
var DockyardDshService = class {
  #refreshTimer = null;
  #refreshPromises = /* @__PURE__ */ new Map();
  #started = false;
  #disposed = false;
  #authSessions = /* @__PURE__ */ new Map();
  #authOpened = /* @__PURE__ */ new Set();
  #authStartPromises = /* @__PURE__ */ new Map();
  constructor({
    runtime,
    refreshIntervalMs = numericOption2(process.env.DOCKYARD_DSH_REFRESH_INTERVAL_MS, DEFAULT_REFRESH_INTERVAL_MS),
    autoRefresh = true,
    openBrowser = openDefaultBrowser,
    logger = console
  } = {}) {
    if (!runtime) throw new Error("Dockyard DSH service requires a runtime");
    this.runtime = runtime;
    this.refreshIntervalMs = refreshIntervalMs;
    this.autoRefresh = autoRefresh;
    this.openBrowser = openBrowser;
    this.logger = logger;
    this.ready = runtime.init();
  }
  async start() {
    await this.ready;
    if (this.#started || this.#disposed) return this;
    this.#started = true;
    if (this.autoRefresh) {
      this.#refreshTimer = setInterval(() => {
        void this.refresh().catch((error) => this.#warn("scheduled quota refresh failed", error));
      }, this.refreshIntervalMs);
      this.#refreshTimer.unref?.();
    }
    return this;
  }
  async dispose() {
    this.#disposed = true;
    if (this.#refreshTimer) clearInterval(this.#refreshTimer);
    this.#refreshTimer = null;
    this.#refreshPromises.clear();
    this.#authStartPromises.clear();
    for (const { providerId, sessionId, timer } of this.#authSessions.values()) {
      if (timer) clearTimeout(timer);
      await this.runtime.cancelAuthorization(providerId, sessionId).catch(() => {
      });
    }
    this.#authSessions.clear();
    this.#authOpened.clear();
  }
  async snapshot() {
    await this.ready;
    return this.runtime.snapshot();
  }
  async scan(providerInput = null) {
    await this.ready;
    const providerId = providerInput ? providerIdFor(this.runtime, providerInput) : null;
    if (providerInput && !providerId) throw new Error(`\u672A\u77E5 provider\uFF1A${providerInput}`);
    const result = await this.runtime.scan(providerId);
    if (!providerInput) return result;
    return {
      ...result,
      providers: result.providers.filter((provider) => provider.providerId === providerId)
    };
  }
  async add(providerInput = null, candidateId = null) {
    const scan = await this.scan(providerInput);
    const imports = [];
    const diagnostics = [];
    for (const provider of scan.providers) {
      const candidates = provider.candidates.filter((candidate2) => !candidate2.imported);
      const selected = candidateId ? candidates.filter((candidate2) => candidate2.candidateId === candidateId) : candidates;
      if (candidateId && selected.length === 0) continue;
      for (const candidate2 of selected) {
        try {
          const imported = await this.runtime.importCandidate(provider.providerId, candidate2.candidateId);
          let refreshed = imported.account;
          try {
            refreshed = (await this.runtime.refreshAccount(provider.providerId, imported.account.accountId, {
              tolerateFailure: true
            })).account;
          } catch (error) {
            diagnostics.push(`${providerName(provider.manifest)} ${candidate2.candidateId} \u5237\u65B0\u5931\u8D25\uFF1A${redactError(error)}`);
          }
          imports.push(refreshed);
        } catch (error) {
          diagnostics.push(`${providerName(provider.manifest)} ${candidate2.candidateId} \u6DFB\u52A0\u5931\u8D25\uFF1A${redactError(error)}`);
        }
      }
    }
    if (candidateId && imports.length === 0 && diagnostics.length === 0) {
      throw new Error(`\u6CA1\u6709\u627E\u5230\u672A\u6DFB\u52A0\u7684 OAuth \u5019\u9009\uFF1A${candidateId}`);
    }
    return { accounts: imports, diagnostics, scan };
  }
  async refresh(providerInput = null) {
    await this.ready;
    const providerId = providerInput ? providerIdFor(this.runtime, providerInput) : null;
    if (providerInput && !providerId) throw new Error(`\u672A\u77E5 provider\uFF1A${providerInput}`);
    const refreshKey = providerId ?? "*";
    const existing = this.#refreshPromises.get(refreshKey);
    if (existing) return existing;
    const promise = this.runtime.refreshAll(providerId).finally(() => {
      if (this.#refreshPromises.get(refreshKey) === promise) this.#refreshPromises.delete(refreshKey);
    });
    this.#refreshPromises.set(refreshKey, promise);
    return promise;
  }
  async catalog(providerInput) {
    await this.ready;
    const providerId = providerIdFor(this.runtime, providerInput);
    if (!providerId) throw new Error(`\u672A\u77E5 provider\uFF1A${providerInput}`);
    return { providerId, manifest: manifestFor2(this.runtime, providerInput), catalog: await this.runtime.getCatalog(providerId) };
  }
  async setPolicy(providerInput, policyInput, defaultAccountId = void 0) {
    await this.ready;
    const providerId = providerIdFor(this.runtime, providerInput);
    if (!providerId) throw new Error(`\u672A\u77E5 provider\uFF1A${providerInput}`);
    const policy = POLICY_ALIASES.get(String(policyInput ?? "").toLowerCase());
    if (!policy) throw new Error(`\u672A\u77E5\u8D26\u53F7\u7B56\u7565\uFF1A${policyInput}\uFF1B\u53EF\u7528\u503C\uFF1A${[...new Set(POLICY_ALIASES.values())].join(", ")}`);
    return this.runtime.setPolicy(providerId, policy, defaultAccountId);
  }
  async setDefaultAccount(providerInput, accountId) {
    await this.ready;
    const providerId = providerIdFor(this.runtime, providerInput);
    if (!providerId) throw new Error(`\u672A\u77E5 provider\uFF1A${providerInput}`);
    return this.runtime.setDefaultAccount(providerId, accountId);
  }
  async removeAccount(providerInput, accountId) {
    await this.ready;
    const providerId = providerIdFor(this.runtime, providerInput);
    if (!providerId) throw new Error(`\u672A\u77E5 provider\uFF1A${providerInput}`);
    if (!accountId) throw new Error("\u79FB\u9664\u8D26\u53F7\u9700\u8981 accountId");
    return this.runtime.removeAccount(providerId, accountId);
  }
  async startAuthorization(providerInput) {
    await this.ready;
    const manifest = manifestFor2(this.runtime, providerInput);
    if (!manifest) throw new Error(`\u672A\u77E5 provider\uFF1A${providerInput}`);
    if (!manifest.capabilities?.includes("oauth_authorization")) {
      return {
        status: "unsupported",
        providerId: manifest.id,
        instructions: `${providerName(manifest)} \u6CA1\u6709\u72EC\u7ACB\u7684\u5B98\u65B9 OAuth \u767B\u5F55\u547D\u4EE4\uFF1B\u8BF7\u5148\u5728\u5B98\u65B9\u73AF\u5883\u767B\u5F55\u6216\u5207\u6362\u8D26\u53F7\uFF0C\u7136\u540E\u626B\u63CF\u672C\u673A\u767B\u5F55\u6001\uFF0C\u518D\u6DFB\u52A0\u5019\u9009\u3002`
      };
    }
    const existingStart = this.#authStartPromises.get(manifest.id);
    if (existingStart) return existingStart;
    const startPromise = this.#startAuthorization(manifest);
    const trackedStart = startPromise.finally(() => {
      if (this.#authStartPromises.get(manifest.id) === trackedStart) {
        this.#authStartPromises.delete(manifest.id);
      }
    });
    this.#authStartPromises.set(manifest.id, trackedStart);
    return trackedStart;
  }
  async #startAuthorization(manifest) {
    const existing = this.#activeAuthSession(manifest.id);
    if (existing) {
      let current;
      try {
        current = await this.pollAuthorization(manifest.id, existing.sessionId);
      } catch (error) {
        current = {
          status: "processing",
          providerId: manifest.id,
          sessionId: existing.sessionId,
          ...existing.authorizationUrl ? { authorizationUrl: existing.authorizationUrl } : {},
          diagnostic: `\u5DF2\u6709\u767B\u5F55\u9A8C\u8BC1\u8FDB\u884C\u4E2D\uFF0C\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u6700\u65B0\u72B6\u6001\uFF1A${redactError(error)}`
        };
      }
      if (current?.status === "completed") return current;
      if (current && ["pending", "processing"].includes(current.status)) {
        this.#scheduleAuthorization(manifest.id, existing.sessionId);
        return {
          ...current,
          instructions: current.instructions ?? "\u5DF2\u6709\u767B\u5F55\u9A8C\u8BC1\u8FDB\u884C\u4E2D\uFF0C\u8BF7\u4F7F\u7528\u5F53\u524D Google \u9875\u9762\uFF1B\u4E0D\u4F1A\u91CD\u590D\u6253\u5F00\u767B\u5F55\u9875\u3002"
        };
      }
    }
    const started = await this.runtime.startAuthorization(manifest.id);
    this.#authSessions.set(started.sessionId, {
      providerId: manifest.id,
      sessionId: started.sessionId,
      status: started.status,
      authorizationUrl: started.authorizationUrl ?? null
    });
    const result = await this.#waitForAuthorizationUrl(manifest.id, started);
    const tracked = this.#authSessions.get(started.sessionId);
    if (tracked) Object.assign(tracked, {
      status: result.status,
      authorizationUrl: result.authorizationUrl ?? tracked.authorizationUrl ?? null
    });
    if (result.status === "pending" || result.status === "processing") this.#scheduleAuthorization(manifest.id, started.sessionId);
    else if (result.status === "completed") {
      this.#authSessions.delete(started.sessionId);
      await this.refresh(manifest.id).catch((error) => this.#warn("post-login quota refresh failed", error));
    }
    return result;
  }
  async pollAuthorization(providerId, sessionId) {
    const result = await this.runtime.pollAuthorization(providerId, sessionId);
    this.#openAuthorizationUrl(result);
    const tracked = this.#authSessions.get(sessionId);
    if (tracked) Object.assign(tracked, {
      status: result.status,
      authorizationUrl: result.authorizationUrl ?? tracked.authorizationUrl ?? null
    });
    if (result.status === "completed") {
      this.#authSessions.delete(sessionId);
      await this.refresh(providerId).catch((error) => this.#warn("post-login quota refresh failed", error));
    } else if (!["pending", "processing"].includes(result.status)) {
      this.#authSessions.delete(sessionId);
    }
    return result;
  }
  async cancelAuthorization(providerInput, sessionId) {
    await this.ready;
    const providerId = providerIdFor(this.runtime, providerInput) ?? String(providerInput);
    const tracked = this.#authSessions.get(sessionId);
    if (tracked?.timer) clearTimeout(tracked.timer);
    const result = await this.runtime.cancelAuthorization(providerId, sessionId);
    this.#authSessions.delete(sessionId);
    this.#authOpened.delete(sessionId);
    return result;
  }
  async submitAuthorizationCode(providerInput, sessionId, code) {
    await this.ready;
    const providerId = providerIdFor(this.runtime, providerInput) ?? String(providerInput);
    const result = await this.runtime.submitAuthorizationCode(providerId, sessionId, code);
    this.#openAuthorizationUrl(result);
    const tracked = this.#authSessions.get(sessionId);
    if (tracked) Object.assign(tracked, {
      status: result.status,
      authorizationUrl: result.authorizationUrl ?? tracked.authorizationUrl ?? null
    });
    if (result.status === "pending" || result.status === "processing") this.#scheduleAuthorization(providerId, sessionId);
    else if (result.status === "completed") {
      this.#authSessions.delete(sessionId);
      await this.refresh(providerId).catch((error) => this.#warn("post-login quota refresh failed", error));
    } else if (result.status !== "pending" && result.status !== "processing") {
      this.#authSessions.delete(sessionId);
    }
    return result;
  }
  helpText() {
    const providers = (this.runtime.listProviderManifests?.() ?? []).map((manifest) => `${manifest.id} (${providerName(manifest)})`);
    return [
      "Dockyard DSH \u539F\u751F\u547D\u4EE4\uFF1A",
      "/dockyard status                         \u67E5\u770B\u8D26\u53F7\u3001\u5B9E\u65F6\u989D\u5EA6\u548C\u5237\u65B0\u65F6\u95F4",
      "/dockyard scan [provider]                \u626B\u63CF\u672C\u673A\u5B98\u65B9\u767B\u5F55\u6001",
      "/dockyard add [provider] [candidateId]   \u6DFB\u52A0\u626B\u63CF\u5230\u7684 OAuth \u8D26\u53F7",
      "/dockyard login <provider>               \u6253\u5F00 provider \u5B98\u65B9 OAuth \u9A8C\u8BC1\u9875\u5E76\u767B\u5F55",
      "/dockyard refresh [provider]             \u5F3A\u5236\u8BFB\u53D6\u5B9E\u65F6\u989D\u5EA6",
      "/dockyard models <provider>              \u8BFB\u53D6 provider \u5B9E\u65F6\u6A21\u578B/\u6863\u4F4D",
      "/dockyard policy <provider> <policy>     \u8BBE\u7F6E manual/sticky_session/round_robin/failover",
      "/dockyard use <provider> <accountId>      \u624B\u52A8\u6307\u5B9A\u8D26\u53F7",
      "/dockyard remove <provider> <accountId>   \u4ECE\u8D26\u53F7\u6C60\u79FB\u9664\u8D26\u53F7\u5E76\u6E05\u7406\u672C\u673A Keychain \u5F15\u7528",
      "/dockyard cancel <provider> <sessionId>  \u53D6\u6D88 OAuth \u767B\u5F55",
      `\u5F53\u524D providers\uFF1A${providers.length ? providers.join("\u3001") : "\u6682\u65E0"}`
    ].join("\n");
  }
  #openAuthorizationUrl(result) {
    if (!result?.authorizationUrl || this.#authOpened.has(result.sessionId)) return;
    this.#authOpened.add(result.sessionId);
    if (result.browserOpened || result.providerId === "antigravity") return;
    void Promise.resolve(this.openBrowser(result.authorizationUrl)).catch((error) => {
      this.#warn("could not open authorization URL", error);
    });
  }
  #activeAuthSession(providerId) {
    return [...this.#authSessions.values()].find((session) => session.providerId === providerId && ["pending", "processing"].includes(session.status ?? "pending")) ?? null;
  }
  async #waitForAuthorizationUrl(providerId, started) {
    this.#openAuthorizationUrl(started);
    if (started.authorizationUrl || !["pending", "processing"].includes(started.status)) return started;
    const deadline = Date.now() + AUTH_URL_WAIT_MS;
    let result = started;
    while (Date.now() < deadline && ["pending", "processing"].includes(result.status)) {
      await sleep(100);
      result = await this.runtime.pollAuthorization(providerId, started.sessionId);
      this.#openAuthorizationUrl(result);
    }
    return result;
  }
  #scheduleAuthorization(providerId, sessionId) {
    const current = this.#authSessions.get(sessionId);
    if (!current || current.timer) return;
    current.timer = setTimeout(async () => {
      current.timer = null;
      if (this.#disposed) return;
      try {
        const result = await this.pollAuthorization(providerId, sessionId);
        if (["pending", "processing"].includes(result.status)) this.#scheduleAuthorization(providerId, sessionId);
      } catch (error) {
        this.#authSessions.delete(sessionId);
        this.#warn("OAuth authorization polling failed", error);
      }
    }, AUTH_POLL_INTERVAL_MS);
    current.timer.unref?.();
  }
  #warn(message, error) {
    this.logger?.warn?.(`[dockyard-dsh] ${message}: ${redactError(error)}`);
  }
};
function createDockyardCommand(service) {
  return {
    name: "dockyard",
    description: "Manage Dockyard DSH providers, OAuth accounts, quotas, models, and account selection",
    input: { hint: "status | scan | add | login | refresh | models | policy | use | cancel" },
    handler: async ({ rawInput, signal }) => {
      if (signal?.aborted) return commandError("Dockyard \u547D\u4EE4\u5DF2\u53D6\u6D88\u3002");
      const [verb = "help", ...args] = commandTokens(rawInput);
      try {
        switch (verb.toLowerCase()) {
          case "help":
            return commandSuccess(service.helpText());
          case "status": {
            const snapshot = await service.snapshot();
            const lines = ["Dockyard DSH \u72B6\u6001", `\u66F4\u65B0\u65F6\u95F4\uFF1A${displayTime(snapshot.generatedAt)}`];
            for (const provider of snapshot.providers ?? []) {
              lines.push(`
${providerName(provider.manifest)} [${provider.providerId}]`);
              lines.push(`\u7B56\u7565\uFF1A${provider.policy}\uFF1B\u5F53\u524D\u8D26\u53F7\uFF1A${provider.defaultAccountId ?? "\u8DDF\u968F\u7B56\u7565"}`);
              if (!provider.accounts?.length) lines.push("\u6682\u65E0\u5DF2\u6DFB\u52A0\u8D26\u53F7");
              for (const account of provider.accounts ?? []) lines.push(`- ${displayAccount(account)}`);
            }
            return commandSuccess(lines.join("\n"));
          }
          case "scan": {
            const result = await service.scan(args[0] ?? null);
            const lines = ["\u672C\u673A OAuth \u767B\u5F55\u6001\u626B\u63CF\u7ED3\u679C\uFF1A"];
            for (const provider of result.providers ?? []) {
              lines.push(`
${providerName(provider.manifest)} [${provider.providerId}]`);
              if (!provider.candidates?.length) lines.push(`\u672A\u53D1\u73B0\uFF1A${provider.diagnostics?.join("\uFF1B") || "provider \u672A\u8FD4\u56DE\u5019\u9009"}`);
              for (const candidate2 of provider.candidates ?? []) {
                lines.push(`- ${candidate2.imported ? "\u5DF2\u6DFB\u52A0" : "\u53EF\u6DFB\u52A0"} ${candidate2.candidateId}\uFF1A${candidate2.email ?? candidate2.displayName ?? candidate2.accountId}`);
              }
            }
            return commandSuccess(lines.join("\n"));
          }
          case "add": {
            const result = await service.add(args[0] ?? null, args[1] ?? null);
            const lines = [`\u5DF2\u6DFB\u52A0\u8D26\u53F7\uFF1A${result.accounts.length}`];
            for (const account of result.accounts) lines.push(`- ${account.email ?? account.displayName ?? account.accountId}`);
            if (!result.accounts.length) lines.push("\u6CA1\u6709\u65B0\u7684 OAuth \u5019\u9009\uFF1B\u5148\u6267\u884C /dockyard scan \u67E5\u770B\u672C\u673A\u767B\u5F55\u6001\u3002");
            if (result.diagnostics.length) lines.push(`\u8BCA\u65AD\uFF1A${result.diagnostics.join("\uFF1B")}`);
            return commandSuccess(lines.join("\n"));
          }
          case "login": {
            if (!args[0]) return commandError("\u7528\u6CD5\uFF1A/dockyard login <provider>");
            const result = await service.startAuthorization(args[0]);
            if (["unsupported", "opened", "failed"].includes(result.status)) {
              return result.status === "failed" ? commandError(result.diagnostic ?? result.instructions) : commandSuccess(result.instructions);
            }
            const lines = [`OAuth \u72B6\u6001\uFF1A${result.status}`, `\u4F1A\u8BDD\uFF1A${result.sessionId}`];
            if (result.authorizationUrl) lines.push(`\u5B98\u65B9\u6388\u6743\u9875\uFF1A${result.authorizationUrl}`);
            if (result.instructions) lines.push(result.instructions);
            if (result.diagnostic) lines.push(`\u8BCA\u65AD\uFF1A${result.diagnostic}`);
            return commandSuccess(lines.join("\n"));
          }
          case "refresh": {
            const results = await service.refresh(args[0] ?? null);
            const lines = [`\u5DF2\u5237\u65B0\u8D26\u53F7\uFF1A${results.length}`];
            for (const result of results) {
              const account = result.account;
              lines.push(`- ${account?.providerId ?? "provider"}/${account?.email ?? account?.accountId ?? "unknown"}\uFF1A${result.diagnostics?.join("\uFF1B") || "\u6210\u529F"}`);
            }
            return commandSuccess(lines.join("\n"));
          }
          case "models": {
            if (!args[0]) return commandError("\u7528\u6CD5\uFF1A/dockyard models <provider>");
            const { providerId, manifest, catalog } = await service.catalog(args[0]);
            const lines = [`${providerName(manifest)} [${providerId}] \u5B9E\u65F6\u6A21\u578B\u76EE\u5F55\uFF1A`];
            for (const model of catalog.models ?? []) {
              const efforts = model.reasoning?.efforts?.map((effort) => effort.id).join(", ");
              lines.push(`- ${model.id}${model.name && model.name !== model.id ? `\uFF1A${model.name}` : ""}${efforts ? `\uFF1B\u6863\u4F4D\uFF1A${efforts}` : ""}`);
            }
            if (!(catalog.models ?? []).length) lines.push("provider \u5F53\u524D\u6CA1\u6709\u8FD4\u56DE\u6A21\u578B\u3002");
            return commandSuccess(lines.join("\n"));
          }
          case "policy": {
            if (!args[0] || !args[1]) return commandError("\u7528\u6CD5\uFF1A/dockyard policy <provider> <manual|sticky_session|round_robin|failover> [accountId]");
            const result = await service.setPolicy(args[0], args[1], args[2]);
            return commandSuccess(`\u5DF2\u8BBE\u7F6E ${result.providerId} \u7B56\u7565\u4E3A ${result.policy}\uFF1B\u9ED8\u8BA4\u8D26\u53F7\uFF1A${result.defaultAccountId ?? "\u8DDF\u968F\u7B56\u7565"}`);
          }
          case "use": {
            if (!args[0] || !args[1]) return commandError("\u7528\u6CD5\uFF1A/dockyard use <provider> <accountId>");
            const result = await service.setDefaultAccount(args[0], args[1]);
            return commandSuccess(`\u5DF2\u5C06 ${result.providerId} \u5F53\u524D\u8D26\u53F7\u8BBE\u4E3A ${result.defaultAccountId}`);
          }
          case "remove": {
            if (!args[0] || !args[1]) return commandError("\u7528\u6CD5\uFF1A/dockyard remove <provider> <accountId>");
            const result = await service.removeAccount(args[0], args[1]);
            const diagnostic = result.diagnostics?.length ? `\uFF1B${result.diagnostics.join("\uFF1B")}` : "";
            return commandSuccess(`\u5DF2\u79FB\u9664 ${result.providerId}/${result.accountId}\uFF1B\u5F53\u524D\u8D26\u53F7\uFF1A${result.defaultAccountId ?? "\u8DDF\u968F\u7B56\u7565"}${diagnostic}`);
          }
          case "cancel": {
            if (!args[0] || !args[1]) return commandError("\u7528\u6CD5\uFF1A/dockyard cancel <provider> <sessionId>");
            const result = await service.cancelAuthorization(args[0], args[1]);
            return commandSuccess(`OAuth \u4F1A\u8BDD ${result.sessionId}\uFF1A${result.status}`);
          }
          default:
            return commandError(`\u672A\u77E5 Dockyard \u5B50\u547D\u4EE4\uFF1A${verb}

${service.helpText()}`);
        }
      } catch (error) {
        return commandError(`Dockyard \u547D\u4EE4\u5931\u8D25\uFF1A${redactError(error)}`);
      }
    }
  };
}
var dockyardDshConstants = Object.freeze({
  defaultRefreshIntervalMs: DEFAULT_REFRESH_INTERVAL_MS,
  authPollIntervalMs: AUTH_POLL_INTERVAL_MS
});

// packages/dsh-plugin/src/dockyard-credential-store.mjs
import { createHash as createHash8 } from "node:crypto";
function dshCredentialRef(ref) {
  const digest = createHash8("sha256").update(String(ref)).digest("hex");
  return `DOCKYARD_DSH_${digest}`;
}
function parseCredential(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("DSH Credentials \u4E2D\u7684 Dockyard \u51ED\u8BC1\u683C\u5F0F\u65E0\u6548");
  }
}
function createDockyardCredentialStore(credentials, fallback = null) {
  const usable = credentials && typeof credentials.resolve === "function" && typeof credentials.set === "function" && typeof credentials.unset === "function";
  return {
    async read(ref) {
      if (usable) {
        const resolved = await credentials.resolve(dshCredentialRef(ref));
        const parsed = parseCredential(resolved?.value);
        if (parsed !== null) return parsed;
      }
      return typeof fallback?.read === "function" ? fallback.read(ref) : null;
    },
    async write(ref, value) {
      if (usable) {
        await credentials.set(dshCredentialRef(ref), JSON.stringify(value));
        return ref;
      }
      if (typeof fallback?.write !== "function") throw new Error("DSH Credentials \u5C1A\u672A\u5C31\u7EEA");
      return fallback.write(ref, value);
    },
    async delete(ref) {
      if (usable) await credentials.unset(dshCredentialRef(ref));
      if (typeof fallback?.delete === "function") await fallback.delete(ref);
    }
  };
}

// packages/dsh-plugin/src/native-key-pool-host.mjs
import { join as join11 } from "node:path";

// packages/dsh-plugin/src/native-usage.mjs
import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
var builtinBaseUrls = /* @__PURE__ */ new Map();
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
  if (!baseUrl) throw new Error("provider \u6CA1\u6709\u8FD4\u56DE\u53EF\u7528\u7684 base URL");
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), base).toString();
}
async function readJson2(response) {
  const raw = await response.text();
  let body;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const detail = typeof body?.error === "string" ? body.error : body?.error?.message ?? body?.message ?? response.statusText;
    throw new Error(`${response.status} ${detail || "provider usage \u8BF7\u6C42\u5931\u8D25"}`);
  }
  if (!body || typeof body !== "object") throw new Error("provider usage \u8FD4\u56DE\u4E86\u65E0\u6548 JSON");
  return body;
}
function bearerHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
}
function updatedAt() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function deepseekBalanceModule() {
  return {
    id: "deepseek-balance",
    supports: ["deepseek", "deepseek-official"],
    async fetch({ providerId, profile, apiKey, signal }) {
      const body = await readJson2(await fetch(endpoint(baseUrlFor(providerId, profile), "user/balance"), {
        method: "GET",
        headers: bearerHeaders(apiKey),
        signal
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
            name: "\u8D26\u6237\u4F59\u989D",
            remaining: typeof balance.total_balance === "string" || typeof balance.total_balance === "number" ? balance.total_balance : null,
            limit: null,
            unit: balance.currency ?? null,
            resetAt: null,
            updatedAt: refreshedAt
          }))
        },
        details: balances.map((balance) => ({
          currency: balance.currency ?? null,
          totalBalance: balance.total_balance ?? null,
          grantedBalance: balance.granted_balance ?? null,
          toppedUpBalance: balance.topped_up_balance ?? null
        }))
      };
    }
  };
}
function openRouterCreditsModule() {
  return {
    id: "openrouter-credits",
    supports: ["openrouter"],
    async fetch({ providerId, profile, apiKey, signal }) {
      const body = await readJson2(await fetch(endpoint(baseUrlFor(providerId, profile), "credits"), {
        method: "GET",
        headers: bearerHeaders(apiKey),
        signal
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
            name: "\u5269\u4F59 credits",
            remaining: total !== null && used !== null ? total - used : null,
            limit: total,
            unit: "USD",
            resetAt: null,
            updatedAt: refreshedAt
          }]
        },
        details: { totalCredits: total, totalUsage: used }
      };
    }
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
        ...helpUrl ? { helpUrl } : {},
        updatedAt: updatedAt()
      };
    }
  };
}
var MODULES = [
  deepseekBalanceModule(),
  openRouterCreditsModule(),
  unsupportedModule(
    ["opencode", "opencode-go"],
    "OpenCode \u5B98\u65B9\u76EE\u524D\u516C\u5F00\u6A21\u578B\u76EE\u5F55\u548C\u63A7\u5236\u53F0\u7528\u91CF\uFF0C\u6CA1\u6709\u516C\u5F00\u7ED9 API Key \u8C03\u7528\u7684\u5B9E\u65F6\u4F59\u989D/\u989D\u5EA6\u63A5\u53E3\u3002",
    "https://opencode.ai/zen"
  )
];
var modulesByProvider = /* @__PURE__ */ new Map();
for (const module of MODULES) {
  for (const providerId of module.supports) modulesByProvider.set(providerId, module);
}
var genericUnsupported = unsupportedModule([], "\u8BE5 provider \u5F53\u524D\u6CA1\u6709\u53EF\u9A8C\u8BC1\u7684\u5B98\u65B9\u4F59\u989D/\u989D\u5EA6\u63A5\u53E3\uFF1B\u4E0D\u4F1A\u7528\u8BF7\u6C42\u6B21\u6570\u6216\u56FA\u5B9A\u767E\u5206\u6BD4\u66FF\u4EE3\u3002", null);
function usageModuleFor(providerId) {
  return modulesByProvider.get(providerId) ?? genericUnsupported;
}

// packages/dsh-plugin/src/native-key-pool-host.mjs
var POLICIES = /* @__PURE__ */ new Set(["manual", "round_robin", "failover"]);
var PATCH_MARK = Symbol("dockyard-native-key-pool");
var VISIBLE_STREAM_CHUNKS = /* @__PURE__ */ new Set(["text-delta", "reasoning-delta", "tool-call-delta"]);
function text(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function pathValue(source, path = []) {
  let current = source;
  for (const segment of path) {
    if (!current || typeof current !== "object") return void 0;
    current = current[segment];
  }
  return current;
}
function cleanRecord(raw) {
  const keys = Array.isArray(raw?.keys) ? raw.keys.filter((entry) => text(entry?.ref)).map((entry) => ({
    ref: text(entry.ref),
    label: text(entry.label) ?? text(entry.ref),
    createdAt: text(entry.createdAt)
  })) : [];
  return {
    policy: POLICIES.has(raw?.policy) ? raw.policy : "manual",
    keys
  };
}
function publicCredential(info) {
  if (!info || typeof info !== "object") return { configured: false };
  return {
    configured: info.configured === true,
    ...typeof info.source === "string" ? { source: info.source } : {},
    ...typeof info.writable === "boolean" ? { writable: info.writable } : {}
  };
}
function failureMessage(error) {
  return error instanceof Error ? error.message : String(error ?? "\u672A\u77E5\u9519\u8BEF");
}
function nativeProfile(ctx, providerId) {
  const hasGetter = typeof ctx?.get === "function";
  const llm = hasGetter ? ctx.get("llm") : ctx.llm;
  const settings = hasGetter ? ctx.get("settings") : ctx.settings;
  const entry = llm?.listConfigurableProviders?.().find((candidate2) => candidate2.provider === providerId) ?? null;
  const profile = entry && settings?.get ? pathValue(settings.get(entry.settingsNs), entry.settingsPath) : null;
  if (!entry || !profile || typeof profile !== "object") return { entry, profile: null };
  const native = entry.settingsNs === "llm-pi-ai" || text(profile.apiKeyEnv) !== null;
  return { entry, profile: native ? profile : null };
}
var NativeKeyPoolHost = class {
  ctx;
  credentials;
  settings;
  llm;
  logger;
  stateStore;
  records = /* @__PURE__ */ new Map();
  cursors = /* @__PURE__ */ new Map();
  patches = [];
  offAdapters = null;
  offStreams = null;
  readyPromise;
  constructor(ctx, { logger = null, stateStore = null } = {}) {
    this.ctx = ctx;
    this.credentials = null;
    this.settings = null;
    this.llm = null;
    this.logger = logger ?? console;
    this.stateStore = stateStore ?? new JsonStateStore({
      filePath: join11(defaultDockyardHome(), "native-key-pools.json")
    });
    this.readyPromise = this.loadState();
  }
  resolveServices() {
    const get = (name2) => {
      try {
        if (typeof this.ctx?.get === "function") return this.ctx.get(name2);
        return this.ctx?.[name2];
      } catch {
        return null;
      }
    };
    this.credentials = get("credentials");
    this.settings = get("settings");
    this.llm = get("llm");
  }
  async loadState() {
    try {
      const state = await this.stateStore.load();
      const providers = state?.nativeKeyPools;
      if (providers && typeof providers === "object") {
        for (const [providerId, record] of Object.entries(providers)) {
          this.records.set(providerId, cleanRecord(record));
        }
      }
    } catch (error) {
      this.logger.warn?.(`native Key \u6C60\u72B6\u6001\u8BFB\u53D6\u5931\u8D25\uFF1A${failureMessage(error)}`);
    }
    return this;
  }
  async saveState() {
    const nativeKeyPools = Object.fromEntries([...this.records].map(([providerId, record]) => [
      providerId,
      cleanRecord(record)
    ]));
    await this.stateStore.save({ nativeKeyPools });
  }
  async start() {
    await this.readyPromise;
    this.resolveServices();
    this.patchAdapters();
    if (typeof this.ctx.on === "function") {
      this.offAdapters = this.ctx.on("llm/adapters-updated", () => this.patchAdapters());
      this.offStreams = this.ctx.on("llm/stream", (options, next) => this.stream(options, next));
    }
    this.patchAdapters();
    return this;
  }
  dispose() {
    this.offAdapters?.();
    this.offStreams?.();
    this.offAdapters = null;
    this.offStreams = null;
    for (const patch of this.patches.splice(0)) {
      if (patch.config.resolveApiKey?.[PATCH_MARK] === patch.wrapper) {
        patch.config.resolveApiKey = patch.original;
      }
    }
  }
  patchAdapters() {
    const adapters = this.llm?.adapters;
    if (!adapters || typeof adapters.values !== "function") return;
    for (const registration of adapters.values()) {
      const adapter = registration?.adapter;
      const config = adapter?.config;
      const original = config?.resolveApiKey;
      if (!config || typeof original !== "function" || original?.[PATCH_MARK]) continue;
      const directConnectionResolver = typeof config.options === "function" && typeof config.resolveUserId === "function";
      const wrapper = directConnectionResolver ? async (connection) => this.resolveDirectApiKey(connection, original) : async (providerId, profile) => this.resolveApiKey(providerId, profile, original);
      Object.defineProperty(wrapper, PATCH_MARK, { value: wrapper });
      config.resolveApiKey = wrapper;
      this.patches.push({ config, original, wrapper });
    }
  }
  record(providerId) {
    let record = this.records.get(providerId);
    if (!record) {
      record = cleanRecord({});
      this.records.set(providerId, record);
    }
    return record;
  }
  async syncProvider(providerId, profileHint = null) {
    await this.readyPromise;
    const profile = profileHint ?? nativeProfile(this.ctx, providerId).profile;
    const activeRef = text(profile?.apiKeyEnv);
    if (!activeRef) return { profile, activeRef: null, record: this.record(providerId) };
    const record = this.record(providerId);
    if (!record.keys.some((entry) => entry.ref === activeRef)) {
      record.keys.push({ ref: activeRef, label: "\u5F53\u524D DSH Key", createdAt: (/* @__PURE__ */ new Date()).toISOString() });
      await this.saveState();
    }
    return { profile, activeRef, record };
  }
  async register(providerId, ref, label = "") {
    const keyRef = text(ref);
    if (!text(providerId) || !keyRef) throw new Error("provider \u548C Key \u5F15\u7528\u4E0D\u80FD\u4E3A\u7A7A");
    const { record } = await this.syncProvider(providerId);
    const current = record.keys.find((entry) => entry.ref === keyRef);
    if (current) {
      current.label = text(label) ?? current.label;
    } else {
      record.keys.push({ ref: keyRef, label: text(label) ?? `Key ${record.keys.length + 1}`, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
    }
    await this.saveState();
    return this.status(providerId);
  }
  async unregister(providerId, ref) {
    const record = this.record(providerId);
    record.keys = record.keys.filter((entry) => entry.ref !== ref);
    await this.saveState();
    return this.status(providerId);
  }
  async setPolicy(providerId, policy) {
    if (!POLICIES.has(policy)) throw new Error(`\u4E0D\u652F\u6301\u7684 Key \u7B56\u7565\uFF1A${policy}`);
    const record = this.record(providerId);
    record.policy = policy;
    this.cursors.delete(providerId);
    await this.saveState();
    return this.status(providerId);
  }
  async credentialInfo(ref) {
    try {
      if (typeof this.credentials?.describe !== "function") return { configured: false };
      return publicCredential(await this.credentials.describe(ref));
    } catch (error) {
      return { configured: false, error: failureMessage(error) };
    }
  }
  async configuredKeys(record) {
    const rows = [];
    for (const entry of record.keys) {
      const credential = await this.credentialInfo(entry.ref);
      rows.push({ ...entry, configured: credential.configured, credential });
    }
    return rows;
  }
  async status(providerId) {
    const synced = await this.syncProvider(providerId);
    const rows = await this.configuredKeys(synced.record);
    return {
      providerId,
      policy: synced.record.policy,
      activeRef: synced.activeRef,
      runtimeMode: this.patches.length > 0 ? "request-key-pool" : "native-single-key",
      keys: rows.map((entry) => ({ ...entry, active: entry.ref === synced.activeRef })),
      quota: null,
      usage: null
    };
  }
  async pickKey(providerId, record, activeRef) {
    const candidates = [];
    for (const entry of record.keys) {
      const credential = await this.credentialInfo(entry.ref);
      if (credential.configured) candidates.push(entry);
    }
    if (candidates.length === 0) return null;
    const policy = record.policy;
    if (policy === "manual") {
      return candidates.find((entry) => entry.ref === activeRef) ?? candidates[0];
    }
    const cursor = this.cursors.get(providerId) ?? 0;
    const chosen = candidates[cursor % candidates.length];
    this.cursors.set(providerId, (cursor + 1) % candidates.length);
    return chosen;
  }
  async resolveApiKey(providerId, profile, original) {
    const synced = await this.syncProvider(providerId, profile);
    if (!synced.profile || !synced.activeRef || synced.record.policy === "manual" || typeof this.credentials?.resolve !== "function") {
      return original(providerId, profile);
    }
    const chosen = await this.pickKey(providerId, synced.record, synced.activeRef);
    if (!chosen) return original(providerId, profile);
    const resolved = await this.credentials.resolve(chosen.ref);
    const value = text(resolved?.value);
    if (value) return value;
    return original(providerId, profile);
  }
  async resolveDirectApiKey(connection, original) {
    const providerId = "deepseek-official";
    const synced = await this.syncProvider(providerId, connection);
    if (!synced.profile || !synced.activeRef || synced.record.policy === "manual" || typeof this.credentials?.resolve !== "function") {
      return original(connection);
    }
    const chosen = await this.pickKey(providerId, synced.record, synced.activeRef);
    if (!chosen) return original(connection);
    const resolved = await this.credentials.resolve(chosen.ref);
    const value = text(resolved?.value);
    if (value) return value;
    return original(connection);
  }
  shouldRetry(providerId) {
    const record = this.records.get(providerId);
    return record?.policy === "failover" && record.keys.length > 1;
  }
  async *stream(options, next) {
    if (typeof next !== "function") return;
    if (!this.shouldRetry(options?.provider)) {
      yield* next();
      return;
    }
    const configured = await this.configuredKeys(this.records.get(options.provider));
    const attempts = Math.max(1, configured.filter((entry) => entry.configured).length);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const buffered = [];
      let emitted = false;
      let retryable = false;
      for await (const chunk of next()) {
        if (VISIBLE_STREAM_CHUNKS.has(chunk?.type)) emitted = true;
        if (!emitted) buffered.push(chunk);
        else if (buffered.length > 0) {
          yield* buffered.splice(0);
          yield chunk;
        } else yield chunk;
        if (chunk?.type === "finish" && chunk.reason?.kind === "error") {
          retryable = !emitted;
          if (retryable && attempt + 1 < attempts) break;
        }
      }
      if (retryable && !emitted && attempt + 1 < attempts) continue;
      if (buffered.length > 0) yield* buffered;
      return;
    }
  }
  async refreshUsage(providerId, signal) {
    const synced = await this.syncProvider(providerId);
    const rows = await this.configuredKeys(synced.record);
    const module = usageModuleFor(providerId);
    const nextRows = [];
    for (const row of rows) {
      let usage;
      if (!row.configured || typeof this.credentials?.resolve !== "function") {
        usage = { status: "unconfigured", message: "\u8BE5 Key \u5C1A\u672A\u914D\u7F6E" };
      } else {
        try {
          const resolved = await this.credentials.resolve(row.ref);
          const apiKey = text(resolved?.value);
          usage = apiKey ? await module.fetch({ providerId, profile: synced.profile, apiKey, signal }) : { status: "unconfigured", message: "\u8BE5 Key \u5C1A\u672A\u914D\u7F6E" };
        } catch (error) {
          usage = { status: "error", message: failureMessage(error), updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
        }
      }
      nextRows.push({ ...row, active: row.ref === synced.activeRef, usage, quota: usage?.quota ?? null });
    }
    const active = nextRows.find((entry) => entry.active) ?? nextRows[0] ?? null;
    return {
      providerId,
      policy: synced.record.policy,
      activeRef: synced.activeRef,
      runtimeMode: this.patches.length > 0 ? "request-key-pool" : "native-single-key",
      keys: nextRows,
      usage: active?.usage ?? { status: "unsupported", message: "provider \u5C1A\u672A\u8FD4\u56DE\u989D\u5EA6\u6570\u636E" },
      quota: active?.quota ?? null,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// packages/dsh-plugin/src/index.mjs
var name = "dockyard-dsh";
var inject = ["llm", "commands", "credentials", "settings"];
function contextLogger(ctx, name2) {
  try {
    const factory = typeof ctx?.get === "function" ? ctx.get("logger") : null;
    if (typeof factory === "function") return factory(name2);
  } catch {
  }
  return console;
}
function apply(ctx, config = {}) {
  const runtimeOptions = { ...config.runtimeOptions ?? {} };
  let catalogWarmers = [];
  if (!config.runtime && !runtimeOptions.providers) {
    const antigravityOptions = {
      ...runtimeOptions.antigravity ?? {}
    };
    antigravityOptions.quotaReader = runtimeOptions.antigravity?.quotaReader ?? createAntigravityNativeQuotaReader(antigravityOptions);
    runtimeOptions.antigravity = antigravityOptions;
    const modelRegistryLoader = runtimeOptions.modelRegistryLoader ?? createPiAiModelRegistryLoader();
    const antigravityCatalogLoader = runtimeOptions.catalogLoaders?.antigravity ?? createAntigravityCatalogLoader({ ...antigravityOptions, registryLoader: modelRegistryLoader });
    runtimeOptions.requestExecutors = {
      ...runtimeOptions.requestExecutors ?? {},
      "openai-codex": runtimeOptions.requestExecutors?.["openai-codex"] ?? createCodexDshRequestExecutor(),
      antigravity: runtimeOptions.requestExecutors?.antigravity ?? createAntigravityNativeExecutor({
        ...antigravityOptions
      }),
      claude: runtimeOptions.requestExecutors?.claude ?? createClaudeNativeExecutor(runtimeOptions.claude ?? {}),
      cursor: runtimeOptions.requestExecutors?.cursor ?? createCursorNativeExecutor(runtimeOptions.cursor ?? {}),
      grok: runtimeOptions.requestExecutors?.grok ?? createGrokNativeExecutor(runtimeOptions.grok ?? {})
    };
    runtimeOptions.catalogLoaders = {
      ...runtimeOptions.catalogLoaders ?? {},
      "openai-codex": createCodexDshCatalogLoader(),
      antigravity: antigravityCatalogLoader,
      grok: runtimeOptions.catalogLoaders?.grok ?? createGrokCatalogLoader({
        ...runtimeOptions.grok ?? {},
        commandRunner: runtimeOptions.grok?.commandRunner ?? runCliCommand
      }),
      claude: runtimeOptions.catalogLoaders?.claude ?? createClaudeCatalogLoader({ registryLoader: modelRegistryLoader }),
      cursor: runtimeOptions.catalogLoaders?.cursor ?? createCursorCatalogLoader(runtimeOptions.cursor ?? {})
    };
    runtimeOptions.providers = createDefaultProviderEntries(runtimeOptions);
    catalogWarmers = Object.entries(runtimeOptions.catalogLoaders).filter(([, loader]) => typeof loader === "function");
  }
  const runtime = config.runtime ?? new DockyardRuntime(runtimeOptions);
  if (catalogWarmers.length > 0 && typeof runtime.init === "function") {
    void (async () => {
      await runtime.init();
      const connected = new Set(
        (runtime.snapshot?.().providers ?? []).filter((provider) => Array.isArray(provider.accounts) && provider.accounts.length > 0).map((provider) => provider.providerId)
      );
      await Promise.all(catalogWarmers.filter(([providerId]) => providerId === "openai-codex" || connected.has(providerId)).map(([, loader]) => loader().catch(() => null)));
    })().catch((error) => {
      contextLogger(ctx, "dockyard-dsh").warn?.(error);
    });
  }
  const adapter = createDockyardLlmAdapter({
    runtime,
    providerIds: config.providers ?? runtime.listProviderIds(),
    // Resolve this only when a request is actually streamed. The attachment
    // service is installed by DSH's base profile after plugin composition;
    // reading it while the plugin graph is being composed breaks boot.
    attachmentsResolver: () => {
      try {
        return typeof ctx.get === "function" ? ctx.get("attachments") : ctx.attachments;
      } catch {
        return void 0;
      }
    }
  });
  const registerAdapter = () => ctx.llm.registerAdapter(adapter.providers(), adapter);
  if (typeof ctx.effect === "function") {
    ctx.effect(registerAdapter, "dockyard-dsh: llm adapter");
  } else {
    registerAdapter();
  }
  if (typeof runtime.init === "function") {
    const service = config.service ?? new DockyardDshService({
      runtime,
      ...config.serviceOptions ?? {},
      logger: config.serviceOptions?.logger ?? contextLogger(ctx, "dockyard-dsh")
    });
    if (typeof ctx.provide === "function") ctx.provide("dockyard", service);
    let nativeKeyPool = config.nativeKeyPool ?? null;
    const install = () => {
      try {
        const credentials = typeof ctx.get === "function" ? ctx.get("credentials") : ctx.credentials;
        if (credentials && typeof runtime.setSecretStore === "function") {
          runtime.setSecretStore(createDockyardCredentialStore(credentials, runtime.secretStore));
        }
      } catch (error) {
        contextLogger(ctx, "dockyard-dsh").warn?.(`DSH Credentials \u63A5\u5165\u5931\u8D25\uFF0C\u5C06\u4FDD\u7559\u539F\u6709\u5B89\u5168\u5B58\u50A8\uFF1A${error.message}`);
      }
      nativeKeyPool ??= new NativeKeyPoolHost(ctx, {
        logger: config.serviceOptions?.logger ?? contextLogger(ctx, "dockyard-dsh")
      });
      const nativeKeyPoolReady = nativeKeyPool.start();
      void nativeKeyPoolReady.catch((error) => {
        contextLogger(ctx, "dockyard-dsh").warn?.(error);
      });
      const unregister = ctx.commands?.register?.(createDockyardCommand(service));
      void service.start().catch((error) => {
        contextLogger(ctx, "dockyard-dsh").error?.(error);
      });
      let remoteFiberPromise;
      if (typeof ctx.plugin === "function") {
        remoteFiberPromise = Promise.resolve().then(() => (init_dockyard_remote_host(), dockyard_remote_host_exports)).then(({ DockyardRemoteService: DockyardRemoteService2 }) => ctx.plugin(DockyardRemoteService2, { service, nativeKeyPool })).catch((error) => {
          contextLogger(ctx, "dockyard-dsh").error?.(error);
          return null;
        });
      }
      return async () => {
        await remoteFiberPromise?.catch?.(() => null);
        await nativeKeyPoolReady.catch?.(() => null);
        nativeKeyPool?.dispose?.();
        unregister?.();
        await service.dispose();
      };
    };
    if (typeof ctx.effect === "function") {
      ctx.effect(install, "dockyard-dsh: service and commands");
    } else {
      install();
    }
  }
}
export {
  DockyardDshService,
  DockyardRuntime,
  NativeKeyPoolHost,
  apply,
  createDockyardCommand,
  createDockyardLlmAdapter,
  inject,
  name
};
