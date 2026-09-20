# Dockyard DSH

[中文](README.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) account-pool plugin that attaches **Codex, Grok, Claude, Cursor, and Antigravity** subscriptions on Windows. A provider picker sits on the left of the composer.

This is not official. It is a **fork** of [AITabby/dockyard-dsh](https://github.com/AITabby/dockyard-dsh). Upstream v0.1.1 ships a macOS DMG; their Windows EXE is a separate release. This repository adds a Windows credential store and a Windows browser opener so the same composer picker can run inside existing `dsh web` on Windows 10 / 11.

Merged upstream `v0.1.1`.

Not affiliated with DeepSeek AI, OpenAI, xAI, Anthropic, Cursor, Google, or Amazon.

## Changes from upstream

- Windows secrets go to `%LOCALAPPDATA%\dockyard-dsh\secrets` under CurrentUser DPAPI instead of fail-closed writes.
- Login opens the system browser with `rundll32`.
- The nested package `prepare` script is removed so GitHub installs use the committed `dist/` and `lib/client.js`.
- DSH Credentials remain the preferred store when the host injects them; DPAPI is the Windows fallback, matching Keychain on macOS.

Linux still fail-closes, same as upstream.

## Requirements

Windows 10 / 11, Node.js `^22.19.0` or `>=24`, DeepSeek Harness (dependencies aligned with `0.1.6-alpha.2`, verified loading on `0.1.6-alpha.2`), and pnpm.

## Auth conditions

Use the Dockyard control next to the composer, or `/dockyard login <provider>`. Missing plans stay unavailable; Dockyard does not invent quota or models.

- **Codex** — ChatGPT plan with Codex. Browser OAuth (loopback PKCE) or scan `~\.codex\auth.json`. Not an OpenAI Platform API key.
- **Grok** — SuperGrok / X Premium entitled for xAI inference. Browser OAuth or scan `~\.grok\auth.json`.
- **Claude** — Claude subscription OAuth. Manual callback may need a full URL with `state`, or `code#state`.
- **Cursor** — official browser login poll; CLI is fallback.
- **Antigravity** — Google OAuth. Set `DOCKYARD_ANTIGRAVITY_CLIENT_ID` and `DOCKYARD_ANTIGRAVITY_CLIENT_SECRET`; nothing is bundled.

## Install

```powershell
npx @deepseek-ai/dsh plugin --profile web add github:4sa1ary9/dockyard-dsh
npx @deepseek-ai/dsh web
```

## Domestic coding-plan import

`/dockyard import` connects a mainland-China coding plan as a native DSH
API-key provider: the key goes into the DSH credential store, the `llm-pi-ai`
route is declared only when it is missing, and the models show up in
Settings → Models. The presets mirror the ones `dsh-AuthInOne` ships for the
same plans (same endpoint, same credential reference), so either plugin can
reuse what the other wrote.

| Preset id | Plan | Endpoint | Credential reference |
|---|---|---|---|
| `glm-coding-plan` | GLM Coding Plan (Zhipu BigModel) | `https://open.bigmodel.cn/api/coding/paas/v4` | `GLM_CODING_PLAN_API_KEY` |
| `kimi-code-plan` | Kimi Code (Moonshot) | `https://api.kimi.com/coding/v1` | `KIMI_CODE_PLAN_API_KEY` |
| `qwen-coding-plan` | ModelStudio Coding Plan (Alibaba Cloud) | `https://coding.dashscope.aliyuncs.com/v1` | `QWEN_CODING_PLAN_API_KEY` |

```text
/dockyard import                            list presets and their current state (reads no key)
/dockyard import glm-coding-plan <API key>  store the key and declare the route
/dockyard import glm-coding-plan            reuse an existing key under the same reference
```

The import merges: it only fills in the missing half, never rewrites an existing
route profile or key, and never touches sibling provider routes. Zhipu and
ModelStudio restrict their Coding Plans to supported coding tools and product
environments, so confirm your use is permitted first.

## License

[MIT](LICENSE). Upstream copyright remains with the original authors.
