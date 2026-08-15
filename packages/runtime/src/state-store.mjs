import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

export function defaultDockyardHome({ env = process.env, home = homedir() } = {}) {
  return env.DOCKYARD_DSH_HOME || join(home, ".dockyard-dsh");
}

export function defaultDockyardStatePath(options = {}) {
  return join(defaultDockyardHome(options), "state.json");
}

function emptyState() {
  return {
    schema: 1,
    pools: {},
    updatedAt: null,
  };
}

export class JsonStateStore {
  constructor({ filePath, home, env } = {}) {
    this.filePath = filePath ?? defaultDockyardStatePath({ home, env });
  }

  async load() {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        ...emptyState(),
        ...parsed,
        pools: parsed?.pools && typeof parsed.pools === "object" ? parsed.pools : {},
      };
    } catch (error) {
      if (error?.code === "ENOENT") return emptyState();
      throw error;
    }
  }

  async save(state) {
    const next = {
      ...emptyState(),
      ...state,
      updatedAt: new Date().toISOString(),
    };
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    await rename(tempPath, this.filePath);
    return next;
  }
}
