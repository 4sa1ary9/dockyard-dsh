import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserOAuthAuthorizer } from "../packages/oauth/src/browser-oauth-authorizer.mjs";
import { DockyardRuntime } from "../packages/runtime/src/dockyard-runtime.mjs";
import { DockyardDshService, dockyardDshConstants } from "../packages/dsh-plugin/src/dockyard-service.mjs";
import { MemorySecretStore } from "../packages/vault/src/index.mjs";

const providerId = "lifecycle-test";
const defer = () => Promise.withResolvers();

// Real browser controller and persistence runtime, but entirely in-memory
// synthetic account data. No user state store, credentials, or network access.
async function fixture(t, { exchangeCode, pollSession, importError, saveError } = {}) {
  let ready = false;
  let state = { pools: {} };
  const counts = { polls: 0, exchanges: 0, imports: 0, saves: 0, refreshes: 0 };
  const saved = defer();
  const refreshed = defer();
  const authorizer = createBrowserOAuthAuthorizer({
    providerId, redirectUri: "http://127.0.0.1/callback",
    authorizationUrlBuilder: ({ state }) => `https://example.test/oauth?state=${state}`,
    exchangeCode: async () => { counts.exchanges++; return exchangeCode ? exchangeCode() : { access: "synthetic-access" }; },
    pollSession: async () => { counts.polls++; return pollSession ? pollSession() : ready ? { access: "synthetic-access" } : null; },
    importCredentials: async () => {
      counts.imports++;
      if (importError) throw new Error(importError);
      return [{ providerId, accountId: "synthetic-account", email: "test@example.test", auth: { kind: "oauth", credentialRef: "memory://synthetic" } }];
    },
  });
  const module = {
    manifest: { id: providerId, kind: "provider", capabilities: ["oauth_authorization"] },
    async activate(context) { context.registerService(`provider:${providerId}`, this); },
    startAuthorization: () => authorizer.begin(),
    pollAuthorization: (id, context) => authorizer.poll(id, context),
    cancelAuthorization: (id) => authorizer.cancel(id),
    submitAuthorizationCode: (id, code, context) => authorizer.submitAuthorizationCode(id, code, context),
    async getCatalog() { return { models: [] }; },
    async invoke() {},
  };
  const runtime = new DockyardRuntime({
    providers: [{ module }], secretStore: new MemorySecretStore(),
    stateStore: {
      async load() { return structuredClone(state); },
      async save(value) {
        counts.saves++;
        if (saveError) throw new Error(saveError);
        state = structuredClone(value);
        saved.resolve();
      },
    },
  });
  const service = new DockyardDshService({ runtime, autoRefresh: false, openBrowser: async () => {} });
  service.refresh = async () => { counts.refreshes++; refreshed.resolve(); };
  const started = await service.startAuthorization(providerId, { openBrowser: false });
  t.after(() => service.dispose());
  return {
    authorizer, runtime, service, started, counts, saved, refreshed,
    approve() { ready = true; },
    code: `synthetic-code#${new URL(started.authorizationUrl).searchParams.get("state")}`,
    persisted: () => structuredClone(state),
  };
}

test("Host background poll consumes completion but later UI polls replay the persisted result", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await fixture(t);
  f.approve();
  t.mock.timers.tick(dockyardDshConstants.authPollIntervalMs);
  await f.refreshed.promise;
  const result = await f.service.pollAuthorization(providerId, f.started.sessionId);
  assert.equal(result.status, "completed");
  assert.equal(f.persisted().pools[providerId].accounts.length, 1);
  assert.equal(f.runtime.snapshot().providers[0].accounts.length, 1);
  assert.equal((await f.authorizer.poll(f.started.sessionId)).status, "missing", "provider really consumed its terminal result");
  assert.deepEqual(await f.service.pollAuthorization(providerId, f.started.sessionId), result);
  assert.equal(f.counts.imports, 1);
  assert.equal(f.counts.saves, 1);
  assert.equal(f.counts.refreshes, 1);
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(result.accounts[0].auth, undefined);
  t.mock.timers.tick(5000);
  assert.equal(f.counts.polls, 1, "terminal cleanup removed the Host timer");
});

test("Host-first provider failure is replayed with its actual diagnostic, never replaced by missing", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await fixture(t, { importError: "provider entitlement denied" });
  const finished = defer();
  const poll = f.service.pollAuthorization.bind(f.service);
  f.service.pollAuthorization = async (...args) => {
    const result = await poll(...args);
    finished.resolve(result);
    return result;
  };
  f.approve();
  t.mock.timers.tick(dockyardDshConstants.authPollIntervalMs);
  const first = await finished.promise;
  const later = await f.service.pollAuthorization(providerId, f.started.sessionId);
  assert.equal(first.status, "failed");
  assert.match(first.diagnostic, /provider entitlement denied/);
  assert.deepEqual(later, first);
  assert.equal(f.counts.refreshes, 0);
  assert.equal(f.counts.saves, 0);
});

test("persistence failure after provider completion remains visible and rolls the pool back", async (t) => {
  const f = await fixture(t, { saveError: "synthetic state persistence unavailable" });
  f.approve();
  const first = await f.service.pollAuthorization(providerId, f.started.sessionId);
  assert.equal(first.status, "failed");
  assert.match(first.diagnostic, /synthetic state persistence unavailable/);
  assert.deepEqual(await f.service.pollAuthorization(providerId, f.started.sessionId), first);
  assert.equal(f.runtime.snapshot().providers[0].accounts.length, 0);
  assert.equal(f.counts.refreshes, 0);
});

test("concurrent Host and Client polls import, persist and refresh only once", async (t) => {
  const f = await fixture(t);
  f.approve();
  const results = await Promise.all(Array.from({ length: 12 }, () => f.service.pollAuthorization(providerId, f.started.sessionId)));
  assert.ok(results.every((result) => result.status === "completed"));
  assert.equal(f.counts.polls, 1);
  assert.equal(f.counts.imports, 1);
  assert.equal(f.counts.saves, 1);
  assert.equal(f.counts.refreshes, 1);
});

test("manual callback completion uses runtime persistence before caching its terminal receipt", async (t) => {
  const f = await fixture(t);
  const result = await f.service.submitAuthorizationCode(providerId, f.started.sessionId, f.code);
  assert.equal(result.status, "completed");
  assert.equal(f.runtime.snapshot().providers[0].accounts.length, 1);
  assert.equal(f.persisted().pools[providerId].accounts.length, 1);
  assert.equal(f.counts.saves, 1);
  assert.equal(f.counts.exchanges, 1);
  assert.deepEqual(await f.service.pollAuthorization(providerId, f.started.sessionId), result);
  assert.equal(f.counts.saves, 1);
});

test("polling during a manual token exchange joins one operation and one import transaction", async (t) => {
  const exchange = defer();
  const entered = defer();
  const f = await fixture(t, { exchangeCode: () => { entered.resolve(); return exchange.promise; } });
  const submit = f.service.submitAuthorizationCode(providerId, f.started.sessionId, f.code);
  await entered.promise;
  const polls = Array.from({ length: 6 }, () => f.service.pollAuthorization(providerId, f.started.sessionId));
  exchange.resolve({ access: "synthetic-access" });
  const results = await Promise.all([submit, ...polls]);
  assert.ok(results.every((result) => result.status === "completed"));
  assert.equal(f.counts.exchanges, 1);
  assert.equal(f.counts.imports, 1);
  assert.equal(f.counts.saves, 1);
  assert.equal(f.counts.refreshes, 1);
});

test("cancellation wins an in-flight token exchange and later polls cannot resurrect the session", async (t) => {
  const exchange = defer();
  const entered = defer();
  const f = await fixture(t, { exchangeCode: () => { entered.resolve(); return exchange.promise; } });
  const submit = f.service.submitAuthorizationCode(providerId, f.started.sessionId, f.code);
  await entered.promise;
  assert.equal((await f.service.cancelAuthorization(providerId, f.started.sessionId)).status, "cancelled");
  exchange.resolve({ access: "synthetic-access" });
  assert.equal((await submit).status, "cancelled");
  assert.equal((await f.service.pollAuthorization(providerId, f.started.sessionId)).status, "cancelled");
  assert.equal(f.counts.imports, 0);
  assert.equal(f.counts.saves, 0);
  assert.equal(f.counts.refreshes, 0);
  assert.equal(f.runtime.snapshot().providers[0].accounts.length, 0);
});

test("cancel wins a late poll even after its bounded cancellation receipt expires", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1000 });
  const gate = defer();
  const entered = defer();
  const f = await fixture(t, { pollSession: () => { entered.resolve(); return gate.promise; } });
  const pending = f.service.pollAuthorization(providerId, f.started.sessionId);
  await entered.promise;
  const cancelled = await f.service.cancelAuthorization(providerId, f.started.sessionId);
  assert.equal(cancelled.status, "cancelled");
  t.mock.timers.tick(dockyardDshConstants.authResultTtlMs + 1);
  gate.resolve({ access: "synthetic-access" });
  const result = await pending;
  assert.equal(result.status, "cancelled");
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(f.counts.imports, 0);
  assert.equal(f.counts.saves, 0);
  assert.equal(f.counts.refreshes, 0);
});

test("submitting during a pending poll waits without losing the callback code", async (t) => {
  const gate = defer();
  const entered = defer();
  const f = await fixture(t, { pollSession: () => { entered.resolve(); return gate.promise; } });
  const polling = f.service.pollAuthorization(providerId, f.started.sessionId);
  await entered.promise;
  const submitting = f.service.submitAuthorizationCode(providerId, f.started.sessionId, f.code);
  gate.resolve(null);
  assert.equal((await polling).status, "pending");
  assert.equal((await submitting).status, "completed");
  assert.equal(f.counts.exchanges, 1);
  assert.equal(f.counts.saves, 1);
});

test("a thrown poll closes its still-live provider session and replays the failure", async (t) => {
  const f = await fixture(t);
  f.runtime.pollAuthorization = async () => { throw new Error("synthetic poll unavailable"); };
  const first = await f.service.pollAuthorization(providerId, f.started.sessionId);
  assert.equal(first.status, "failed");
  assert.match(first.diagnostic, /synthetic poll unavailable/);
  assert.equal((await f.authorizer.poll(f.started.sessionId)).status, "missing", "the provider session was cancelled after the throw");
  assert.deepEqual(await f.service.pollAuthorization(providerId, f.started.sessionId), first);
});

test("disposing during begin cancels its late session without opening the browser", async (t) => {
  const begin = defer();
  const entered = defer();
  const cancels = [];
  let launches = 0;
  const service = new DockyardDshService({ autoRefresh: false,
    openBrowser: async () => { launches++; },
    runtime: {
      init() {},
      listProviderManifests: () => [{ id: providerId, capabilities: ["oauth_authorization"] }],
      async startAuthorization() { entered.resolve(); return begin.promise; },
      async cancelAuthorization(provider, session) { cancels.push([provider, session]); },
    },
  });
  t.after(() => service.dispose());
  const starting = service.startAuthorization(providerId);
  await entered.promise;
  await service.dispose();
  begin.resolve({ sessionId: "late-session", status: "pending", authorizationUrl: "https://example.test/oauth" });
  assert.equal((await starting).status, "cancelled");
  assert.deepEqual(cancels, [[providerId, "late-session"]]);
  assert.equal(launches, 0);
});

test("provider-neutral pending results retain one provider-scoped browser launch", async (t) => {
  let launches = 0;
  const service = new DockyardDshService({ autoRefresh: false,
    openBrowser: async () => { launches++; },
    runtime: {
      init() {},
      listProviderManifests: () => [{ id: providerId, capabilities: ["oauth_authorization"] }],
      async startAuthorization() { return { sessionId: "neutral-session", status: "pending", authorizationUrl: "https://example.test/oauth" }; },
      async pollAuthorization() { return { status: "pending", authorizationUrl: "https://example.test/oauth" }; },
      async cancelAuthorization() {},
    },
  });
  t.after(() => service.dispose());
  const started = await service.startAuthorization(providerId);
  const polled = await service.pollAuthorization(providerId, started.sessionId);
  assert.equal(polled.providerId, providerId);
  assert.equal(polled.sessionId, started.sessionId);
  assert.equal(launches, 1);
});

test("terminal receipts are provider-scoped, bounded, expiring and stripped of OAuth material", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1000 });
  let polls = 0;
  const service = new DockyardDshService({ autoRefresh: false, runtime: {
    init() {},
    async pollAuthorization(providerId, sessionId) {
      polls++;
      return {
        providerId, sessionId, status: "failed", authorizationUrl: "https://example.test/oauth?state=secret-state",
        code: "secret-code", credentials: { access: "secret-access" },
        diagnostic: "denied https://example.test/callback?code=secret-code access_token=secret-access code=secret-code",
      };
    },
  } });
  t.after(() => service.dispose());
  const first = await service.pollAuthorization("alpha", "shared");
  assert.doesNotMatch(JSON.stringify(first), /secret-state|secret-code|secret-access|authorizationUrl|credentials/);
  assert.equal((await service.pollAuthorization("beta", "shared")).providerId, "beta");
  assert.equal(polls, 2);
  await service.pollAuthorization("alpha", "shared");
  assert.equal(polls, 2);
  first.diagnostic = "caller mutation";
  assert.notEqual((await service.pollAuthorization("alpha", "shared")).diagnostic, first.diagnostic);
  t.mock.timers.tick(dockyardDshConstants.authResultTtlMs + 1);
  await service.pollAuthorization("alpha", "shared");
  assert.equal(polls, 3);
  for (let i = 0; i < dockyardDshConstants.authResultMaxEntries; i++) await service.pollAuthorization("alpha", `session-${i}`);
  const before = polls;
  await service.pollAuthorization("alpha", "shared");
  assert.equal(polls, before + 1, "oldest result was evicted at the bounded cap");
});
