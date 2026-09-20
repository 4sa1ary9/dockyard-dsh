import assert from "node:assert/strict";
import test from "node:test";

import { AccountPool } from "../packages/account-pool/src/index.mjs";
import { createProviderRoute } from "../packages/core/src/dsh-route.mjs";
import { ContextWindowOverrideStore } from "../packages/runtime/src/context-window-overrides.mjs";

function memoryStateStore(initial = {}) {
  let state = structuredClone(initial);
  return {
    async load() {
      return structuredClone(state);
    },
    async update(mutator) {
      state = await mutator(structuredClone(state));
      return structuredClone(state);
    },
    snapshot() {
      return structuredClone(state);
    },
  };
}

function addAccount(pool, accountId) {
  pool.upsert({
    accountId,
    credentialRef: `${accountId}-credential`,
    authKind: "test",
    scopes: [],
  });
}

test("context window overrides are arbitrary, persistent, and scoped by account or Key", async () => {
  const stateStore = memoryStateStore({ pools: { untouched: { policy: "manual" } } });
  const overrides = new ContextWindowOverrideStore({ stateStore });
  await overrides.ready();

  await overrides.set({ providerId: "provider", modelId: "model" }, 500000);
  await overrides.set({ providerId: "provider", modelId: "model", accountId: "account-a" }, 180000);
  await overrides.set({ providerId: "provider", modelId: "model", keyRef: "KEY_A" }, 750000);

  assert.equal(overrides.resolve("provider", "model"), 500000);
  assert.equal(overrides.resolve("provider", "model", { accountId: "account-a" }), 180000);
  assert.equal(overrides.resolve("provider", "model", { accountId: "account-b" }), 500000);
  assert.equal(overrides.resolve("provider", "model", { keyRef: "KEY_A" }), 750000);
  assert.equal(overrides.resolve("provider", "model", { keyRef: "KEY_B" }), 500000);
  assert.equal((await overrides.get({ providerId: "provider", modelId: "model", keyRef: "KEY_A" })).source, "custom");

  await overrides.set({ providerId: "provider", modelId: "model", keyRef: "KEY_A" }, null);
  assert.equal(overrides.resolve("provider", "model", { keyRef: "KEY_A" }), 500000);
  assert.equal(stateStore.snapshot().pools.untouched.policy, "manual");
});

test("provider route applies the selected account's context override at request time", async () => {
  const pool = new AccountPool({ providerId: "provider", policy: "manual" });
  addAccount(pool, "account-a");
  pool.setDefaultAccount("account-a");
  const received = [];
  const providerModule = {
    manifest: { id: "provider" },
    async *stream(request) {
      received.push(request);
      yield { type: "text-delta", index: 0, text: "ok" };
      yield { type: "finish", reason: { kind: "stop" } };
    },
  };
  const route = createProviderRoute({
    providerModule,
    accountPool: pool,
    contextWindowOverrides: {
      resolve(providerId, modelId, scope) {
        assert.equal(providerId, "provider");
        assert.equal(modelId, "model");
        assert.equal(scope.accountId, "account-a");
        return 500000;
      },
    },
  });

  for await (const _chunk of route.stream({ model: "model", modelContext: { maxTokens: 4096 } })) {}
  assert.deepEqual(received, [{
    model: "model",
    modelContext: { maxTokens: 4096, contextWindow: 500000 },
  }]);
});
