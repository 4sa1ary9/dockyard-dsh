const MAX_CONTEXT_WINDOW = Number.MAX_SAFE_INTEGER;

function text(value) {
  const normalized = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeContextWindow(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number"
    ? value
    : Number(String(value).replaceAll(",", "").trim());
  if (!Number.isSafeInteger(numeric) || numeric <= 0 || numeric > MAX_CONTEXT_WINDOW) return null;
  return numeric;
}

function normalizedMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function cleanModelMap(value) {
  const output = {};
  for (const [modelId, raw] of Object.entries(normalizedMap(value))) {
    const id = text(modelId);
    const contextWindow = normalizeContextWindow(raw);
    if (id && contextWindow !== null) output[id] = contextWindow;
  }
  return output;
}

function cleanNestedModelMap(value) {
  const output = {};
  for (const [scopeId, models] of Object.entries(normalizedMap(value))) {
    const id = text(scopeId);
    const cleaned = cleanModelMap(models);
    if (id && Object.keys(cleaned).length > 0) output[id] = cleaned;
  }
  return output;
}

function cleanProviderRecord(value) {
  return {
    models: cleanModelMap(value?.models),
    accounts: cleanNestedModelMap(value?.accounts),
    keys: cleanNestedModelMap(value?.keys),
  };
}

function cleanState(value) {
  const providers = {};
  for (const [providerId, record] of Object.entries(normalizedMap(value?.providers))) {
    const id = text(providerId);
    if (!id) continue;
    const cleaned = cleanProviderRecord(record);
    if (Object.values(cleaned).some((map) => Object.keys(map).length > 0)) providers[id] = cleaned;
  }
  return { schema: 1, providers };
}

function assertScope(scope = {}) {
  const providerId = text(scope.providerId);
  const modelId = text(scope.modelId);
  const accountId = text(scope.accountId);
  const keyRef = text(scope.keyRef);
  if (!providerId) throw new Error("上下文覆盖配置需要 providerId");
  if (!modelId) throw new Error("上下文覆盖配置需要 modelId");
  if (accountId && keyRef) throw new Error("上下文覆盖配置不能同时绑定账号和 Key");
  return {
    providerId,
    modelId,
    ...(accountId ? { accountId } : {}),
    ...(keyRef ? { keyRef } : {}),
  };
}

function bucketFor(scope) {
  if (scope.keyRef) return ["keys", scope.keyRef];
  if (scope.accountId) return ["accounts", scope.accountId];
  return ["models", null];
}

function exactValue(state, scope) {
  const provider = state.providers?.[scope.providerId];
  if (!provider) return null;
  const [bucket, scopeId] = bucketFor(scope);
  const models = scopeId ? provider[bucket]?.[scopeId] : provider.models;
  return normalizeContextWindow(models?.[scope.modelId]);
}

function resolveValue(state, scope) {
  const provider = state.providers?.[scope.providerId];
  if (!provider) return null;
  if (scope.keyRef) {
    const keyValue = normalizeContextWindow(provider.keys?.[scope.keyRef]?.[scope.modelId]);
    if (keyValue !== null) return keyValue;
  }
  if (scope.accountId) {
    const accountValue = normalizeContextWindow(provider.accounts?.[scope.accountId]?.[scope.modelId]);
    if (accountValue !== null) return accountValue;
  }
  return normalizeContextWindow(provider.models?.[scope.modelId]);
}

function cloneState(value) {
  return structuredClone(cleanState(value));
}

function removeEmptyScopes(provider, bucket, scopeId) {
  if (bucket === "models") return;
  if (Object.keys(provider[bucket]?.[scopeId] ?? {}).length === 0) delete provider[bucket][scopeId];
}

function removeEmptyProvider(state, providerId) {
  const provider = state.providers?.[providerId];
  if (!provider) return;
  if (Object.values(provider).every((map) => Object.keys(map).length === 0)) delete state.providers[providerId];
}

/**
 * User-owned context limits. Provider catalogs remain read-only source data;
 * this store only keeps an optional request-time override keyed by provider,
 * model, and the selected account or native credential reference.
 */
export class ContextWindowOverrideStore {
  stateStore;
  state = { schema: 1, providers: {} };
  readyPromise;

  constructor({ stateStore } = {}) {
    if (!stateStore || typeof stateStore.load !== "function"
      || (typeof stateStore.update !== "function" && typeof stateStore.save !== "function")) {
      throw new TypeError("Context window override store requires a state store");
    }
    this.stateStore = stateStore;
    this.readyPromise = this.load();
  }

  async load() {
    const snapshot = await this.stateStore.load();
    this.state = cleanState(snapshot?.contextWindowOverrides);
    return this;
  }

  async ready() {
    await this.readyPromise;
    return this;
  }

  describe(input) {
    const scope = assertScope(input);
    const override = exactValue(this.state, scope);
    const inherited = resolveValue(this.state, {
      providerId: scope.providerId,
      modelId: scope.modelId,
      ...(scope.accountId ? { accountId: scope.accountId } : {}),
      ...(scope.keyRef ? { keyRef: scope.keyRef } : {}),
    });
    return {
      ...scope,
      override,
      effectiveOverride: inherited,
      source: override !== null ? "custom" : inherited !== null ? "inherited" : "auto",
    };
  }

  resolve(providerId, modelId, scope = {}) {
    const normalized = assertScope({ providerId, modelId, ...scope });
    return resolveValue(this.state, normalized);
  }

  hasAny(providerId, modelId) {
    const normalizedProvider = text(providerId);
    const normalizedModel = text(modelId);
    if (!normalizedProvider || !normalizedModel) return false;
    const provider = this.state.providers?.[normalizedProvider];
    if (!provider) return false;
    if (normalizeContextWindow(provider.models?.[normalizedModel]) !== null) return true;
    return [provider.accounts, provider.keys].some((scopes) => Object.values(scopes ?? {}).some((models) => (
      normalizeContextWindow(models?.[normalizedModel]) !== null
    )));
  }

  async get(input) {
    await this.ready();
    return this.describe(input);
  }

  async set(input, value) {
    await this.ready();
    const scope = assertScope(input);
    const contextWindow = value === null || value === undefined || value === ""
      ? null
      : normalizeContextWindow(value);
    if (value !== null && value !== undefined && value !== "" && contextWindow === null) {
      throw new Error("上下文上限必须是正整数 token 数");
    }

    const mutate = (current) => {
      const next = {
        ...current,
        contextWindowOverrides: cloneState(current?.contextWindowOverrides),
      };
      const overrides = next.contextWindowOverrides;
      const provider = overrides.providers[scope.providerId] ?? {
        models: {},
        accounts: {},
        keys: {},
      };
      overrides.providers[scope.providerId] = provider;
      const [bucket, scopeId] = bucketFor(scope);
      const models = scopeId
        ? (provider[bucket][scopeId] ??= {})
        : provider.models;
      if (contextWindow === null) delete models[scope.modelId];
      else models[scope.modelId] = contextWindow;
      removeEmptyScopes(provider, bucket, scopeId);
      removeEmptyProvider(overrides, scope.providerId);
      return { ...next, contextWindowOverrides: cleanState(overrides) };
    };
    const saved = typeof this.stateStore.update === "function"
      ? await this.stateStore.update(mutate)
      : await this.stateStore.save(mutate(await this.stateStore.load()));
    this.state = cleanState(saved?.contextWindowOverrides);
    return this.describe(scope);
  }
}
