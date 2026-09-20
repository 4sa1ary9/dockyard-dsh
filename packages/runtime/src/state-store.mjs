import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 30_000;
const LOCK_STALE_MS = 120_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseLockOwner(value) {
  const [pidText, token] = String(value ?? "").trim().split(/\s+/, 2);
  const pid = Number(pidText);
  return Number.isInteger(pid) && pid > 0 && token ? { pid, token } : null;
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function removeLockIfOwned(lockPath, token) {
  try {
    const owner = parseLockOwner(await readFile(lockPath, "utf8"));
    if (!owner && !token) {
      await rm(lockPath, { force: true });
      return true;
    }
    if (owner?.token !== token) return false;
    await rm(lockPath, { force: true });
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function acquireFileLock(filePath) {
  const lockPath = `${filePath}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });

  while (true) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      const token = randomUUID();
      try {
        await handle.writeFile(`${process.pid} ${token}\n`, "utf8");
      } catch (error) {
        await handle.close().catch(() => {});
        await removeLockIfOwned(lockPath, token).catch(() => {});
        throw error;
      }
      let released = false;
      return async () => {
        if (released) return;
        released = true;
        await handle.close().catch(() => {});
        await removeLockIfOwned(lockPath, token).catch(() => {});
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const metadata = await stat(lockPath);
        if (Date.now() - metadata.mtimeMs > LOCK_STALE_MS) {
          const owner = parseLockOwner(await readFile(lockPath, "utf8").catch(() => ""));
          // Never steal a lock from a live process merely because its clock did
          // not advance while the machine slept or the process was suspended.
          // A unique owner token also prevents a late release from deleting a
          // replacement lock.
          if (!owner || !processIsAlive(owner.pid)) {
            await removeLockIfOwned(lockPath, owner?.token ?? "");
            continue;
          }
        }
      } catch (lockError) {
        if (lockError?.code !== "ENOENT") throw lockError;
        continue;
      }
      if (Date.now() >= deadline) {
        const timeout = new Error(`Timed out waiting for state file lock: ${filePath}`);
        timeout.code = "ELOCKTIMEOUT";
        throw timeout;
      }
      await delay(LOCK_RETRY_MS);
    }
  }
}

async function withFileLock(filePath, operation) {
  const release = await acquireFileLock(filePath);
  try {
    return await operation();
  } finally {
    await release();
  }
}

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
    // Corruption recovery archives the broken file; that mutation must not
    // race a concurrent writer's temp-file+rename commit, so read and recover
    // under the same cross-process lock the writer holds.
    return withFileLock(this.filePath, () => this.#loadUnlocked());
  }

  /**
   * Load without acquiring the file lock. Callers already holding the lock
   * (save/update) use this to avoid re-entrant lock acquisition.
   */
  async #loadUnlocked() {
    let raw;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return emptyState();
      throw error;
    }
    try {
      return this.#parse(raw);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      // The file may have been corrupt only momentarily: another process could
      // have committed a valid snapshot right after our read. Re-read once
      // under the lock before concluding the state is unrecoverable.
      try {
        raw = await readFile(this.filePath, "utf8");
        return this.#parse(raw);
      } catch (retryError) {
        if (retryError?.code === "ENOENT") return emptyState();
        if (!(retryError instanceof SyntaxError)) throw retryError;
      }
      // A corrupt state file must not brick the whole plugin at boot. Archive
      // the broken file and fall back to a fresh empty state so a later save
      // can rebuild the snapshot from the live account pool.
      const archivePath = `${this.filePath}.corrupted.${Date.now()}`;
      await rename(this.filePath, archivePath).catch(() => {});
      return emptyState();
    }
  }

  #parse(raw) {
    const parsed = JSON.parse(raw);
    return {
      ...emptyState(),
      ...parsed,
      pools: parsed?.pools && typeof parsed.pools === "object" ? parsed.pools : {},
    };
  }

  async save(state) {
    return withFileLock(this.filePath, async () => {
      // Callers may persist one namespace (for example nativeKeyPools). Merge
      // with the locked latest snapshot so another namespace is not erased.
      const current = await this.#loadUnlocked();
      return this.#write({ ...current, ...(state ?? {}) });
    });
  }

  async update(mutator) {
    if (typeof mutator !== "function") throw new TypeError("State update mutator must be a function");
    return withFileLock(this.filePath, async () => {
      const current = await this.#loadUnlocked();
      const next = await mutator(current);
      return this.#write(next);
    });
  }

  async #write(state) {
    const next = {
      ...emptyState(),
      ...state,
      updatedAt: new Date().toISOString(),
    };
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    let committed = false;
    try {
      await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
      // Crash consistency: fsync the temp file before the rename so the new
      // snapshot cannot be lost (or arrive half-written) after a power cut,
      // then fsync the directory so the rename itself is durable.
      const handle = await open(tempPath, "r+");
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(tempPath, this.filePath);
      committed = true;
      try {
        const directory = await open(dirname(this.filePath), "r");
        try {
          await directory.sync();
        } catch {
          // Some platforms/filesystems reject directory fsync; the file-level
          // sync above still bounds the loss window.
        } finally {
          await directory.close();
        }
      } catch {
        // Directory open/sync failures must never fail a successful save.
      }
      return next;
    } finally {
      if (!committed) await rm(tempPath, { force: true }).catch(() => {});
    }
  }
}
