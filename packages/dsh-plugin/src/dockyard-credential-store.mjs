import { createHash } from "node:crypto";

function dshCredentialRef(ref) {
  const digest = createHash("sha256").update(String(ref)).digest("hex");
  // DSH's credential seam accepts POSIX-style names, while Dockyard keeps an
  // opaque keychain:// reference in the provider-neutral account snapshot.
  return `DOCKYARD_DSH_${digest}`;
}
function parseCredential(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("DSH Credentials 中的 Dockyard 凭证格式无效");
  }
}

/**
 * Store Dockyard's provider OAuth payloads through the host DSH Credentials
 * service. The provider-facing reference remains opaque and never crosses
 * the DSH credential API, which only accepts POSIX-style reference names.
 *
 * A fallback is retained for accounts imported by an older standalone runtime;
 * new writes always use the host credential service when it is available.
 */
export function createDockyardCredentialStore(credentials, fallback = null) {
  const usable = credentials
    && typeof credentials.resolve === "function"
    && typeof credentials.set === "function"
    && typeof credentials.unset === "function";

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
      if (typeof fallback?.write !== "function") throw new Error("DSH Credentials 尚未就绪");
      return fallback.write(ref, value);
    },

    async delete(ref) {
      if (usable) await credentials.unset(dshCredentialRef(ref));
      if (typeof fallback?.delete === "function") await fallback.delete(ref);
    },
  };
}
