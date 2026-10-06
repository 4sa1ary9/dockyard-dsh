import test from "node:test";
import assert from "node:assert/strict";
import fs, { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { WindowsDpapiSecretStore } from "../packages/vault/src/index.mjs";

const isWindows = process.platform === "win32";

test("Windows DPAPI store round-trips a credential", { skip: !isWindows }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "dockyard-dpapi-"));
  const store = new WindowsDpapiSecretStore({ directory });
  const ref = `keychain://dockyard-dsh/test/${Date.now()}`;
  const secret = { access: "test-access", refresh: "test-refresh", name: "中文 🔐" };
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

test("Windows DPAPI failed replacement preserves the previous credential", { skip: !isWindows }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "dockyard-dpapi-"));
  const store = new WindowsDpapiSecretStore({ directory });
  const ref = "atomic-write-test";
  try {
    await store.write(ref, { access: "original" });
    t.mock.method(fs, "rename", async (temporary) => {
      assert.equal((await readFile(temporary)).includes(Buffer.from("replacement")), false);
      throw Object.assign(new Error("replacement denied"), { code: "EACCES" });
    });
    syncBuiltinESMExports();
    await assert.rejects(store.write(ref, { access: "replacement" }), { code: "EACCES" });
    assert.deepEqual(await store.read(ref), { access: "original" });
    assert.equal((await readdir(directory)).length, 1, "failed writes leave no temporary blobs");
    t.mock.method(childProcess, "spawn", () => { throw Object.assign(new Error("helper missing"), { code: "ENOENT" }); });
    syncBuiltinESMExports();
    await assert.rejects(store.read(ref), { code: "ENOENT" });
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    await rm(directory, { recursive: true, force: true });
  }
});
