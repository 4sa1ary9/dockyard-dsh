import test from "node:test";
import assert from "node:assert/strict";

import { publicAuthResult } from "../packages/dsh-plugin/src/dockyard-remote-host.mjs";

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
