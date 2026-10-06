import test from "node:test";
import assert from "node:assert/strict";

import { DockyardRemoteService, publicAuthResult } from "../packages/dsh-plugin/src/dockyard-remote-host.mjs";
import { TYPERT_DESCRIPTORS } from "../packages/dsh-plugin/src/dockyard-typert-shared.mjs";

test("publicAuthResult preserves manual-code metadata without exposing credentials", () => {
  const result = publicAuthResult({
    status: "pending",
    providerId: "claude",
    sessionId: "claude:browser:session",
    authorizationUrl: "https://claude.com/cai/oauth/authorize",
    authorizationCodeRequired: true,
    access_token: "must-not-cross-RPC",
    refresh_token: "must-not-cross-RPC",
  });

  assert.equal(result.authorizationCodeRequired, true);
  assert.equal(result.access_token, undefined);
  assert.equal(result.refresh_token, undefined);
  assert.deepEqual(Object.keys(result).sort(), [
    "authorizationCodeRequired",
    "authorizationUrl",
    "providerId",
    "sessionId",
    "status",
  ]);
});

test("login RPC preserves the explicit local browser fallback through its schema", async () => {
  const schema = TYPERT_DESCRIPTORS.find((entry) => entry.method === "login").parameters[0].codec.schema;
  for (const openBrowser of [undefined, false, true]) {
    const request = schema.parse({ providerId: "antigravity", ...(openBrowser === undefined ? {} : { openBrowser }) });
    let calls = 0;
    const response = await DockyardRemoteService.prototype.login.call({ dockyard: {
      startAuthorization: async (providerId, options) => {
        calls++;
        assert.equal(providerId, "antigravity");
        assert.deepEqual(options, { openBrowser: openBrowser === true });
        return { status: "pending", browserOpened: openBrowser === true };
      },
      snapshot: async () => ({ providers: [] }),
    } }, request);
    assert.equal(calls, 1);
    assert.equal(response.result.browserOpened === true, openBrowser === true);
  }
  assert.equal(schema.safeParse({ providerId: "antigravity", openBrowser: "true" }).success, false);
});

test("publicAuthResult preserves official terminal login feedback", () => {
  const result = publicAuthResult({
    status: "pending", providerId: "antigravity", terminalOpened: true,
    browserOpened: false, instructions: "请在官方终端完成登录", access_token: "private",
  });
  assert.equal(result.terminalOpened, true);
  assert.notEqual(result.browserOpened, true);
  assert.equal(result.instructions, "请在官方终端完成登录");
  assert.equal(result.access_token, undefined);
});
