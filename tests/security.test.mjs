import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultSecretStore, UnavailableSecretStore } from "../packages/vault/src/index.mjs";

test("non-macOS defaults fail closed instead of keeping provider secrets in memory", async () => {
  const store = createDefaultSecretStore({ platform: "linux" });
  assert.equal(store instanceof UnavailableSecretStore, true);
  assert.equal(await store.read("keychain://missing"), null);
  await assert.rejects(
    () => store.write("keychain://new", { access: "secret" }),
    /Secure credential storage is unavailable/,
  );
});
