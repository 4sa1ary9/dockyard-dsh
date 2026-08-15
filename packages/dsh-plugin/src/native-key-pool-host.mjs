import { JsonStateStore, defaultDockyardHome } from "../../runtime/src/state-store.mjs";
import { join } from "node:path";
import { usageModuleFor } from "./native-usage.mjs";

const POLICIES = new Set(["manual", "round_robin", "failover"]);
const PATCH_MARK = Symbol("dockyard-native-key-pool");
const VISIBLE_STREAM_CHUNKS = new Set(["text-delta", "reasoning-delta", "tool-call-delta"]);

function text(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function pathValue(source, path = []) {
  let current = source;
  for (const segment of path) {
    if (!current || typeof current !== "object") return undefined;
    current = current[segment];
  }
  return current;
}

function cleanRecord(raw) {
  const keys = Array.isArray(raw?.keys) ? raw.keys.filter((entry) => text(entry?.ref)).map((entry) => ({
    ref: text(entry.ref),
    label: text(entry.label) ?? text(entry.ref),
    createdAt: text(entry.createdAt),
  })) : [];
  return {
    policy: POLICIES.has(raw?.policy) ? raw.policy : "manual",
    keys,
  };
}

function publicCredential(info) {
  if (!info || typeof info !== "object") return { configured: false };
  return {
    configured: info.configured === true,
    ...(typeof info.source === "string" ? { source: info.source } : {}),
    ...(typeof info.writable === "boolean" ? { writable: info.writable } : {}),
  };
}

function failureMessage(error) {
  return error instanceof Error ? error.message : String(error ?? "未知错误");
}

function nativeProfile(ctx, providerId) {
  const hasGetter = typeof ctx?.get === "function";
  const llm = hasGetter ? ctx.get("llm") : ctx.llm;
  const settings = hasGetter ? ctx.get("settings") : ctx.settings;
  const entry = llm?.listConfigurableProviders?.().find((candidate) => candidate.provider === providerId) ?? null;
  const profile = entry && settings?.get ? pathValue(settings.get(entry.settingsNs), entry.settingsPath) : null;
  if (!entry || !profile || typeof profile !== "object") return { entry, profile: null };
  const native = entry.settingsNs === "llm-pi-ai" || text(profile.apiKeyEnv) !== null;
  return { entry, profile: native ? profile : null };
}

export class NativeKeyPoolHost {
  ctx;
  credentials;
  settings;
  llm;
  logger;
  stateStore;
  records = new Map();
  cursors = new Map();
  patches = [];
  offAdapters = null;
  offStreams = null;
  readyPromise;

  constructor(ctx, { logger = null, stateStore = null } = {}) {
    this.ctx = ctx;
    // The plugin constructor can run while Cordis is still composing the
    // profile. Resolve services in start(), after the fiber is active; reading
    // a missing service here aborts the whole DSH boot before the web server
    // can even mount.
    this.credentials = null;
    this.settings = null;
    this.llm = null;
    // `ctx` is a Cordis proxy. Optional chaining does not make a missing
    // injected property safe, so never read ctx.logger during composition.
    this.logger = logger ?? console;
    this.stateStore = stateStore ?? new JsonStateStore({
      filePath: join(defaultDockyardHome(), "native-key-pools.json"),
    });
    this.readyPromise = this.loadState();
  }

  resolveServices() {
    const get = (name) => {
      try {
        if (typeof this.ctx?.get === "function") return this.ctx.get(name);
        return this.ctx?.[name];
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
      this.logger.warn?.(`native Key 池状态读取失败：${failureMessage(error)}`);
    }
    return this;
  }

  async saveState() {
    const nativeKeyPools = Object.fromEntries([...this.records].map(([providerId, record]) => [
      providerId,
      cleanRecord(record),
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
      // llm-pi-ai resolves `(provider, profile)`, while the optional native
      // DeepSeek adapter resolves `(connection)`. Keep both wire contracts
      // intact; the request-level pool only replaces the bearer value.
      const directConnectionResolver = typeof config.options === "function"
        && typeof config.resolveUserId === "function";
      const wrapper = directConnectionResolver
        ? async (connection) => this.resolveDirectApiKey(connection, original)
        : async (providerId, profile) => this.resolveApiKey(providerId, profile, original);
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
      record.keys.push({ ref: activeRef, label: "当前 DSH Key", createdAt: new Date().toISOString() });
      await this.saveState();
    }
    return { profile, activeRef, record };
  }

  async register(providerId, ref, label = "") {
    const keyRef = text(ref);
    if (!text(providerId) || !keyRef) throw new Error("provider 和 Key 引用不能为空");
    const { record } = await this.syncProvider(providerId);
    const current = record.keys.find((entry) => entry.ref === keyRef);
    if (current) {
      current.label = text(label) ?? current.label;
    } else {
      record.keys.push({ ref: keyRef, label: text(label) ?? `Key ${record.keys.length + 1}`, createdAt: new Date().toISOString() });
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
    if (!POLICIES.has(policy)) throw new Error(`不支持的 Key 策略：${policy}`);
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
      usage: null,
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
        usage = { status: "unconfigured", message: "该 Key 尚未配置" };
      } else {
        try {
          const resolved = await this.credentials.resolve(row.ref);
          const apiKey = text(resolved?.value);
          usage = apiKey
            ? await module.fetch({ providerId, profile: synced.profile, apiKey, signal })
            : { status: "unconfigured", message: "该 Key 尚未配置" };
        } catch (error) {
          usage = { status: "error", message: failureMessage(error), updatedAt: new Date().toISOString() };
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
      usage: active?.usage ?? { status: "unsupported", message: "provider 尚未返回额度数据" },
      quota: active?.quota ?? null,
      updatedAt: new Date().toISOString(),
    };
  }
}
