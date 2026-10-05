import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";

import { DockyardClientController } from "../packages/dsh-plugin/src/dockyard-client.mjs";

test("Antigravity reserves its browser window during the click and retains a blocked-popup fallback", async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  t.after(() => previous ? Object.defineProperty(globalThis, "window", previous) : delete globalThis.window);
  for (const blocked of [false, true]) {
    const calls = [];
    const popup = { location: {}, closed: false, close() { this.closed = true; } };
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      open: (...args) => { calls.push(args); return blocked ? null : popup; },
    } });
    const controller = new DockyardClientController({ login: async () => {
      assert.equal(calls.length, 1, "the popup must be reserved before awaiting the login RPC");
      return { snapshot: { providers: [] }, result: { providerId: "antigravity", sessionId: "test", status: "pending", authorizationUrl: "https://accounts.google.com/test-only" } };
    } });
    t.after(() => controller.dispose());
    const result = await controller.login("antigravity");
    assert.equal(result?.status, "pending");
    assert.equal(calls.length, 1, "blocked popups should use the visible link, not a second asynchronous popup");
    assert.equal(controller.store.getSnapshot().auth.browserOpenFailed, blocked);
    if (!blocked) assert.equal(popup.location.href, result.authorizationUrl);
    controller.applyValue({ snapshot: { providers: [] }, result: { sessionId: "test", status: "pending" } }, "antigravity");
    assert.equal(controller.store.getSnapshot().auth.authorizationUrl, result.authorizationUrl);
    assert.equal(controller.store.getSnapshot().auth.browserOpenFailed, blocked);
    controller.dispose();
  }
});

test("desktop denied blank popup asks the local Host to launch, remote Web never does", async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  t.after(() => previous ? Object.defineProperty(globalThis, "window", previous) : delete globalThis.window);
  for (const hostname of ["127.0.0.1", "localhost", "[::1]", "remote.example.test"]) {
    for (const browserOpened of [true, false]) {
      let popupCalls = 0;
      Object.defineProperty(globalThis, "window", { configurable: true, value: {
        location: { hostname }, open() { popupCalls++; return null; },
      } });
      const local = hostname !== "remote.example.test";
      const controller = new DockyardClientController({ login: async (request) => {
        assert.equal(popupCalls, 1);
        assert.deepEqual(request, { providerId: "antigravity", ...(local ? { openBrowser: true } : {}) });
        return { snapshot: { providers: [] }, result: {
          providerId: "antigravity", sessionId: "desktop", status: "pending",
          authorizationUrl: "https://accounts.google.com/test-only", browserOpened: local && browserOpened,
        } };
      } });
      t.after(() => controller.dispose());
      await controller.login("antigravity");
      assert.equal(controller.store.getSnapshot().auth.browserOpenFailed, !(local && browserOpened));
      assert.equal(popupCalls, 1, "no second asynchronous popup or duplicate browser");
      assert.ok(controller.store.getSnapshot().auth.authorizationUrl, "manual link remains available");
      controller.dispose();
    }
  }
});

test("a successful Host poll clears an earlier browser launch warning", () => {
  const controller = new DockyardClientController({});
  controller.setState({ auth: { sessionId: "delayed", status: "pending", browserOpenFailed: true } });
  controller.applyValue({ snapshot: { providers: [] }, result: {
    providerId: "antigravity", sessionId: "delayed", status: "pending", browserOpened: true,
    authorizationUrl: "https://accounts.google.com/test-only",
  } }, "antigravity");
  assert.equal(controller.store.getSnapshot().auth.browserOpenFailed, false);
  controller.dispose();
});

const snapshot = { providers: [{ providerId: "test", accounts: [] }] };

test("failed authorization diagnostics are errors, not success notices", () => {
  const controller = new DockyardClientController({});
  controller.applyValue({ snapshot, result: { status: "failed", diagnostic: "Authorization denied" } }, "test");
  assert.equal(controller.store.getSnapshot().error, "Authorization denied");
  assert.equal(controller.store.getSnapshot().message, null);
  controller.dispose();
});

test("refresh deduplicates requests and keeps an active browser login", async (t) => {
  const pending = Promise.withResolvers();
  const requests = [];
  const controller = new DockyardClientController({
    refresh(request) { requests.push(request); return pending.promise; },
  });
  t.after(() => controller.dispose());
  controller.setState({ auth: { providerId: "test", sessionId: "login", status: "pending" } });
  const first = controller.refresh();
  const second = controller.refresh();
  pending.resolve({ snapshot, result: [] });
  await Promise.all([first, second]);
  assert.deepEqual(requests, [{}]);
  assert.equal(controller.store.getSnapshot().auth.sessionId, "login");
  assert.deepEqual(controller.store.getSnapshot().snapshot, snapshot);
});

test("background refresh skips busy or hidden UI and preserves foreground messages", async (t) => {
  let calls = 0;
  const pending = Promise.withResolvers();
  const controller = new DockyardClientController({
    refresh() { calls++; return pending.promise; },
  });
  t.after(() => controller.dispose());
  controller.setState({ auth: { sessionId: "login", status: "pending" } });
  await controller.refresh("test", { background: true });
  controller.setState({ auth: null, action: "remove" });
  await controller.refresh("test", { background: true });
  controller.setState({ action: null });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { hidden: true } });
  t.after(() => { delete globalThis.document; });
  await controller.refresh("test", { background: true });
  assert.equal(calls, 0);
  globalThis.document.hidden = false;
  const refreshing = controller.refresh("test", { background: true });
  controller.setState({ action: "login", status: "loading", message: "Finish login in the browser" });
  pending.resolve({ snapshot, result: [] });
  await refreshing;
  const state = controller.store.getSnapshot();
  assert.equal(state.action, "login");
  assert.equal(state.message, "Finish login in the browser");
  assert.equal(state.snapshot, null);
});

test("manual refresh waits for background work then performs one refresh with visible feedback", async (t) => {
  const background = Promise.withResolvers();
  const foreground = Promise.withResolvers();
  let calls = 0;
  const controller = new DockyardClientController({
    refresh: () => ++calls === 1 ? background.promise : foreground.promise,
  });
  t.after(() => controller.dispose());
  const automatic = controller.refresh("test", { background: true });
  const first = controller.refresh("test");
  const second = controller.refresh("test");
  assert.equal(controller.store.getSnapshot().action, "refresh");
  assert.equal(controller.store.getSnapshot().status, "loading");
  assert.equal(calls, 1);
  background.reject(new Error("Background request failed"));
  await automatic;
  await setImmediate();
  assert.equal(calls, 2);
  assert.equal(controller.store.getSnapshot().action, "refresh");
  assert.equal(controller.store.getSnapshot().error, null);
  foreground.reject(new Error("Manual request failed"));
  assert.deepEqual(await Promise.all([first, second]), [null, null]);
  assert.equal(calls, 2);
  assert.equal(controller.store.getSnapshot().action, null);
  assert.equal(controller.store.getSnapshot().error, "Manual request failed");
});

test("a late background snapshot cannot restore a removed account", async () => {
  const pending = Promise.withResolvers();
  const oldSnapshot = { providers: [{ providerId: "test", accounts: [{ accountId: "removed" }] }] };
  const controller = new DockyardClientController({
    refresh: () => pending.promise,
    removeAccount: async () => ({ snapshot, result: {} }),
    scan: async () => ({ snapshot, result: { providers: [] } }),
  });
  controller.setState({ snapshot: oldSnapshot });
  const refreshing = controller.refresh("test", { background: true });
  await controller.removeAccount("test", "removed");
  pending.resolve({ snapshot: oldSnapshot, result: [] });
  assert.equal(await refreshing, null);
  assert.deepEqual(controller.store.getSnapshot().snapshot, snapshot);
  assert.equal(controller.store.getSnapshot().action, null);
  controller.dispose();
});

test("disposing a controller ignores both successful and failed in-flight OAuth polls", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const fails of [false, true]) {
    const pending = Promise.withResolvers();
    const controller = new DockyardClientController({ poll: () => pending.promise });
    controller.setState({ auth: { sessionId: "login", status: "pending" } });
    controller.scheduleAuth("test", "login");
    t.mock.timers.tick(1000);
    controller.dispose();
    const before = controller.store.getSnapshot();
    if (fails) pending.reject(new Error("late network failure"));
    else pending.resolve({ snapshot, result: { status: "pending", sessionId: "login" } });
    await setImmediate();
    assert.equal(controller.store.getSnapshot(), before);
    assert.equal(controller.authTimers.size, 0);
  }
});

test("one authorization occupies the slot while login starts and while browser approval is pending", async (t) => {
  const pending = Promise.withResolvers();
  const requests = [];
  const controller = new DockyardClientController({
    login(request) { requests.push(request); return pending.promise; },
  }, (key, params) => `${key}:${params?.provider ?? ""}`);
  t.after(() => controller.dispose());
  const first = controller.login("alpha");
  assert.equal(await controller.login("beta"), null);
  assert.equal(controller.store.getSnapshot().action, "login");
  assert.equal(controller.store.getSnapshot().providerId, "alpha");
  pending.resolve({ snapshot, result: { providerId: "alpha", sessionId: "login", status: "pending", instructions: "Approve in browser" } });
  await first;
  const existing = await controller.login("beta");
  assert.deepEqual(requests, [{ providerId: "alpha" }]);
  assert.equal(existing.providerId, "alpha");
  const state = controller.store.getSnapshot();
  assert.equal(state.providerId, "beta");
  assert.equal(state.auth.providerId, "alpha");
  assert.equal(state.auth.instructions, "Approve in browser");
  assert.equal(state.message, "status.oauthOtherInProgress:alpha");
});

test("OAuth completion and poll failures leave a foreground policy operation in control", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const fails of [false, true]) {
    const poll = Promise.withResolvers();
    const policy = Promise.withResolvers();
    let pollCalls = 0;
    const controller = new DockyardClientController({
      poll() {
        if (++pollCalls === 1) return poll.promise;
        return { snapshot, result: { status: "completed", sessionId: "login" } };
      },
      setPolicy: () => policy.promise,
    });
    t.after(() => controller.dispose());
    controller.setState({ snapshot, auth: { providerId: "alpha", sessionId: "login", status: "pending" } });
    controller.scheduleAuth("alpha", "login");
    t.mock.timers.tick(1000);
    const updating = controller.setPolicy("beta", "manual");
    if (fails) poll.reject(new Error("Temporary poll failure"));
    else poll.resolve({ snapshot, result: { status: "completed", sessionId: "login" } });
    await setImmediate();
    const state = controller.store.getSnapshot();
    assert.equal(state.action, "policy");
    assert.equal(state.status, "loading");
    assert.equal(state.providerId, "beta");
    assert.equal(state.error, null);
    assert.equal(state.message, null);
    assert.equal(state.auth?.status ?? null, fails ? "pending" : null);
    policy.resolve({ snapshot, result: {} });
    await updating;
    if (fails) {
      t.mock.timers.tick(1000);
      await setImmediate();
      assert.equal(controller.store.getSnapshot().auth, null);
      assert.equal(pollCalls, 2);
    }
    controller.dispose();
  }
});

test("late OAuth completion preserves a newer account snapshot and does not lose the auth result", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = Promise.withResolvers();
  const oldSnapshot = { providers: [{ providerId: "test", accounts: [{ accountId: "removed" }] }] };
  const controller = new DockyardClientController({
    poll: () => pending.promise,
    removeAccount: async () => ({ snapshot, result: {} }),
    scan: async () => ({ snapshot, result: { providers: [] } }),
  });
  t.after(() => controller.dispose());
  controller.setState({ snapshot: oldSnapshot, auth: { providerId: "alpha", sessionId: "login", status: "pending" } });
  controller.scheduleAuth("alpha", "login");
  t.mock.timers.tick(1000);
  await controller.removeAccount("test", "removed");
  assert.equal(controller.store.getSnapshot().auth.sessionId, "login");
  pending.resolve({ snapshot: oldSnapshot, result: { status: "completed", sessionId: "login" } });
  await setImmediate();
  assert.deepEqual(controller.store.getSnapshot().snapshot, snapshot);
  assert.equal(controller.store.getSnapshot().auth, null);
  assert.equal(controller.authTimers.size, 0);
});

test("a waiting poll keeps a rejected authorization code visible and clears only its own failure", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let failNext = false;
  const controller = new DockyardClientController({
    poll: async () => {
      if (failNext) {
        failNext = false;
        throw new Error("Temporary poll failure");
      }
      return { snapshot, result: { status: "pending", sessionId: "login" } };
    },
    submitAuthorizationCode: async () => { throw new Error("state is missing"); },
  });
  t.after(() => controller.dispose());
  controller.setState({ snapshot, auth: { providerId: "test", sessionId: "login", status: "pending" } });
  controller.scheduleAuth("test", "login");
  assert.equal(await controller.submitAuthorizationCode("test", "login", "code-without-state"), null);
  t.mock.timers.tick(1000);
  await setImmediate();
  assert.equal(controller.store.getSnapshot().error, "state is missing");
  failNext = true;
  t.mock.timers.tick(1000);
  await setImmediate();
  assert.equal(controller.store.getSnapshot().error, "Temporary poll failure");
  t.mock.timers.tick(1000);
  await setImmediate();
  assert.equal(controller.store.getSnapshot().error, null);
  assert.equal(controller.store.getSnapshot().auth.status, "pending");
});
