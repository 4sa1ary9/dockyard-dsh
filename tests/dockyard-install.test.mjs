import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DSH_SPEC,
  DEFAULT_PLUGIN_SPEC,
  buildInstallPlan,
  nodeVersionSupported,
  parseArgs,
} from "../packages/dockyard-install/src/install.mjs";

test("installer defaults to the web profile and prebuilt plugin package", () => {
  const options = parseArgs([]);
  assert.equal(options.profile, "web");
  assert.equal(options.plugin, DEFAULT_PLUGIN_SPEC);
  assert.equal(options.dsh, DEFAULT_DSH_SPEC);
});

test("installer builds a self-contained bootstrap plan", () => {
  const plan = buildInstallPlan(parseArgs([]), { dshAvailable: false, pnpmAvailable: false });
  assert.deepEqual(plan, [
    { command: "npm", args: ["install", "--global", DEFAULT_DSH_SPEC] },
    { command: "npm", args: ["install", "--global", "pnpm"] },
    { command: "dsh", args: ["plugin", "--profile", "web", "add", DEFAULT_PLUGIN_SPEC] },
  ]);
});

test("installer accepts a custom profile and dry-run mode", () => {
  const options = parseArgs(["--profile", "work", "--dry-run"]);
  assert.equal(options.profile, "work");
  assert.equal(options.dryRun, true);
});

test("installer rejects unsafe profile names", () => {
  assert.throws(() => parseArgs(["--profile", "../web"]), /Profile name/);
});

test("installer enforces the DSH Node version floor", () => {
  assert.equal(nodeVersionSupported("22.18.0"), false);
  assert.equal(nodeVersionSupported("22.19.0"), true);
  assert.equal(nodeVersionSupported("24.0.0"), true);
  assert.equal(nodeVersionSupported("23.0.0"), false);
});
