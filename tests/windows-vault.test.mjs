import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { WindowsDpapiSecretStore } from "../packages/vault/src/index.mjs";

const isWindows = process.platform === "win32";

test("Windows DPAPI store round-trips a credential", { skip: !isWindows }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "dockyard-dpapi-"));
  const store = new WindowsDpapiSecretStore({ directory });
  const ref = `keychain://dockyard-dsh/test/${Date.now()}`;
  const secret = { access: "test-access", refresh: "test-refresh" };
  try {
    assert.equal(await store.read(ref), null);
    await store.write(ref, secret);
    assert.deepEqual(await store.read(ref), secret);
    await store.write(ref, { ...secret, access: "rotated" });
    assert.deepEqual(await store.read(ref), { ...secret, access: "rotated" });
    await store.delete(ref);
    assert.equal(await store.read(ref), null);
  } finally {
    await store.delete(ref).catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
});
