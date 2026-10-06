import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { redactError } from "../../providers/src/provider-utils.mjs";

export function publicAuthResult(result) {
  if (!result || typeof result !== "object") return result;
  return {
    status: result.status,
    ...(result.providerId ? { providerId: result.providerId } : {}),
    ...(result.sessionId ? { sessionId: result.sessionId } : {}),
    ...(result.authorizationUrl ? { authorizationUrl: result.authorizationUrl } : {}),
    ...(result.instructions ? { instructions: result.instructions } : {}),
    ...(result.browserOpened ? { browserOpened: true } : {}),
    ...(result.terminalOpened ? { terminalOpened: true } : {}),
    ...(result.inputRequired ? { inputRequired: true } : {}),
    ...(result.authorizationCodeRequired ? { authorizationCodeRequired: true } : {}),
    ...(result.diagnostic ? { diagnostic: result.diagnostic } : {}),
    ...(Array.isArray(result.accounts) ? { accounts: result.accounts } : {}),
  };
}

function envelope(result, snapshot) {
  return { result, snapshot };
}

/**
 * Host-side RPC surface for the native Dockyard composer control.
 *
 * The service intentionally returns the existing provider-neutral snapshot and
 * never exposes the credential store. OAuth login is started by the provider
 * module itself; this layer only forwards its public status to the browser.
 */
export class DockyardRemoteService extends TypertRemoteService {
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

  async catalog(request = {}) {
    try {
      const result = await this.dockyard.catalog(request?.providerId ?? null, { force: request?.force ?? false });
      const providers = (Array.isArray(result) ? result : [result]).map(({ providerId, catalog }) => ({
        providerId,
        count: Array.isArray(catalog?.models) ? catalog.models.length : 0,
        source: typeof catalog?.source === "string" ? redactError(catalog.source) : null,
        diagnostic: redactError(catalog?.diagnostic ?? (Array.isArray(catalog?.diagnostics) ? catalog.diagnostics.join("；") : null)),
      }));
      return { providers, count: providers.reduce((sum, provider) => sum + provider.count, 0) };
    } finally {
      this.ctx.emit("llm/adapters-updated");
    }
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
    // A Web client normally owns its reserved popup. Desktop Electron denies
    // about:blank, so local clients explicitly request the Host browser fallback.
    // The Host opens only the provider-generated URL, never an arbitrary RPC URL.
    const result = publicAuthResult(await this.dockyard.startAuthorization(request.providerId, {
      openBrowser: request.openBrowser === true,
    }));
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
      request.code,
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
    if (!this.nativeKeyPool) throw new Error("Dockyard Native Key Pool 尚未挂载");
    return this.nativeKeyPool.register(request.providerId, request.ref, request.label);
  }

  async nativeKeyUnregister(request = {}) {
    if (!this.nativeKeyPool) throw new Error("Dockyard Native Key Pool 尚未挂载");
    return this.nativeKeyPool.unregister(request.providerId, request.ref);
  }

  async nativeKeySetPolicy(request = {}) {
    if (!this.nativeKeyPool) throw new Error("Dockyard Native Key Pool 尚未挂载");
    return this.nativeKeyPool.setPolicy(request.providerId, request.policy);
  }

  async getContextWindowOverride(request = {}) {
    return this.dockyard.getContextWindowOverride(request);
  }

  async setContextWindowOverride(request = {}) {
    return this.dockyard.setContextWindowOverride(request, request.value);
  }
}

function markRemoteMethods() {
  const target = Object.create(DockyardRemoteService.prototype);
  for (const name of [
    "snapshot", "refresh", "catalog", "scan", "add", "login", "poll", "submitAuthorizationCode", "cancel", "setPolicy", "use", "removeAccount",
    "nativeKeyStatus", "nativeKeyRefresh", "nativeKeyRegister", "nativeKeyUnregister", "nativeKeySetPolicy",
    "getContextWindowOverride", "setContextWindowOverride",
  ]) {
    let initializer;
    Remote(name)(undefined, {
      kind: "method",
      name,
      static: false,
      private: false,
      addInitializer(callback) {
        initializer = callback;
      },
    });
    initializer?.call(target);
  }
}

markRemoteMethods();
