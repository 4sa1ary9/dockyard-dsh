import test from "node:test";
import assert from "node:assert/strict";
import {
  AntigravityOfficialSessionDriver,
  createAntigravityInteractiveAuthorizer,
  launchAntigravityInteractiveTerminal,
} from "../modules/provider-antigravity/src/driver.mjs";
import { readAntigravityWindowsCredential } from "../modules/provider-antigravity/src/native-transport.mjs";

const credential = { token: "test-access", refreshToken: "test-refresh", expiresAt: "2099-01-01T00:00:00.000Z", email: "test@example.com" };

test("Windows reader uses the exact official credential target and preserves refresh data", () => {
  const result = readAntigravityWindowsCredential({
    execFileImpl: (command, args, options) => {
      assert.equal(command, "powershell.exe");
      assert.match(args.at(-1), /CredRead\("gemini:antigravity", 1, 0/);
      assert.doesNotMatch(args.at(-1), /CredEnumerate|CredWrite|CredDelete/);
      assert.equal(options.windowsHide, true);
      return JSON.stringify({ token: { access_token: credential.token, refresh_token: credential.refreshToken, expiry: credential.expiresAt } });
    },
  });
  assert.equal(result.token, credential.token);
  assert.equal(result.refreshToken, credential.refreshToken);
  assert.equal(result.expiresAt, credential.expiresAt);
  assert.equal(readAntigravityWindowsCredential({ execFileImpl: () => { throw new Error("not found"); } }), null);
});

test("official terminal launcher submits no model prompt and requests a visible window", async () => {
  let calls = 0;
  await launchAntigravityInteractiveTerminal({
    cliPath: "C:/test path/agy.exe",
    environment: { PATH: "test-path" },
    commandRunner: async (command, args, options) => {
      calls += 1;
      assert.equal(command, "powershell.exe");
      assert.match(args.at(-1), /Start-Process .* -WindowStyle Normal/);
      assert.doesNotMatch(args.at(-1), /-ArgumentList|-p |--print|Reply with OK/);
      assert.equal(options.env.DOCKYARD_ANTIGRAVITY_LOGIN_CLI, "C:/test path/agy.exe");
      assert.equal(options.env.PATH, "test-path");
      assert.equal(options.includeAccountInfo, true);
    },
  });
  assert.equal(calls, 1);
});

test("an existing official login imports into the pool without launching a terminal", async () => {
  const authorizer = createAntigravityInteractiveAuthorizer({
    tokenReader: () => credential,
    launchTerminal: () => { assert.fail("an authenticated account needs no terminal"); },
  });
  const result = await authorizer.begin({ accounts: [] });
  assert.equal(result.status, "completed");
  assert.equal(result.browserOpened, false);
  assert.equal(result.accounts[0].resources.sessionSource, "cli");
  assert.doesNotMatch(JSON.stringify(result), /test-access|test-refresh/);
  const writes = [];
  const driver = new AntigravityOfficialSessionDriver();
  const account = await driver.importAccount(result.accounts[0], {
    secretStore: { write: async (ref, value) => writes.push({ ref, value }) },
  });
  assert.equal(writes[0].ref, account.credentialRef);
  assert.equal(writes[0].value.access, credential.token);
  assert.equal(writes[0].value.refresh, credential.refreshToken);
});

test("interactive login waits for a fresh official credential then returns an importable account", async () => {
  let current = { ...credential, expiresAt: "2000-01-01T00:00:00.000Z" };
  let launches = 0;
  const authorizer = createAntigravityInteractiveAuthorizer({
    tokenReader: () => current,
    launchTerminal: async () => { launches += 1; },
  });
  const started = await authorizer.begin();
  assert.equal(started.status, "pending");
  assert.equal(started.terminalOpened, true);
  assert.equal(started.browserOpened, false);
  assert.match(started.instructions, /本机当前账号/);
  assert.equal((await authorizer.poll(started.sessionId)).status, "pending");
  current = credential;
  const completed = await authorizer.poll(started.sessionId);
  assert.equal(completed.status, "completed");
  assert.equal(completed.accounts.length, 1);
  assert.equal(launches, 1);
});

test("interactive terminal startup failure never reports a browser or terminal opened", async () => {
  const authorizer = createAntigravityInteractiveAuthorizer({
    tokenReader: () => null,
    launchTerminal: async () => { throw new Error("launcher missing"); },
  });
  const result = await authorizer.begin();
  assert.equal(result.status, "failed");
  assert.equal(result.browserOpened, false);
  assert.notEqual(result.terminalOpened, true);
  assert.match(result.diagnostic, /无法打开官方 agy 终端/);
});
