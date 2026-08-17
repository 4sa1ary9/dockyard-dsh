import { createSnapshotStore } from "@deepseek-ai/dsh-client-runtime/client";

const STORAGE_PREFIX = "dockyard-dsh.native-key-pool";

export const NATIVE_KEY_POLICY_LABELS = Object.freeze({
  manual: "手动选择 Key",
  round_robin: "多 Key 轮询",
  failover: "失败转移",
});

function resultValue(response, operation) {
  const result = response?.result;
  if (result?.ok === false) {
    throw new Error(result.error?.message ?? result.error?.code ?? `${operation} failed`);
  }
  if (result?.ok === true) return result.value;
  if (response?.ok === false) {
    throw new Error(response.error?.message ?? response.error?.code ?? `${operation} failed`);
  }
  return response?.value ?? response;
}

function getPath(source, path = []) {
  let current = source;
  for (const segment of path) {
    if (!current || typeof current !== "object") return undefined;
    current = current[segment];
  }
  return current;
}

function stringAt(source, key) {
  const value = source?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function providerRef(providerId) {
  return `${String(providerId ?? "provider").toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}

function storageKey(providerId) {
  return `${STORAGE_PREFIX}:${providerId}`;
}

function storageOf() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function readMetadata(providerId) {
  const storage = storageOf();
  if (!storage) return { policy: "manual", keys: [] };
  try {
    const parsed = JSON.parse(storage.getItem(storageKey(providerId)) ?? "null");
    if (!parsed || typeof parsed !== "object") return { policy: "manual", keys: [] };
    const keys = Array.isArray(parsed.keys) ? parsed.keys.filter((entry) => (
      entry && typeof entry === "object" && typeof entry.ref === "string" && entry.ref.length > 0
    )).map((entry) => ({
      ref: entry.ref,
      label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : entry.ref,
      createdAt: entry.createdAt ?? null,
    })) : [];
    const policy = Object.hasOwn(NATIVE_KEY_POLICY_LABELS, parsed.policy) ? parsed.policy : "manual";
    return { policy, keys };
  } catch {
    return { policy: "manual", keys: [] };
  }
}

function writeMetadata(providerId, metadata) {
  const storage = storageOf();
  if (!storage) return;
  try {
    storage.setItem(storageKey(providerId), JSON.stringify({
      policy: Object.hasOwn(NATIVE_KEY_POLICY_LABELS, metadata.policy) ? metadata.policy : "manual",
      keys: metadata.keys.map(({ ref, label, createdAt }) => ({ ref, label, createdAt })),
    }));
  } catch {
    // Key metadata is only a convenience index. The credential itself remains
    // in DSH's credential store and is never written to browser storage.
  }
}

function makeKeyRef(providerId) {
  const base = providerRef(providerId).replace(/_API_KEY$/, "");
  const random = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()
    : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${base}_DOCKYARD_${Date.now().toString(36).toUpperCase()}_${random}`;
}

function errorMessage(error, t) {
  return error instanceof Error ? error.message : String(error ?? t?.("error.unknown") ?? "Unknown error");
}

function nativeEntry(providerRows, providerId) {
  return providerRows.find((entry) => entry?.provider === providerId) ?? null;
}

function isApiKeyEntry(entry, profile) {
  return Boolean(entry && (
    entry.settingsNs === "llm-pi-ai"
    || typeof profile?.apiKeyEnv === "string"
  ));
}

function keyRows(metadata, credentials, activeRef, t) {
  const rows = metadata.keys.map((entry) => ({
    ...entry,
    active: entry.ref === activeRef,
    configured: credentials[entry.ref]?.configured === true,
    credential: credentials[entry.ref] ?? null,
  }));
  if (activeRef && !rows.some((entry) => entry.ref === activeRef)) {
    rows.unshift({
      ref: activeRef,
      label: t?.("native.currentDshKey") ?? "Current DSH Key",
      createdAt: null,
      active: true,
      configured: credentials[activeRef]?.configured === true,
      credential: credentials[activeRef] ?? null,
      implicit: true,
    });
  }
  return rows;
}

/**
 * Client-side controller for DSH's native API-key providers.
 *
 * Secret values only travel through `credentials.set`/`unset`. The optional
 * browser metadata index contains refs and labels, never key material. The
 * native DSH route still owns the actual request; this controller only changes
 * the profile's active `apiKeyEnv` reference.
 */
export class NativeKeyPoolController {
  api;
  store = createSnapshotStore({
    status: "idle",
    action: null,
    providerId: null,
    entry: null,
    namespace: null,
    profile: null,
    settingsPath: [],
    apiKeyRef: null,
    keys: [],
    policy: "manual",
    error: null,
    message: null,
    native: false,
    runtimeMode: "request-key-pool",
    quota: null,
    usage: null,
  });
  generation = 0;

  constructor(api, remote = null, t = null) {
    this.api = api;
    this.remote = remote;
    this.t = t;
  }

  operation(key, fallback) {
    return typeof this.t === "function" ? this.t(key) : fallback;
  }

  setState(next) {
    this.store.update((state) => Object.assign(state, next));
  }

  async remoteCall(method, request, operation = method) {
    const fn = this.remote?.[method];
    if (typeof fn !== "function") return null;
    return resultValue(await fn(request), operation);
  }

  applyHostStatus(host) {
    if (!host || typeof host !== "object") return;
    this.setState({
      ...(Array.isArray(host.keys) ? { keys: host.keys } : {}),
      ...(typeof host.policy === "string" ? { policy: host.policy } : {}),
      ...(typeof host.runtimeMode === "string" ? { runtimeMode: host.runtimeMode } : {}),
      ...(Object.hasOwn(host, "quota") ? { quota: host.quota } : {}),
      ...(Object.hasOwn(host, "usage") ? { usage: host.usage } : {}),
    });
  }

  async load(providerId) {
    if (!providerId || !this.api?.llm?.providers || !this.api?.settings?.describe) return null;
    const generation = ++this.generation;
    // A provider switch must not paint the previous provider's credential,
    // quota, or usage while the new DSH settings are being read. Keep only a
    // neutral loading state until this provider has returned its own data.
    this.setState({
      status: "loading",
      action: "refresh",
      providerId,
      entry: null,
      namespace: null,
      profile: null,
      settingsPath: [],
      apiKeyRef: null,
      keys: [],
      policy: "manual",
      native: false,
      runtimeMode: "request-key-pool",
      quota: null,
      usage: null,
      error: null,
      message: null,
    });
    try {
      const [providersResponse, settingsResponse] = await Promise.all([
        this.api.llm.providers({}),
        this.api.settings.describe({}),
      ]);
      const providers = resultValue(providersResponse, this.operation("native.operation.readProviderCatalog", "Read provider catalog")).providers ?? [];
      const settings = resultValue(settingsResponse, this.operation("native.operation.readProviderConfig", "Read provider configuration"));
      const entry = nativeEntry(providers, providerId);
      const namespace = settings.namespaces?.find((view) => view.ns === entry?.settingsNs) ?? null;
      const settingsPath = Array.isArray(entry?.settingsPath) ? entry.settingsPath : [];
      const profile = namespace ? getPath(namespace.value, settingsPath) : null;
      const native = isApiKeyEntry(entry, profile);
      if (!entry || !native) {
        if (generation === this.generation) this.setState({
          status: entry ? "unsupported" : "missing",
          action: null,
          providerId,
          entry: entry ?? null,
          namespace,
          profile,
          settingsPath,
          apiKeyRef: null,
          keys: [],
          policy: "manual",
          native: false,
          error: null,
          message: null,
        });
        return null;
      }
      const activeRef = stringAt(profile, "apiKeyEnv");
      const metadata = readMetadata(providerId);
      const refs = [...new Set([
        ...(activeRef ? [activeRef] : []),
        ...metadata.keys.map((key) => key.ref),
      ])];
      let credentials = {};
      if (refs.length > 0 && this.api.credentials?.describe) {
        credentials = resultValue(await this.api.credentials.describe({ refs }), this.operation("native.operation.readKeyStatus", "Read Key status")).credentials ?? {};
      }
      const keys = keyRows(metadata, credentials, activeRef, this.t);
      let hostStatus = null;
      try {
        hostStatus = await this.remoteCall("nativeKeyStatus", { providerId }, this.operation("native.operation.readKeyPool", "Read Dockyard Key pool"));
      } catch {
        // A local debug page may be running without the host remote. The DSH
        // credentials/settings view above remains a useful read-only fallback.
      }
      if (generation !== this.generation) return null;
      this.setState({
        status: "ready",
        action: null,
        providerId,
        entry,
        namespace,
        profile,
        settingsPath,
        apiKeyRef: activeRef,
        keys: hostStatus?.keys?.length ? hostStatus.keys : keys,
        policy: hostStatus?.policy ?? metadata.policy,
        native: true,
        runtimeMode: hostStatus?.runtimeMode ?? "request-key-pool",
        quota: hostStatus?.quota ?? null,
        usage: hostStatus?.usage ?? null,
        error: null,
        message: null,
      });
      return this.store.getSnapshot();
    } catch (error) {
      if (generation === this.generation) this.setState({
        status: "error",
        action: null,
        providerId,
        error: errorMessage(error, this.t),
      });
      return null;
    }
  }

  async ensure(providerId) {
    const state = this.store.getSnapshot();
    if (state.providerId === providerId && (state.native || ["missing", "unsupported"].includes(state.status))) return state;
    return this.load(providerId);
  }

  async refresh(providerId) {
    const state = await this.load(providerId);
    if (!state) return null;
    try {
      const refreshed = await this.remoteCall("nativeKeyRefresh", { providerId }, this.operation("native.operation.refreshQuota", "Refresh live provider quota"));
      if (refreshed) {
        this.applyHostStatus(refreshed);
        this.setState({ action: null, status: "ready", error: null });
      }
    } catch (error) {
      this.setState({ action: null, status: "ready", error: errorMessage(error, this.t) });
    }
    return this.store.getSnapshot();
  }

  async mutateProfile(providerId, ref, { clear = false } = {}) {
    const state = this.store.getSnapshot();
    if (state.providerId !== providerId || !state.namespace) await this.load(providerId);
    const current = this.store.getSnapshot();
    if (!current.namespace) throw new Error(this.t?.("native.error.noWritableConfig") ?? "DSH did not return writable configuration for this provider");
    const profile = getPath(current.namespace.value, current.settingsPath);
    const path = [...current.settingsPath, "apiKeyEnv"];
    const ops = clear
      ? [{ op: "unset", path }]
      : profile === undefined && current.settingsPath.length > 0
        ? [{ op: "set", path: current.settingsPath, value: { apiKeyEnv: ref } }]
        : [{ op: "set", path, value: ref }];
    const response = await this.api.settings.mutate({
      ns: current.namespace.ns,
      ops,
      expectedRevision: current.namespace.revision,
    });
    resultValue(response, this.operation("native.operation.updateProviderKey", "Update provider Key configuration"));
  }

  async addKey(providerId, value, label = "") {
    const key = String(value ?? "").trim();
    if (!key) throw new Error(this.t?.("native.error.enterApiKey") ?? "Enter an API Key");
    this.setState({ action: "add", status: "loading", providerId, error: null, message: null });
    try {
      await this.ensure(providerId);
      const current = this.store.getSnapshot();
      if (!current.native) throw new Error(this.t?.("native.error.notNativeProvider") ?? "The current model is not a native DSH API Key provider");
      const ref = makeKeyRef(providerId);
      resultValue(await this.api.credentials.set({ ref, value: key }), this.operation("native.operation.saveApiKey", "Save API Key"));
      await this.mutateProfile(providerId, ref);
      const metadata = readMetadata(providerId);
      metadata.keys = [...metadata.keys.filter((entry) => entry.ref !== ref), {
        ref,
        label: String(label ?? "").trim() || `Key ${metadata.keys.length + 1}`,
        createdAt: new Date().toISOString(),
      }];
      writeMetadata(providerId, metadata);
      await this.remoteCall("nativeKeyRegister", { providerId, ref, label: metadata.keys.at(-1).label }, this.operation("native.operation.registerKey", "Register Dockyard Key"));
      await this.load(providerId);
      this.setState({ message: this.t?.("native.message.keySaved") ?? "The Key was written to DSH Credentials and set as the current Key.", action: null, status: "ready" });
      return this.store.getSnapshot();
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorMessage(error, this.t) });
      return null;
    }
  }

  async selectKey(providerId, ref) {
    if (!ref) return null;
    this.setState({ action: "select", status: "loading", providerId, error: null, message: null });
    try {
      await this.ensure(providerId);
      const current = this.store.getSnapshot();
      const key = current.keys.find((entry) => entry.ref === ref);
      if (!key) throw new Error(this.t?.("native.error.keyNotIndexed") ?? "This Key is missing from the local index");
      if (!key.configured) throw new Error(this.t?.("native.error.keyNotConfigured") ?? "This Key is not configured in DSH Credentials");
      await this.mutateProfile(providerId, ref);
      await this.remoteCall("nativeKeyRegister", { providerId, ref, label: key.label }, this.operation("native.operation.registerKey", "Register Dockyard Key"));
      await this.remoteCall("nativeKeySetPolicy", { providerId, policy: "manual" }, this.operation("native.operation.setManualKey", "Switch to manual Key"));
      const metadata = readMetadata(providerId);
      metadata.policy = "manual";
      writeMetadata(providerId, metadata);
      await this.load(providerId);
      this.setState({ message: this.t?.("native.message.keySelected", { label: key.label }) ?? `Switched to ${key.label}.`, action: null, status: "ready" });
      return this.store.getSnapshot();
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorMessage(error, this.t) });
      return null;
    }
  }

  async removeKey(providerId, ref) {
    if (!ref) return null;
    this.setState({ action: "remove", status: "loading", providerId, error: null, message: null });
    try {
      await this.ensure(providerId);
      const current = this.store.getSnapshot();
      const key = current.keys.find((entry) => entry.ref === ref);
      if (!key) throw new Error(this.t?.("native.error.keyNotIndexed") ?? "This Key is missing from the local index");
      const remaining = current.keys.filter((entry) => entry.ref !== ref && entry.configured);
      if (current.apiKeyRef === ref) {
        if (remaining[0]) await this.mutateProfile(providerId, remaining[0].ref);
        else await this.mutateProfile(providerId, null, { clear: true });
      }
      const writable = key.credential?.writable !== false;
      if (writable) resultValue(await this.api.credentials.unset({ ref }), this.operation("native.operation.removeApiKey", "Remove API Key"));
      const metadata = readMetadata(providerId);
      metadata.keys = metadata.keys.filter((entry) => entry.ref !== ref);
      writeMetadata(providerId, metadata);
      try {
        await this.remoteCall("nativeKeyUnregister", { providerId, ref }, this.operation("native.operation.removeDockyardKey", "Remove Dockyard Key"));
      } catch {
        // The credential/config removal already succeeded. The host resolver
        // also ignores an unconfigured stale ref, so this is safe to retry.
      }
      await this.load(providerId);
      this.setState({
         message: writable
           ? this.t?.("native.message.keyRemoved", { label: key.label }) ?? `Removed ${key.label}.`
           : this.t?.("native.message.referenceRemoved", { label: key.label }) ?? `Unlinked ${key.label} from the provider; the original file credential was kept.`,
         action: null,
         status: "ready",
       });
      return this.store.getSnapshot();
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorMessage(error, this.t) });
      return null;
    }
  }

  async setPolicy(providerId, policy) {
    if (!Object.hasOwn(NATIVE_KEY_POLICY_LABELS, policy)) return;
    try {
      await this.remoteCall("nativeKeySetPolicy", { providerId, policy }, this.operation("native.operation.updatePolicy", "Update Key policy"));
    } catch (error) {
      this.setState({ error: errorMessage(error, this.t) });
      return null;
    }
    const metadata = readMetadata(providerId);
    metadata.policy = policy;
    writeMetadata(providerId, metadata);
    this.setState({ policy, runtimeMode: "request-key-pool", message: policy === "manual"
      ? this.t?.("native.message.policyManual") ?? "Manual Key selection enabled."
      : policy === "round_robin"
        ? this.t?.("native.message.policyRoundRobin") ?? "Request-level Key round robin enabled."
        : this.t?.("native.message.policyFailover") ?? "Failover enabled: the next Key is tried automatically when the current Key fails." });
    return this.store.getSnapshot();
  }
}
