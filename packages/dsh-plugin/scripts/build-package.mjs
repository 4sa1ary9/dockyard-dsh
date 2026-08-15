import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const entryPoint = resolve(packageRoot, "src/index.mjs");
const outputPath = resolve(packageRoot, "dist/index.mjs");

await mkdir(dirname(outputPath), { recursive: true });
await build({
  entryPoints: [entryPoint],
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node20"],
  outfile: outputPath,
  absWorkingDir: repositoryRoot,
  external: [
    "@deepseek-ai/*",
    "@earendil-works/*",
    "react",
    "react/*",
    "zod",
  ],
  sourcemap: false,
  legalComments: "none",
});

await import("./build-client.mjs");
console.log(`Dockyard DSH plugin bundle written: ${outputPath}`);
