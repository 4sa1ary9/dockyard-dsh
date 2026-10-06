import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { syncBuiltinESMExports } from "node:module";
import { DockyardDshService } from "../packages/dsh-plugin/src/dockyard-service.mjs";
import { createAntigravityOAuthAuthorizer } from "../modules/provider-antigravity/src/driver.mjs";
import { DockyardClientController } from "../packages/dsh-plugin/src/dockyard-client.mjs";
import { DockyardRemoteService } from "../packages/dsh-plugin/src/dockyard-remote-host.mjs";
import { TYPERT_DESCRIPTORS } from "../packages/dsh-plugin/src/dockyard-typert-shared.mjs";

test("Antigravity launch failure never reports an opened browser", async () => {
  const authorizer = createAntigravityOAuthAuthorizer({
    environment: {},
    spawnImpl: () => { throw Object.assign(new Error("agy launcher missing"), { code: "ENOENT" }); },
    tokenReader: () => null,
  });
  const started = await authorizer.begin();
  try {
    assert.notEqual(started.browserOpened, true);
    assert.doesNotMatch(started.instructions, /已打开/);
    assert.equal(started.status, "failed");
    assert.match(started.diagnostic, /无法启动/);
  } finally {
    await authorizer.cancel(started.sessionId);
  }
});

test("Antigravity pipe authentication failure explains the required interactive sign-in", async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => true;
  const authorizer = createAntigravityOAuthAuthorizer({
    environment: {},
    spawnImpl: () => child,
    tokenReader: () => null,
  });
  const started = await authorizer.begin();
  child.stderr.emit("data", "authentication required: run agy in an interactive terminal\n");
  child.emit("close", 1);
  const result = await authorizer.poll(started.sessionId);
  assert.equal(result.status, "failed");
  assert.notEqual(result.browserOpened, true);
  assert.match(result.diagnostic, /交互终端/);
});

test("browser launch failure keeps the login link and reports actionable feedback", async () => {
  const pending = { providerId: "antigravity", sessionId: "test-auth", status: "pending", authorizationUrl: "https://example.com/login" };
  const runtime = {
    init() {},
    listProviderManifests: () => [{ id: "antigravity", capabilities: ["oauth_authorization"] }],
    startAuthorization: async () => ({ ...pending }),
    pollAuthorization: async () => ({ ...pending }),
    cancelAuthorization: async () => ({ status: "cancelled" }),
  };
  const service = new DockyardDshService({
    runtime, autoRefresh: false, logger: { warn() {} },
    openBrowser: async () => { throw new Error("launcher unavailable"); },
  });
  try {
    const result = await service.startAuthorization("antigravity");
    assert.equal(result.authorizationUrl, pending.authorizationUrl);
    assert.equal(result.browserOpened, false);
    assert.match(result.diagnostic, /手动打开/);
    const polled = await service.pollAuthorization("antigravity", pending.sessionId);
    assert.equal(polled.browserOpened, false);
    assert.match(polled.diagnostic, /手动打开/);
  } finally { await service.dispose(); }
});

test("browser launch is confirmed once and retained across concurrent polls", async () => {
  const pending = { providerId: "antigravity", sessionId: "test-auth", status: "pending", authorizationUrl: "https://example.com/login" };
  let launches = 0;
  const service = new DockyardDshService({
    runtime: {
      init() {},
      listProviderManifests: () => [{ id: "antigravity", capabilities: ["oauth_authorization"] }],
      startAuthorization: async () => ({ ...pending }),
      pollAuthorization: async () => ({ ...pending }),
      cancelAuthorization: async () => ({ status: "cancelled" }),
    },
    autoRefresh: false,
    openBrowser: async () => { launches += 1; },
  });
  try {
    const started = await service.startAuthorization("antigravity");
    assert.equal(started.browserOpened, true);
    const results = await Promise.all([service.pollAuthorization("antigravity", pending.sessionId), service.pollAuthorization("antigravity", pending.sessionId)]);
    assert.equal(launches, 1);
    assert.ok(results.every((result) => result.browserOpened === true));
  } finally { await service.dispose(); }
});

test("desktop click crosses Client, RPC schema and Host to launch the provider URL exactly once", async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  t.after(() => previous ? Object.defineProperty(globalThis, "window", previous) : delete globalThis.window);
  let blankPopups = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location: { protocol: "dsh-app:", hostname: "app" }, open() { blankPopups++; return null; },
  } });
  const pending = { providerId: "antigravity", sessionId: "desktop-auth", status: "pending", authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=test-only" };
  const launched = [];
  const service = new DockyardDshService({
    runtime: {
      init() {}, snapshot: () => ({ providers: [] }),
      listProviderManifests: () => [{ id: "antigravity", capabilities: ["oauth_authorization"] }],
      startAuthorization: async () => ({ ...pending }),
      pollAuthorization: async () => ({ ...pending }),
      cancelAuthorization: async () => ({ status: "cancelled" }),
    },
    autoRefresh: false, openBrowser: async (url) => { launched.push(url); },
  });
  t.after(() => service.dispose());
  const schema = TYPERT_DESCRIPTORS.find((entry) => entry.method === "login").parameters[0].codec.schema;
  const controller = new DockyardClientController({
    login: (request) => DockyardRemoteService.prototype.login.call({ dockyard: service }, schema.parse(request)),
  });
  t.after(() => controller.dispose());
  const result = await controller.login("antigravity");
  assert.equal(result.browserOpened, true);
  assert.equal(controller.store.getSnapshot().auth.browserOpenFailed, false);
  await controller.login("antigravity");
  await Promise.all([service.pollAuthorization("antigravity", pending.sessionId), service.pollAuthorization("antigravity", pending.sessionId)]);
  assert.equal(blankPopups, 1);
  assert.deepEqual(launched, [pending.authorizationUrl]);
});

test("a reconnected local client can request Host launch for an existing unlaunched session", async (t) => {
  const pending = { providerId: "antigravity", sessionId: "existing-auth", status: "pending", authorizationUrl: "https://accounts.google.com/test-only" };
  let starts = 0;
  let launches = 0;
  const service = new DockyardDshService({
    runtime: {
      init() {},
      listProviderManifests: () => [{ id: "antigravity", capabilities: ["oauth_authorization"] }],
      startAuthorization: async () => { starts++; return { ...pending }; },
      pollAuthorization: async () => ({ ...pending }),
      cancelAuthorization: async () => ({ status: "cancelled" }),
    },
    autoRefresh: false, openBrowser: async () => { launches++; },
  });
  t.after(() => service.dispose());
  await service.startAuthorization("antigravity", { openBrowser: false });
  assert.equal(launches, 0);
  const result = await service.startAuthorization("antigravity", { openBrowser: true });
  assert.equal(result.browserOpened, true);
  assert.equal(starts, 1);
  assert.equal(launches, 1);
});

test("browser login validates URLs and handles asynchronous launcher failures", async (t) => {
  const service = new DockyardDshService({ runtime: { init() {} }, autoRefresh: false });
  const launches = [];
  let fail = false;
  t.mock.method(childProcess, "spawn", (...args) => {
    launches.push(args);
    const child = new EventEmitter();
    child.unref = () => {};
    process.nextTick(() => fail
      ? child.emit("error", Object.assign(new Error("launcher missing"), { code: "ENOENT" }))
      : child.emit("spawn"));
    return child;
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(service.openBrowser("file:///C:/Windows/notepad.exe"), /HTTP or HTTPS/);
    await assert.rejects(service.openBrowser("invalid URL"));
    assert.equal(launches.length, 0);
    const url = "https://example.com/login?state=a&code=b";
    await service.openBrowser(url);
    assert.equal(launches[0][1].at(-1), url);
    assert.equal(launches[0][2].windowsHide, true);
    if (process.platform === "win32") assert.equal(launches[0][0], "rundll32.exe");
    fail = true;
    await assert.rejects(service.openBrowser(url), { code: "ENOENT" });
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});
