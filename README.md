# Dockyard DSH

**A macOS-only account-pool and native provider plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).**

[中文](#中文) · [English](#english)

> **Current status / 当前状态:** Developer preview · **macOS only** · Windows is not supported or verified in this release.

## 中文

### Dockyard DSH 是什么

Dockyard DSH 把多个官方 OAuth / 官方 CLI 会话接入 DeepSeek Harness，提供一个统一的账号池、模型目录、额度状态和 provider-native 请求入口。它是 DSH 的原生 bundle/plugin，不需要另起一个代理网关，也不把 provider 逻辑塞进 DSH 核心。

当前包含的 provider 模块：

- **Codex** — 官方 OAuth 会话和原生 Responses 请求链路。
- **Antigravity** — 官方本机会话、实时模型目录、额度/credits 和原生 Gemini SSE 请求链路。
- **Grok** — 官方 OAuth CLI、实时模型目录和 provider-native streaming 请求。
- **Claude** — `claude` 官方 CLI 的订阅 OAuth 会话与原生请求适配。
- **Cursor** — `cursor-agent` 或 Cursor.app 的官方 active session 与原生请求适配。

如果对应的官方 CLI 或桌面端没有安装、没有登录，Dockyard 会返回明确的 unavailable/degraded 状态；不会用硬编码的账号、模型、版本、套餐或额度伪造可用结果。

### 主要功能

- 在 DSH 内使用 `/dockyard` 命令管理账号和 provider。
- 启动 provider 自己的官方 OAuth 登录流程，并将完成的会话安全导入账号池。
- 扫描本机已有的官方登录态；扫描和新增账号是两个独立操作。
- 支持手动选择、sticky session、round-robin 和 failover 账号池策略。
- 读取 provider 返回的实时模型目录、推理档位、套餐和额度窗口。
- 所有命令、模型选择和 LLM 生成都读取同一个 Dockyard runtime，不维护第二套账号池或额度缓存。
- 可选的本地可视化页面用于观察状态；正式使用不依赖该页面。

### 平台支持：当前仅 macOS

**当前发布版本只支持 macOS。Windows 不是受支持的平台，也没有经过完整验证。**

原因是当前完整功能依赖 macOS 原生能力和 macOS 官方客户端状态：

- 凭据存储使用 macOS Keychain 和 Swift helper。
- 本地 OAuth 页面使用 macOS 的 `/usr/bin/open` 打开授权页面。
- Cursor、Antigravity 等 provider 会读取 macOS 官方桌面端或本机 CLI 的会话状态。
- 当前没有 Windows credential-store backend、Windows 原生 OAuth 启动器和 Windows 打包验证。

纯 JavaScript 的部分未来可以继续做跨平台抽象，但本仓库当前不能宣传为 macOS/Windows 通用。如果你使用 Windows，请等待 Windows backend 和真实 E2E 验证完成。

### 安装前提：先安装 DSH，再克隆 Dockyard DSH

Dockyard DSH 是 DSH plugin，不是独立的 agent。请先安装 DSH CLI，并确认 `dsh` 命令可用。

当前上游 DSH CLI 的 npm 安装方式：

```sh
# DSH 当前是 developer preview；请使用上游要求的 Node.js 版本。
# 当前上游 package.json 要求 Node 22.19+ 的 22.x，或 Node 24+。
npm install --global @deepseek-ai/dsh
dsh --version
```

上游安装和兼容性变化以 [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness) 为准。

#### 最稳妥的方式：克隆后安装

```sh
git clone https://github.com/AITabby/dockyard-dsh.git
cd dockyard-dsh

# 安装仓库依赖；prepare 会生成/刷新可分发 bundle。
npm install

# 推荐先做一次本地验证。
npm test
npm run build
```

把本地 checkout 安装到一个隔离的 DSH profile：

```sh
DSH_HOME=/tmp/dockyard-dsh-home dsh plugin --profile dockyard-dsh add .
DSH_HOME=/tmp/dockyard-dsh-home dsh --profile dockyard-dsh --dump-config
DSH_HOME=/tmp/dockyard-dsh-home dsh --profile dockyard-dsh
```

验证通过后，日常使用可以省略临时 `DSH_HOME`，直接安装到默认 DSH home：

```sh
dsh plugin --profile dockyard-dsh add .
dsh --profile dockyard-dsh
```

首次运行建议保留 `--dump-config`，确认配置中出现 `@dockyard-dsh/plugin` bundle。

#### 更简单的方式：不克隆，直接从 GitHub 安装

仓库公开后，可以直接让 DSH 从 GitHub 安装：

```sh
dsh plugin --profile dockyard-dsh add github:AITabby/dockyard-dsh
dsh --profile dockyard-dsh
```

如需固定到某一次提交，使用：

```sh
dsh plugin --profile dockyard-dsh add github:AITabby/dockyard-dsh#<commit-sha>
```

GitHub 直装最短，但 DSH 使用 pnpm 安装 git dependency 时，可能会提示允许执行该包的 `prepare`。这是安装器对远程代码执行的安全确认：请先阅读源码，只对信任的版本允许构建，再按终端输出把准确的包名加入对应 profile 的 `pnpm-workspace.yaml`，通常形如：

```yaml
allowBuilds:
  '@dockyard-dsh/plugin': true
```

如果你不想处理这个确认，使用上面的“克隆后安装”方式最简单、最可控。本仓库会提交已经生成的 `packages/dsh-plugin/dist/index.mjs` 和 `packages/dsh-plugin/lib/client.js`，确保 checkout 本身包含可运行的发布入口。

### DSH 内的命令

在运行中的 DSH profile 中：

```text
/dockyard status
/dockyard scan [provider]
/dockyard add [provider] [candidateId]
/dockyard login <provider>
/dockyard refresh [provider]
/dockyard models <provider>
/dockyard policy <provider> <manual|sticky_session|round_robin|failover> [accountId]
/dockyard use <provider> <accountId>
/dockyard remove <provider> <accountId>
```

常见流程是：先 `/dockyard login <provider>` 或 `/dockyard scan <provider>`，再 `/dockyard add <provider>`，最后用 `/dockyard status` 和 `/dockyard models <provider>` 检查实时状态。

### 官方 CLI / active session 边界

- **Claude**：使用 `claude auth login --claudeai` 和 `claude auth status --json`。官方没有返回真实额度窗口时，Dockyard 显示未知，不估算百分比。
- **Cursor**：优先使用 `cursor-agent login`、`cursor-agent status` 和官方 streaming 接口；也可读取 Cursor.app 的 active OAuth session。官方客户端没有提供的模型或额度不会被硬编码。
- **Antigravity**：从官方本机会话发现账号。若官方 CLI 没有返回邮箱，会使用不可逆本机会话指纹区分候选账号；切换 Google 账号后需要重新扫描。
- **Grok**：使用官方 `grok login --oauth`、`grok models` 和 streaming JSON；请求使用短生命周期的官方 CLI profile，完成后清理临时文件。
- **Claude / Cursor 的账号池**：官方 CLI/客户端通常只暴露当前 active session，不提供可离线切换的便携凭据。Dockyard 不会把旧的 session 描述伪装成另一个可用账号；切换账号要先在官方环境重新授权，再扫描和刷新。

### 凭据和安全边界

- 原始 OAuth/token 不写入 Git、账号池快照或页面状态；运行时只传递 opaque credential reference。
- macOS 默认使用 Keychain；非 macOS 默认 credential store 会 fail closed，不会静默退回不安全的内存存储。
- 本地页面默认只监听 `127.0.0.1`。远程绑定必须显式设置 `DOCKYARD_DSH_ALLOW_REMOTE=1` 和 `DOCKYARD_DSH_REMOTE_TOKEN`，并使用 `Authorization: Bearer ...`。
- 额度、模型、套餐、账号身份和过期时间都来自 provider 的实时结果；provider 不返回时保持 `unknown`/`null`。
- 发布和提 issue 前请阅读 [`SECURITY.md`](SECURITY.md)，不要提交 token、OAuth 文件、Keychain 值或包含敏感信息的日志。

### 可选的本地可视化页面

本地页面只是调试/观察界面，不是 DSH plugin 的运行前提：

```sh
npm run dev
open http://127.0.0.1:8787/
```

页面和 DSH 命令读取同一个 runtime；它不会创建第二套账号池、模型目录或额度数据源。

### 开发与验证

```sh
npm install
npm test
npm run build
npm run build:plugin
npm pack --dry-run
```

发布包的关键内容是：

```text
packages/dsh-plugin/dist/index.mjs   # Node/host bundle
packages/dsh-plugin/lib/client.js    # browser client bundle
packages/dsh-plugin/cordis.patch.yml # DSH bundle layer
```

`npm pack --dry-run` 应只显示发布入口、client bundle、patch、必要的 package metadata 和安全说明。修改 provider source 后，重新执行 `npm run build`，再提交更新后的构建产物。

### 项目结构

```text
packages/core/              模块生命周期、契约、事件和 DSH route
packages/account-pool/      账号发现、选择、健康状态和 credential reference
packages/runtime/           一个共享的 Dockyard runtime
packages/dsh-plugin/        DSH bundle、LLM adapter、命令和 client UI
packages/vault/             macOS Keychain backend
modules/provider-*/         各 provider 自己的 OAuth、目录、额度和 native transport
apps/local-page/            可选的 loopback 调试页面
tests/                      安全、生命周期、provider 和 runtime 测试
```

核心原则是：provider-specific 逻辑留在 provider module，账号选择留在 runtime，host 只消费稳定契约。不要在 host 中新增 provider 特判，也不要把动态 provider 数据写成常量。

### 已知限制

- DSH 本身仍处于 developer preview，上游可能发生 breaking changes。
- provider 的官方 CLI、客户端路径、OAuth 返回字段和额度接口都可能变化；Dockyard 对缺失字段保持未知。
- Claude 和 Cursor 的“多账号”能力受官方 active session API 限制，不等同于可以离线保存任意数量的完整凭据。
- Windows 当前不支持；请勿把本版本用于 Windows 生产环境。

## English

### What it is

Dockyard DSH is a native DeepSeek Harness bundle/plugin that connects official OAuth and official CLI sessions to one shared account pool, model catalog, quota view, and provider-native request path. It does not require a second proxy gateway and it does not put provider-specific branches into the DSH core.

Current provider modules:

- **Codex** — official OAuth session and native Responses transport.
- **Antigravity** — official local session, live model catalog, quota/credits, and native Gemini SSE transport.
- **Grok** — official OAuth CLI, live model catalog, and provider-native streaming.
- **Claude** — subscription OAuth session and native request adapter through the official `claude` CLI.
- **Cursor** — official active session from `cursor-agent` or Cursor.app.

When an official CLI or desktop client is missing or not signed in, Dockyard reports an explicit unavailable/degraded state. It does not invent accounts, models, versions, plans, or quota values.

### Features

- Manage providers and accounts from DSH's `/dockyard` command surface.
- Start provider-owned OAuth flows and securely import completed sessions into the account pool.
- Scan existing official login states separately from adding a new account.
- Select accounts manually or with sticky-session, round-robin, or failover policies.
- Read live provider model catalogs, reasoning tiers, plans, and quota windows.
- Keep commands, model selection, and generation on the same Dockyard runtime and source of truth.
- Use an optional local visual page for diagnostics; the page is not required for normal DSH operation.

### Platform support: macOS only

**This release supports macOS only. Windows is not supported and has not been fully verified.**

The complete integration currently depends on macOS-specific behavior:

- Credentials use the macOS Keychain and a Swift helper.
- The local OAuth page opens authorization URLs through macOS `/usr/bin/open`.
- Cursor and Antigravity integrations read macOS desktop or local CLI session state.
- There is no Windows credential-store backend, Windows-native OAuth launcher, or Windows packaging/E2E validation in this release.

Some pure JavaScript layers can be abstracted for other platforms later, but this repository must currently be treated as a macOS-only plugin.

### Prerequisite: install DSH before cloning

Dockyard DSH is a DSH plugin, not a standalone agent. Install the DSH CLI first and verify that the `dsh` command is available:

```sh
# DSH is currently a developer preview. Use the Node.js version required by DSH.
# The current upstream package declares Node 22.19+ on the 22.x line, or Node 24+.
npm install --global @deepseek-ai/dsh
dsh --version
```

Follow the [official DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness) for upstream installation and compatibility changes.

#### Recommended: clone and install

```sh
git clone https://github.com/AITabby/dockyard-dsh.git
cd dockyard-dsh
npm install
npm test
npm run build
```

Install the checkout into an isolated profile first:

```sh
DSH_HOME=/tmp/dockyard-dsh-home dsh plugin --profile dockyard-dsh add .
DSH_HOME=/tmp/dockyard-dsh-home dsh --profile dockyard-dsh --dump-config
DSH_HOME=/tmp/dockyard-dsh-home dsh --profile dockyard-dsh
```

After verification, omit the temporary `DSH_HOME` to use the default DSH home:

```sh
dsh plugin --profile dockyard-dsh add .
dsh --profile dockyard-dsh
```

#### Shortest path: install directly from GitHub

Once the repository is public, DSH can install it without a manual clone:

```sh
dsh plugin --profile dockyard-dsh add github:AITabby/dockyard-dsh
dsh --profile dockyard-dsh
```

For a reproducible install, pin a commit:

```sh
dsh plugin --profile dockyard-dsh add github:AITabby/dockyard-dsh#<commit-sha>
```

Because a GitHub install is a pnpm git dependency, DSH may ask for permission to run the package's `prepare` script. Review the source and allow the exact package key printed by pnpm, usually:

```yaml
allowBuilds:
  '@dockyard-dsh/plugin': true
```

If you want to avoid that prompt, clone the repository and run `npm install` instead. The repository intentionally carries the generated `packages/dsh-plugin/dist/index.mjs` and `packages/dsh-plugin/lib/client.js` artifacts so a checkout contains the runnable release entry points.

### DSH commands

```text
/dockyard status
/dockyard scan [provider]
/dockyard add [provider] [candidateId]
/dockyard login <provider>
/dockyard refresh [provider]
/dockyard models <provider>
/dockyard policy <provider> <manual|sticky_session|round_robin|failover> [accountId]
/dockyard use <provider> <accountId>
/dockyard remove <provider> <accountId>
```

A typical flow is `/dockyard login <provider>` or `/dockyard scan <provider>`, then `/dockyard add <provider>`, followed by `/dockyard status` and `/dockyard models <provider>`.

### Official CLI and active-session boundaries

Claude uses `claude auth login --claudeai` and `claude auth status --json`. Cursor prefers `cursor-agent login`, `cursor-agent status`, and its official streaming interface, with Cursor.app active-session discovery as a fallback. Antigravity discovers the official local session and uses an irreversible local session fingerprint when the official CLI does not return an email. Grok uses `grok login --oauth`, `grok models`, and streaming JSON with a short-lived official CLI profile.

Claude and Cursor generally expose only the current official active session rather than a portable multi-account credential API. Dockyard does not pretend that a stale session descriptor is another usable account; re-authorize the desired account in the official environment, then scan and refresh it.

### Credentials and security

- Raw OAuth/token values are not stored in Git, account-pool snapshots, or page state; the runtime uses opaque credential references.
- macOS uses Keychain by default. Non-macOS defaults fail closed instead of silently falling back to an unsafe in-memory store.
- The local page binds to `127.0.0.1` by default. Remote binding requires both `DOCKYARD_DSH_ALLOW_REMOTE=1` and `DOCKYARD_DSH_REMOTE_TOKEN`, plus `Authorization: Bearer ...` on remote API calls.
- Provider models, plans, quotas, identities, and expiry values come from live provider responses; missing values remain `unknown`/`null`.
- Read [`SECURITY.md`](SECURITY.md) before filing issues. Never commit tokens, OAuth files, Keychain values, or sensitive logs.

### Optional local visual page

```sh
npm run dev
open http://127.0.0.1:8787/
```

This page is an optional diagnostic surface. It reads the same runtime as the DSH commands and is not a second account, model, or quota data source.

### Development and verification

```sh
npm install
npm test
npm run build
npm run build:plugin
npm pack --dry-run
```

The distributable entry points are:

```text
packages/dsh-plugin/dist/index.mjs   # Node/host bundle
packages/dsh-plugin/lib/client.js    # browser client bundle
packages/dsh-plugin/cordis.patch.yml # DSH bundle layer
```

After changing provider source, run `npm run build` and commit the refreshed artifacts together with the source change.

### Project layout

```text
packages/core/              lifecycle, contracts, events, and DSH routes
packages/account-pool/      account discovery, selection, health, and references
packages/runtime/           the shared Dockyard runtime
packages/dsh-plugin/        DSH bundle, LLM adapter, commands, and client UI
packages/vault/             macOS Keychain backend
modules/provider-*/         provider OAuth, catalog, quota, and native transport
apps/local-page/            optional loopback diagnostic page
tests/                      security, lifecycle, provider, and runtime tests
```

The core rule is simple: provider-specific logic stays in provider modules, account selection stays in the runtime, and hosts consume stable contracts. Do not add provider-specific branches to a host or hard-code dynamic provider data.

### Known limitations

- DeepSeek Harness is still a developer preview and may introduce breaking changes.
- Official provider CLIs, desktop paths, OAuth fields, and quota APIs can change; missing fields remain unknown.
- Claude and Cursor account-pool behavior is constrained by official active-session APIs and is not equivalent to offline storage of arbitrary credentials.
- Windows is not supported in this release.
