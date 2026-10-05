# Dockyard DSH

[中文](README.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) account-pool plugin that attaches **Codex, Grok, Claude, Cursor, and Antigravity** subscriptions on Windows. A provider picker sits on the left of the composer.

This is not official. It is a **fork** of [AITabby/dockyard-dsh](https://github.com/AITabby/dockyard-dsh). Upstream v0.1.1 ships a macOS DMG; their Windows EXE is a separate release. This repository adds a Windows credential store and a Windows browser opener so the same composer picker can run inside existing `dsh web` on Windows 10 / 11.

Synced upstream `main` at [`373d945`](https://github.com/AITabby/dockyard-dsh/commit/373d945fa52f7ebee6f2c5de6c8dc4315126d334) (2026-09-30). The latest upstream release tag remains `v0.1.1`.

Not affiliated with DeepSeek AI, OpenAI, xAI, Anthropic, Cursor, Google, or Amazon.

## Changes from upstream

- Windows secrets go to `%LOCALAPPDATA%\dockyard-dsh\secrets` under CurrentUser DPAPI instead of fail-closed writes.
- Login opens the system browser with `rundll32`.
- The nested package `prepare` script is removed so GitHub installs use the committed `dist/` and `lib/client.js`.
- DSH Credentials remain the preferred store when the host injects them; DPAPI is the Windows fallback, matching Keychain on macOS.

Linux still fail-closes, same as upstream.

## Requirements

Windows 10 / 11, Node.js `^22.19.0` or `>=24`, DeepSeek Harness (dependencies aligned with upstream `0.1.7-alpha.2`; loading was previously verified on `0.1.6-alpha.2`; this sync did not restart DSH or verify loading on the newer runtime), and pnpm.

## Auth conditions

Use the Dockyard control next to the composer, or `/dockyard login <provider>`. Missing plans stay unavailable; Dockyard does not invent quota or models.

- **Codex** — ChatGPT plan with Codex. Browser OAuth (loopback PKCE) or scan `~\.codex\auth.json`. Not an OpenAI Platform API key.
- **Grok** — SuperGrok / X Premium entitled for xAI inference. Browser OAuth or scan `~\.grok\auth.json`.
- **Claude** — Claude subscription OAuth. Manual callback may need a full URL with `state`, or `code#state`.
- **Cursor** — official browser login poll; CLI is fallback.
- **Antigravity** — direct Google browser OAuth with public installed-app configuration referenced from [LiZhenNet/dsh-antigravity](https://github.com/LiZhenNet/dsh-antigravity); see [third-party notice](modules/provider-antigravity/THIRD_PARTY_NOTICES.md). No local `agy` required. Override `DOCKYARD_ANTIGRAVITY_CLIENT_ID` and `DOCKYARD_ANTIGRAVITY_CLIENT_SECRET` together if needed, or explicitly use CLI login with `DOCKYARD_ANTIGRAVITY_BROWSER_OAUTH=0`. A blocked blank popup on the local desktop uses the Host's system-browser launcher; remote Web clients retain a manual link. Callback-port failures remain visible instead of silently importing another local account. Google account eligibility is still required.

The packaged desktop origin `dsh-app://app/` is recognized as local. Ended sessions discard stale links and offer **Start a new authorization**. Host and UI polling share the terminal result instead of turning a completed login into a missing-session error. After updating the Host bundle, fully quit and reopen DSH; closing the account panel or toggling the plugin does not guarantee module-cache invalidation.

## Install

```powershell
npx @deepseek-ai/dsh plugin --profile web add github:4sa1ary9/dockyard-dsh
npx @deepseek-ai/dsh web
```

## UI preview

The provider popup follows the DSH `--dsw-*` design tokens in light and dark. To look at it without starting DSH:

```powershell
pnpm run build:plugin
node scripts/preview-client.mjs
```

Open `http://127.0.0.1:4173/?theme=dark&lang=en&scenario=default`. The page uses in-memory fixture accounts and never reads or writes real credentials. Tokens come from the globally installed DSH theme, with the plugin's fallbacks when it is missing; ReactDOM is loaded from unpkg, so it needs network access.

## License

[MIT](LICENSE). Upstream copyright remains with the original authors.
