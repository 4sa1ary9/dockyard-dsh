import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { Context } from "@deepseek-ai/cordis";

import { DockyardDshService } from "../packages/dsh-plugin/src/dockyard-service.mjs";
import { DockyardRemoteService } from "../packages/dsh-plugin/src/dockyard-remote-host.mjs";
import { TYPERT_DESCRIPTORS } from "../packages/dsh-plugin/src/dockyard-typert-shared.mjs";
import { createDockyardLlmAdapter } from "../packages/dsh-bridge/src/llm-adapter.mjs";

test("catalog RPC refreshes connected providers concurrently and publishes a credential-free summary", async () => {
  const pending = Promise.withResolvers();
  const requests = [];
  const runtime = {
    init() {},
    listProviderManifests: () => ["alpha", "beta", "empty"].map((id) => ({ id })),
    snapshot: () => ({ providers: [
      { providerId: "alpha", accounts: [{}] },
      { providerId: "beta", accounts: [{}] },
      { providerId: "empty", accounts: [] },
    ] }),
    async getCatalog(providerId, options) {
      requests.push({ providerId, options });
      if (providerId === "beta") throw new Error("Bearer fake-secret failed");
      await pending.promise;
      return { models: [{ id: "model" }], source: "official", access_token: "must-not-cross-RPC" };
    },
  };
  const service = new DockyardDshService({ runtime, autoRefresh: false });
  const ctx = new Context();
  let events = 0;
  ctx.on("llm/adapters-updated", () => { events++; });
  const refreshing = DockyardRemoteService.prototype.catalog.call({ dockyard: service, ctx }, { force: true });
  await setImmediate();
  assert.deepEqual(requests, [
    { providerId: "alpha", options: { force: true } },
    { providerId: "beta", options: { force: true } },
  ]);
  assert.equal(events, 0);
  pending.resolve();
  const result = await refreshing;
  assert.deepEqual(result, {
    providers: [
      { providerId: "alpha", count: 1, source: "official", diagnostic: null },
      { providerId: "beta", count: 0, source: null, diagnostic: "Bearer [redacted] failed" },
    ],
    count: 1,
  });
  assert.equal(events, 1);
  assert.equal(JSON.stringify(result).includes("must-not-cross-RPC"), false);
});

test("empty and failed catalog refreshes still notify the host model directory", async () => {
  const runtime = {
    init() {},
    listProviderManifests: () => [{ id: "empty" }],
    snapshot: () => ({ providers: [{ providerId: "empty", accounts: [] }] }),
    getCatalog() { assert.fail("Unconnected providers must not run their catalog loader"); },
  };
  const service = new DockyardDshService({ runtime, autoRefresh: false });
  const events = [];
  const receiver = { dockyard: service, ctx: { emit: (...args) => events.push(args) } };
  const single = await DockyardRemoteService.prototype.catalog.call(receiver, { providerId: "empty", force: true });
  assert.deepEqual(single, { providers: [{ providerId: "empty", count: 0, source: "no_connected_accounts", diagnostic: null }], count: 0 });
  assert.deepEqual(await DockyardRemoteService.prototype.catalog.call(receiver), { providers: [], count: 0 });
  receiver.dockyard = { catalog: async () => { throw new Error("catalog unavailable"); } };
  await assert.rejects(DockyardRemoteService.prototype.catalog.call(receiver), /catalog unavailable/);
  assert.deepEqual(events, Array.from({ length: 3 }, () => ["llm/adapters-updated"]));
});

test("catalog preserves the command result shape and validates optional RPC inputs", async () => {
  const catalog = { models: [{ id: "live" }], source: "official" };
  const manifest = { id: "alpha", displayName: "Alpha" };
  const service = new DockyardDshService({ autoRefresh: false, runtime: {
    init() {},
    listProviderManifests: () => [manifest],
    snapshot: () => ({ providers: [{ providerId: "alpha", accounts: [{}] }] }),
    async getCatalog(providerId, options) {
      assert.equal(providerId, "alpha");
      assert.deepEqual(options, { force: false });
      return catalog;
    },
  } });
  assert.deepEqual(await service.catalog("Alpha"), { providerId: "alpha", manifest, catalog });
  const descriptor = TYPERT_DESCRIPTORS.find((entry) => entry.method === "catalog");
  const schema = descriptor.parameters[0].codec.schema;
  assert.equal(schema.safeParse({}).success, true);
  assert.equal(schema.safeParse({ providerId: "alpha", force: true }).success, true);
  assert.equal(schema.safeParse({ providerId: "" }).success, false);
  assert.equal(schema.safeParse({ force: "true" }).success, false);
});

test("switching accounts starts an independent catalog and late results cannot replace stream metadata", async (t) => {
  const catalogA = { models: [{ id: "shared-model", name: "Account A", contextWindow: 10000, maxTokens: 1000 }] };
  const catalogB = { models: [{ id: "shared-model", name: "Account B", contextWindow: 20000, maxTokens: 2000 }] };
  const pendingA = Promise.withResolvers();
  t.after(() => pendingA.resolve(catalogA));
  let selected = "a";
  const catalogRequests = [];
  const streamRequests = [];
  const runtime = {
    listProviderIds: () => ["test"],
    snapshot: () => ({ providers: [{
      providerId: "test", policy: "manual", defaultAccountId: selected,
      accounts: [{ accountId: "a" }, { accountId: "b" }],
    }] }),
    getCatalog() {
      catalogRequests.push(selected);
      return selected === "a" ? pendingA.promise : Promise.resolve(catalogB);
    },
    async *stream(provider, request) {
      streamRequests.push({ provider, request });
      yield { type: "finish", reason: { kind: "stop" } };
    },
  };
  const adapter = createDockyardLlmAdapter({ runtime });
  const first = adapter.listModels("test");
  await setImmediate();
  assert.deepEqual(catalogRequests, ["a"]);
  selected = "b";
  let secondFinished = false;
  const second = adapter.listModels("test").then((models) => {
    secondFinished = true;
    return models;
  });
  await setImmediate();
  assert.equal(secondFinished, true, "Account B must not wait for account A's pending request");
  assert.equal((await second)[0].name, "Account B");
  assert.deepEqual(catalogRequests, ["a", "b"]);

  pendingA.resolve(catalogA);
  assert.equal((await first)[0].name, "Account A");
  const prepared = await adapter.prepareCall("test", "shared-model");
  assert.equal(prepared.model.name, "Account B");
  for await (const chunk of adapter.stream({ provider: "test", model: "shared-model" })) {
    assert.equal(chunk.type, "finish");
  }
  assert.deepEqual(streamRequests[0].request.modelContext, { contextWindow: 20000, maxTokens: 2000 });
  assert.deepEqual(catalogRequests, ["a", "b"]);
  assert.equal((await adapter.listModels("test"))[0].name, "Account B");
});
