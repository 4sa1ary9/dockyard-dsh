import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

// The browser bundle has to carry zod's validation messages without carrying
// all of zod: the `z` namespace drags in every locale and doubles the bundle.
test("typert schemas bundle for the browser without the zod namespace and keep their messages", async () => {
  const { outputFiles: [bundle] } = await build({
    stdin: {
      contents: 'export { TYPERT_DESCRIPTORS } from "./packages/dsh-plugin/src/dockyard-typert-shared.mjs";',
      resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    },
    bundle: true,
    platform: "browser",
    format: "cjs",
    write: false,
    logLevel: "silent",
  });
  const module = { exports: {} };
  new Function("module", "exports", bundle.text)(module, module.exports);
  const register = module.exports.TYPERT_DESCRIPTORS.find((entry) => entry.method === "nativeKeyRegister");
  const { error } = register.parameters[0].codec.schema.safeParse({ providerId: "", ref: "R", label: "x".repeat(121) });
  const messages = error.issues.map((issue) => issue.message);
  assert.equal(messages.length, 2);
  assert.ok(messages.every((message) => message !== "Invalid input"), messages.join(" | "));
  // About 150 kB with named imports, over 500 kB through the namespace.
  assert.ok(bundle.text.length < 250_000, `typert schema bundle is ${bundle.text.length} bytes`);
});
