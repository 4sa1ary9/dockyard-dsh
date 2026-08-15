import assert from "node:assert/strict";
import test from "node:test";

import { apply } from "../packages/dsh-plugin/src/index.mjs";

test("DSH plugin cleanup waits for and disposes the native key pool", async () => {
  const effects = [];
  let disposed = false;
  const nativeKeyPool = {
    async start() {
      return this;
    },
    dispose() {
      disposed = true;
    },
  };
  const runtime = {
    async init() {},
  };
  const ctx = {
    llm: {
      registerAdapter() {},
    },
    commands: {
      register() {
        return () => {};
      },
    },
    get() {
      return undefined;
    },
    effect(effect) {
      effects.push(effect);
    },
  };

  apply(ctx, {
    runtime,
    providers: ["test-provider"],
    nativeKeyPool,
    serviceOptions: { autoRefresh: false },
  });

  assert.equal(effects.length, 2);
  effects[0]();
  const dispose = await effects[1]();
  await dispose();
  assert.equal(disposed, true);
});
