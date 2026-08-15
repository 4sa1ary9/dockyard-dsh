import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
const outputPath = resolve(packageRoot, "lib/client.js");

const result = await build({
  entryPoints: [resolve(packageRoot, "src/dockyard-client.mjs")],
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: ["es2020"],
  external: [
    "react",
    "react/jsx-runtime",
    "@deepseek-ai/dsh-client-runtime/client",
  ],
  write: false,
  sourcemap: false,
  legalComments: "none",
});

const bundledCode = result.outputFiles[0].text;
const wrapper = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(packageJson.name)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${bundledCode}
    return module.exports;
  },
});
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, wrapper, "utf8");
console.log(`Dockyard DSH client bundle written: ${outputPath}`);
