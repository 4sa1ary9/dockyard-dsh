import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultSecretStore, UnavailableSecretStore, WindowsDpapiSecretStore } from "../packages/vault/src/index.mjs";

test("Linux defaults fail closed instead of keeping provider secrets in memory", async () => {
  const store = createDefaultSecretStore({ platform: "linux" });
  assert.equal(store instanceof UnavailableSecretStore, true);
  assert.equal(await store.read("keychain://missing"), null);
  await assert.rejects(
    () => store.write("keychain://new", { access: "secret" }),
    /Secure credential storage is unavailable/,
  );
});

test("Windows defaults use a DPAPI-backed secret store", () => {
  const store = createDefaultSecretStore({ platform: "win32" });
  assert.equal(store instanceof WindowsDpapiSecretStore, true);
});
