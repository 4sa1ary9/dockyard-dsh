# DSH integration

Dockyard DSH is a DSH-native plugin. The source entry is `packages/dsh-plugin/src/index.mjs`; the release entry is the bundled `packages/dsh-plugin/dist/index.mjs`. Both expose one shared `DockyardDshService` as `ctx.dockyard`, register the provider-neutral LLM adapter, and add the `/dockyard` human command through `ctx.commands`.

There is one source of truth inside the DSH process. The command service, model picker, and generation adapter all read the same runtime; none of them owns a second credential store, model list, quota cache, or account selector. A DSH stream goes through:

```text
DSH GenerateOptions
  -> Dockyard DSH adapter
  -> AccountPool policy
  -> provider module
  -> provider-native OAuth transport
```

The native command surface is:

```text
/dockyard status
/dockyard scan [provider]
/dockyard add [provider] [candidateId]
/dockyard login <provider>
/dockyard refresh [provider]
/dockyard models <provider>
/dockyard policy <provider> <manual|sticky_session|round_robin|failover> [accountId]
/dockyard use <provider> <accountId>
```

`/dockyard login` runs the provider-owned official OAuth command. Codex uses an isolated temporary profile; Grok uses the official CLI's real `GROK_HOME` profile so the CLI's completed OAuth state is imported from its normal `auth.json`; Claude uses `claude auth login --claudeai`; Cursor uses `cursor-agent login` when that CLI is installed, or reads the active OAuth session from the official Cursor.app when it is not. Completed states are imported into macOS Keychain or the provider's official session store and the account pool automatically. Antigravity has no independent official OAuth command in the installed CLI, so it is discovered from the official local session and must be logged in or switched through that official client first. The Dockyard popup then scans the current identity, shows the returned email when available, and otherwise shows a non-reversible session fingerprint before adding it to the pool.

`/dockyard status` reports `quota.updatedAt` for quota freshness and separately reports OAuth token refresh fields. The background refresh interval is configurable with `DOCKYARD_DSH_REFRESH_INTERVAL_MS`.

The Codex module uses the locally imported OAuth account and the native Codex Responses transport when the DSH pi-ai dependencies are present. Antigravity exposes official CLI discovery, quota, credits, and live model catalog, while generation uses the provider's native Gemini `streamGenerateContent?alt=sse` transport. Claude, Cursor, and Grok use their provider-native streaming adapters. Claude/Cursor quota is only shown when their status output contains real windows; Grok's public CLI currently has no dependable subscription quota JSON, so Dockyard leaves that field unknown.

Claude and Cursor account records are deliberately marked as active official sessions: their official CLIs or desktop clients expose the current keychain/session, not a portable multi-account credential import API. The runtime therefore refuses to send a stored stale descriptor as if it were another account. Re-authorize the desired account in the official environment, then use `/dockyard scan <provider>` and `/dockyard add <provider>`.

## Isolated local profile test

Do not change the normal DSH profile while testing. Install the local bundle into a temporary profile/home, then boot that profile:

```sh
DSH_HOME=/tmp/dockyard-dsh-home dsh plugin --profile dockyard-test add /Users/aitabby/projects/Dockyard\ DSH
DSH_HOME=/tmp/dockyard-dsh-home dsh --profile dockyard-test
```

The repository root and `packages/dsh-plugin` both expose the same `@dockyard-dsh/plugin@0.1.0` bundle. `npm run build:plugin` produces the self-contained Node entry and browser client bundle; `npm pack --dry-run` should show only the release entry, client bundle, patch file, and package metadata. GitHub/npm installs use the prebuilt entry or the package `prepare` script.

The local visual host is optional and independent:

```sh
cd "/Users/aitabby/projects/Dockyard DSH"
DOCKYARD_DSH_OPEN=1 npm run dev
```

Open `http://127.0.0.1:8787/` only when a visual diagnostic surface is useful. It calls the same Dockyard runtime and is not required for adding accounts, switching accounts, refreshing quotas, or selecting models.

The local page binds to loopback by default. Non-loopback binding is refused unless both `DOCKYARD_DSH_ALLOW_REMOTE=1` and `DOCKYARD_DSH_REMOTE_TOKEN` are set; remote API calls must send `Authorization: Bearer <token>`. Put remote access behind HTTPS or a trusted tunnel because the built-in page server is HTTP-only.
