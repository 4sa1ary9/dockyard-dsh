import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DOCKYARD_LOCALES } from "../packages/dsh-plugin/src/dockyard-locale.mjs";

const CLIENT_SOURCES = ["dockyard-client.mjs", "native-key-pool.mjs", "quota-display.mjs", "model-selection.mjs"];

// A key missing from a dictionary renders as the raw key in the UI.
test("zh and en define the same keys, and every key the client names exists", async () => {
  const { zh, en } = DOCKYARD_LOCALES;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());

  const sources = (await Promise.all(CLIENT_SOURCES.map((name) => (
    readFile(new URL(`../packages/dsh-plugin/src/${name}`, import.meta.url), "utf8")
  )))).join("\n");
  const namespaces = [...new Set(Object.keys(zh).map((key) => key.split(".")[0]))].join("|");
  const named = new Set([...sources.matchAll(new RegExp(`"((?:${namespaces})\\.[\\w.-]+)"`, "g"))].map((match) => match[1]));
  // "settings.section" is a DSH slot name, not a dictionary key.
  named.delete("settings.section");
  assert.deepEqual([...named].filter((key) => !Object.hasOwn(zh, key)), []);
});
