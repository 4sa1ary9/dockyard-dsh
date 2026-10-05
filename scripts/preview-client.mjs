// Standalone preview of the browser client. Serves the built bundle together
// with a mock DSH host (scripts/preview/index.html), so the account control
// can be exercised with fixture accounts and without touching a running DSH.
//
//   node packages/dsh-plugin/scripts/build-client.mjs && node scripts/preview-client.mjs
//   open http://127.0.0.1:4173/?theme=dark&lang=zh&scenario=default
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 4173);
const reactVersion = JSON.parse(readFileSync(join(root, "node_modules/react/package.json"), "utf8")).version;

// The host's --dsw-* tokens come from the installed DSH theme, so the preview
// follows the real palette. Without it the plugin's own fallbacks render,
// which is also how an older host without these tokens looks.
function themeCss() {
  try {
    const client = process.env.DSH_THEME_CLIENT ?? join(
      execSync("npm root -g", { encoding: "utf8" }).trim(),
      "@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js",
    );
    const sheets = [...readFileSync(client, "utf8").matchAll(/var \w+_css_default = ("(?:[^"\\]|\\.)*");/g)];
    return sheets.map(([, literal]) => JSON.parse(literal)).join("\n");
  } catch (error) {
    console.warn(`DSH theme not found, using the plugin's fallback colours: ${error.message}`);
    return "";
  }
}

const routes = {
  "/": () => ["text/html; charset=utf-8", readFileSync(join(root, "scripts/preview/index.html"), "utf8").replaceAll("__REACT_VERSION__", reactVersion)],
  "/client.js": () => ["text/javascript; charset=utf-8", readFileSync(join(root, "packages/dsh-plugin/lib/client.js"))],
  "/react.js": () => ["text/javascript; charset=utf-8", readFileSync(join(root, "node_modules/react/umd/react.development.js"))],
  "/theme.css": () => ["text/css; charset=utf-8", themeCss()],
  "/oauth": () => ["text/html; charset=utf-8", "<!doctype html><meta charset=utf-8><title>Fixture OAuth</title><p>Fixture authorization page. Close this window.</p>"],
};

createServer((request, response) => {
  const route = routes[new URL(request.url, "http://localhost").pathname];
  if (!route) {
    response.writeHead(404).end();
    return;
  }
  try {
    const [type, body] = route();
    response.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end(String(error?.message ?? error));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Dockyard client preview: http://127.0.0.1:${port}/?theme=dark&lang=zh&scenario=default`);
});
