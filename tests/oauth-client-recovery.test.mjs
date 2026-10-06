import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { DockyardClientController } from "../packages/dsh-plugin/src/dockyard-client.mjs";

const snapshot = { providers: [] };
const pending = { providerId: "antigravity", sessionId: "old", status: "pending", authorizationUrl: "https://accounts.google.com/test?state=old" };

function setWindow(t, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value });
  t.after(() => previous ? Object.defineProperty(globalThis, "window", previous) : delete globalThis.window);
}

test("packaged desktop dsh-app://app requests Host launch, lookalike Web origins do not", async (t) => {
  for (const [protocol, hostname, local] of [
    ["dsh-app:", "app", true], ["https:", "app", false], ["http:", "app", false],
    ["dsh-app:", "remote.example.test", false], ["file:", "", false],
    ["https:", "remote.example.test", false], ["http:", "127.0.0.1", true],
  ]) {
    await t.test(`${protocol}//${hostname}`, async (t) => {
      let launches = 0;
      setWindow(t, { location: { protocol, hostname }, open: () => null });
      const controller = new DockyardClientController({ login: async (request) => {
        launches++;
        assert.deepEqual(request, { providerId: "antigravity", ...(local ? { openBrowser: true } : {}) });
        return { snapshot, result: { ...pending, browserOpened: local } };
      } });
      t.after(() => controller.dispose());
      await controller.login("antigravity");
      assert.equal(launches, 1);
      assert.equal(controller.store.getSnapshot().auth.browserOpenFailed, !local);
    });
  }
});

test("terminal OAuth states discard spent URLs, popup warnings and code inputs", (t) => {
  for (const status of ["missing", "failed", "error", "expired", "timeout", "cancelled", "completed"]) {
    const controller = new DockyardClientController({});
    t.after(() => controller.dispose());
    controller.setState({ auth: { ...pending, browserOpenFailed: true, authorizationCodeRequired: true }, message: "old instructions" });
    controller.scheduleAuth("antigravity", "old");
    controller.applyValue({ snapshot, result: { ...pending, status, diagnostic: `real ${status}` } }, "antigravity");
    const state = controller.store.getSnapshot();
    if (status === "completed") assert.equal(state.auth, null);
    else {
      assert.equal(state.auth.authorizationUrl, null);
      assert.equal(state.auth.browserOpenFailed, false);
      assert.equal(state.auth.authorizationCodeRequired, false);
      assert.equal(state.auth.diagnostic, `real ${status}`);
    }
    if (["missing", "failed", "error", "expired", "timeout"].includes(status)) {
      assert.equal(state.error, `real ${status}`);
      assert.equal(state.message, null);
    }
    assert.equal(controller.authTimers.size, 0);
    assert.equal(controller.authPolling.size, 0);
  }
});

test("retry from a missing session creates a new login instead of reopening its spent link", async (t) => {
  setWindow(t, { location: { protocol: "dsh-app:", hostname: "app" }, open: () => null });
  let logins = 0;
  const controller = new DockyardClientController({ login: async (request) => {
    logins++;
    assert.equal(controller.store.getSnapshot().auth, null);
    assert.equal(request.openBrowser, true);
    return { snapshot, result: { ...pending, sessionId: "fresh", authorizationUrl: "https://accounts.google.com/test?state=fresh", browserOpened: true } };
  } });
  t.after(() => controller.dispose());
  controller.setState({ auth: { ...pending, status: "missing", browserOpenFailed: true } });
  await controller.login("antigravity");
  assert.equal(logins, 1);
  assert.equal(controller.store.getSnapshot().auth.sessionId, "fresh");
  assert.match(controller.store.getSnapshot().auth.authorizationUrl, /state=fresh/);
  assert.equal(controller.store.getSnapshot().auth.browserOpenFailed, false);
});

test("a delayed old poll cannot overwrite a newly started OAuth session", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const oldPoll = Promise.withResolvers();
  const controller = new DockyardClientController({
    poll: () => oldPoll.promise,
    login: async () => ({ snapshot, result: { ...pending, sessionId: "fresh" } }),
  });
  t.after(() => controller.dispose());
  controller.setState({ auth: pending });
  controller.scheduleAuth("antigravity", "old");
  t.mock.timers.tick(1000);
  controller.applyValue({ snapshot, result: { ...pending, status: "missing" } }, "antigravity");
  await controller.login("antigravity");
  oldPoll.resolve({ snapshot, result: { ...pending, status: "failed", diagnostic: "old failure" } });
  await setImmediate();
  assert.equal(controller.store.getSnapshot().auth.sessionId, "fresh");
  assert.equal(controller.store.getSnapshot().auth.status, "pending");
  assert.equal(controller.store.getSnapshot().error, null);
});

test("rescheduling while a poll is in flight does not create duplicate poll chains", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const response = Promise.withResolvers();
  let polls = 0;
  const controller = new DockyardClientController({ poll: () => { polls++; return response.promise; } });
  t.after(() => controller.dispose());
  controller.setState({ auth: pending });
  controller.scheduleAuth("antigravity", "old");
  t.mock.timers.tick(1000);
  controller.scheduleAuth("antigravity", "old");
  t.mock.timers.tick(1000);
  assert.equal(polls, 1);
  response.resolve({ snapshot, result: { ...pending, status: "completed" } });
  await setImmediate();
  assert.equal(controller.store.getSnapshot().auth, null);
  assert.equal(controller.authTimers.size, 0);
  assert.equal(controller.authPolling.size, 0);
});

test("a client wait timeout stays visible and leaves provider cancellation available", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const controller = new DockyardClientController({ poll: async () => ({ snapshot, result: pending }) });
  t.after(() => controller.dispose());
  controller.setState({ auth: pending });
  controller.scheduleAuth("antigravity", "old");
  t.mock.timers.tick(11 * 60 * 1000);
  await setImmediate();
  assert.equal(controller.store.getSnapshot().error, "status.oauthPollTimeout");
  assert.equal(controller.store.getSnapshot().auth.status, "pending");
  assert.equal(controller.store.getSnapshot().auth.sessionId, "old");
  assert.equal(controller.authTimers.size, 0);
  assert.equal(controller.authPolling.size, 0);
});

test("polling continues beyond three minutes and recovers from a transient RPC failure", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  let polls = 0;
  const controller = new DockyardClientController({ poll: async () => {
    polls++;
    if (polls === 1) throw new Error("temporary connection failure");
    return { snapshot, result: { ...pending, status: polls > 190 ? "completed" : "pending" } };
  } });
  t.after(() => controller.dispose());
  controller.setState({ auth: pending });
  controller.scheduleAuth("antigravity", "old");
  for (let i = 0; i < 191; i++) {
    t.mock.timers.tick(1000);
    await setImmediate();
  }
  assert.equal(polls, 191);
  assert.equal(controller.store.getSnapshot().auth, null);
  assert.equal(controller.store.getSnapshot().error, null);
});
