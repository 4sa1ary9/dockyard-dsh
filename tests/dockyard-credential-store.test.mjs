import test from "node:test";
import assert from "node:assert/strict";

import { createDockyardCredentialStore } from "../packages/dsh-plugin/src/dockyard-credential-store.mjs";

test("Dockyard credential store maps opaque refs into host DSH Credentials", async () => {
  const values = new Map();
  const calls = [];
  const credentials = {
    async resolve(ref) {
      calls.push(["resolve", ref]);
      return values.has(ref) ? { value: values.get(ref) } : undefined;
    },
    async set(ref, value) {
      calls.push(["set", ref]);
      values.set(ref, value);
    },
    async unset(ref) {
      calls.push(["unset", ref]);
      values.delete(ref);
    },
  };
  const fallback = {
    async read() { return null; },
    async write() { throw new Error("fallback should not be used"); },
    async delete() {},
  };
  const store = createDockyardCredentialStore(credentials, fallback);
  const opaqueRef = "keychain://dockyard-dsh/opaque-ref";
  await store.write(opaqueRef, { access: "secret" });
  assert.deepEqual(await store.read(opaqueRef), { access: "secret" });
  await store.delete(opaqueRef);
  assert.equal(await store.read(opaqueRef), null);
  assert.equal(calls[0][0], "set");
  assert.match(calls[0][1], /^DOCKYARD_DSH_[a-f0-9]{64}$/);
  assert.equal(calls[1][1], calls[0][1]);
});
