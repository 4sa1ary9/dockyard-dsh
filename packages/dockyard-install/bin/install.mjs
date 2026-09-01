#!/usr/bin/env node

import { main } from "../src/install.mjs";

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`[dockyard-dsh] ${error?.message ?? error}`);
  process.exitCode = 1;
});
