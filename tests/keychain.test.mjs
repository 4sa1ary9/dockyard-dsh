import test from "node:test";
import assert from "node:assert/strict";

import { MacOSKeychainStore } from "../packages/vault/src/index.mjs";

const isMacOS = process.platform === "darwin";

/**
 * Real macOS Keychain integration test. The Swift helper is part of the
 * shipped plugin, so the credential round-trip must be exercised against the
 * actual helper at least once per release. Uses a dedicated test service name
 * and removes every written item afterwards. Skipped when the host session
 * cannot access the keychain at all (headless CI, locked keychain), which is
 * reported by macOS as errSecNotAvailable/Operation not permitted.
 */
async function probeKeychain(store) {
  const probe = `keychain://dockyard-dsh/probe/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await store.write(probe, { probe: true });
    await store.delete(probe);
    return null;
  } catch (error) {
    await store.delete(probe).catch(() => {});
    return error.detail ?? error.message;
  }
}

test("macOS Keychain store round-trips and isolates credentials", { skip: !isMacOS }, async (t) => {
  const store = new MacOSKeychainStore({ service: "com.dockyard-dsh.test-credentials" });
  const unavailable = await probeKeychain(store);
  if (unavailable) {
    t.skip(`macOS Keychain unavailable in this session: ${unavailable}`);
    return;
  }
  const ref = `keychain://dockyard-dsh/test/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const secret = { access: "test-access-token", refresh: "test-refresh-token" };
  try {
    assert.equal(await store.read(ref), null, "a fresh reference must not resolve");
    await store.write(ref, secret);
    assert.deepEqual(await store.read(ref), secret, "written credential must round-trip");
    // A second write must update in place instead of duplicating the item.
    await store.write(ref, { ...secret, access: "rotated-access-token" });
    assert.deepEqual(await store.read(ref), { ...secret, access: "rotated-access-token" });
    await store.delete(ref);
    assert.equal(await store.read(ref), null, "deleted credential must be gone");
  } finally {
    await store.delete(ref).catch(() => {});
  }
});

test("macOS Keychain store keeps services isolated", { skip: !isMacOS }, async (t) => {
  const storeA = new MacOSKeychainStore({ service: "com.dockyard-dsh.test-credentials-a" });
  const storeB = new MacOSKeychainStore({ service: "com.dockyard-dsh.test-credentials-b" });
  const unavailable = await probeKeychain(storeA);
  if (unavailable) {
    t.skip(`macOS Keychain unavailable in this session: ${unavailable}`);
    return;
  }
  const ref = `keychain://dockyard-dsh/test-isolation/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await storeA.write(ref, { value: "only-in-a" });
    assert.equal(await storeB.read(ref), null, "a different service must not see the item");
  } finally {
    await storeA.delete(ref).catch(() => {});
    await storeB.delete(ref).catch(() => {});
  }
});
