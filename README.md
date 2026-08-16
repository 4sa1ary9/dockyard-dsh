# Dockyard DSH

**A macOS-only account-pool and native provider plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).**

[中文](#中文) · [English](#english)

> **Current status / 当前状态:** Developer preview · **macOS only** · Windows is not supported or verified in this release.

## 中文

### Dockyard DSH 是什么

Dockyard DSH 把多个官方 OAuth / 官方客户端会话接入 DeepSeek Harness，提供一个统一的账号池、模型目录、额度状态和 provider-native 请求入口。它是 DSH 的原生 bundle/plugin，不需要另起一个代理网关，也不把 provider 逻辑塞进 DSH 核心。

当前包含的 provider 模块：

- **Codex** — 官方浏览器 OAuth、CLI fallback 和原生 Responses 请求链路。
- **Antigravity** — Google 官方浏览器 OAuth、官方本机会话、实时模型目录、额度/credits 和原生 Gemini SSE 请求链路。
- **Grok** — xAI 官方浏览器 OAuth、CLI fallback、实时模型目录、官方 Build credits 周期和 provider-native streaming 请求。额度读取使用官方 `/billing?format=credits`（转发 `GetGrokCreditsConfig`）；若上游只返回周期，剩余值保持未知。
- **Claude** — Claude 官方浏览器 OAuth（支持带 state 的手动回调地址/授权码）、CLI fallback 与原生请求适配。
- **Cursor** — Cursor 官方浏览器登录轮询、CLI fallback 与原生请求适配。

如果对应的官方客户端、CLI 或 OAuth 源没有安装、没有登录，Dockyard 会返回明确的 unavailable/degraded 状态；不会用硬编码的账号、模型、版本、套餐或额度伪造可用结果。

### 主要功能

- 在 DSH 内使用 `/dockyard` 命令管理账号和 provider。
- 点击“登录添加账号”直接打开 provider 官方浏览器授权页，选择账号并安全导入账号池；provider 不可用时保留 CLI fallback。
- 扫描本机已有的官方登录态；扫描和新增账号是两个独立操作，已有账号不会被“新增”静默重复导入。
- 支持手动选择、sticky session、round-robin 和 failover 账号池策略。
- 读取 provider 返回的实时模型目录、推理档位、套餐和额度窗口。
- 所有命令、模型选择和 LLM 生成都读取同一个 Dockyard runtime，不维护第二套账号池或额度缓存。

### 平台支持：当前仅 macOS

**当前发布版本只支持 macOS。Windows 不是受支持的平台，也没有经过完整验证。**

原因是当前完整功能依赖 macOS 原生能力和 macOS 官方客户端状态：

- 凭据存储使用 macOS Keychain 和 Swift helper。
- 浏览器 OAuth 由 DSH GUI 打开 provider 官方授权页面，并使用 PKCE、state 校验和 loopback/manual-code 回调；CLI fallback 才使用官方 CLI。
- 扫描模式仍可读取 Cursor、Antigravity 等 provider 的 macOS 官方桌面端或本机 CLI 会话状态。
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

新增账号流程是 `/dockyard login <provider>`（直接打开官方浏览器 OAuth）；如果要导入已有本机登录态，则使用 `/dockyard scan <provider>` 后再 `/dockyard add <provider>`，最后用 `/dockyard status` 和 `/dockyard models <provider>` 检查实时状态。

### 官方浏览器 OAuth / active session 边界

- **Codex、Antigravity、Grok、Claude、Cursor** 的“登录添加账号”默认由 DSH 直接打开官方浏览器授权页，不要求本机先安装 CLI；CLI 仅作为兼容性 fallback。
- Codex 使用 loopback PKCE；Antigravity 使用 Google loopback OAuth；Grok 使用 xAI loopback OAuth；Cursor 使用官方 `loginDeepControl` + `/auth/poll`；Claude 使用官方网页回调，手动输入时要求粘贴带 `state` 的完整回调地址或 `code#state`。
- Antigravity 的 Google OAuth client ID/secret 必须通过 `DOCKYARD_ANTIGRAVITY_CLIENT_ID` 和 `DOCKYARD_ANTIGRAVITY_CLIENT_SECRET` 提供，仓库不内置凭据。
- **扫描**仍可读取本机已有的官方客户端/CLI 会话；扫描和浏览器新增账号不会互相替代。
- provider 的 OAuth endpoint、token response 或授权范围变化时，Dockyard 会显示 unavailable/degraded，不猜测未验证的字段。

### 凭据和安全边界

- 原始 OAuth/token 不写入 Git、账号池快照或页面状态；运行时只传递 opaque credential reference。
- 浏览器 OAuth 的 refresh token 持久化在安全凭据存储中；支持 refresh 的 provider 会在重启后自动刷新短期 access token，只有 provider 撤销 refresh token 或改变协议时才需要重新授权。
- macOS 默认使用 Keychain；非 macOS 默认 credential store 会 fail closed，不会静默退回不安全的内存存储。
- 额度、模型、套餐、账号身份和过期时间都来自 provider 的实时结果；provider 不返回时保持 `unknown`/`null`。
- 发布和提 issue 前请阅读 [`SECURITY.md`](SECURITY.md)，不要提交 token、OAuth 文件、Keychain 值或包含敏感信息的日志。

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
tests/                      安全、生命周期、provider 和 runtime 测试
```

核心原则是：provider-specific 逻辑留在 provider module，账号选择留在 runtime，host 只消费稳定契约。不要在 host 中新增 provider 特判，也不要把动态 provider 数据写成常量。

### 已知限制

- DSH 本身仍处于 developer preview，上游可能发生 breaking changes。
- provider 的官方 CLI、客户端路径、OAuth 返回字段和额度接口都可能变化；Dockyard 对缺失字段保持未知。
- 浏览器 OAuth 多账号依赖 provider 官方授权页和 token response；如果 provider 暂停或改变该流程，必须重新验证 endpoint，而不是猜测协议。
- Windows 当前不支持；请勿把本版本用于 Windows 生产环境。

## English

### What it is

Dockyard DSH is a native DeepSeek Harness bundle/plugin that connects official OAuth and official client sessions to one shared account pool, model catalog, quota view, and provider-native request path. It does not require a second proxy gateway and it does not put provider-specific branches into the DSH core.

Current provider modules:

- **Codex** — official browser OAuth, CLI fallback, and native Responses transport.
- **Antigravity** — Google browser OAuth, official local session, live model catalog, quota/credits, and native Gemini SSE transport.
- **Grok** — xAI browser OAuth, CLI fallback, live model catalog, official Build credits periods, and provider-native streaming. Quota uses the official `/billing?format=credits` surface (forwarding `GetGrokCreditsConfig`); if the upstream only returns a period, the remaining value stays unknown.
- **Claude** — official browser OAuth (including manual authorization-code entry), CLI fallback, and native request adapter.
- **Cursor** — official browser login polling, CLI fallback, and native request adapter.

When an official client, CLI, or OAuth source is missing or not signed in, Dockyard reports an explicit unavailable/degraded state. It does not invent accounts, models, versions, plans, or quota values.

### Features

- Manage providers and accounts from DSH's `/dockyard` command surface.
- Open each provider's official browser authorization page from “login/add account” and securely import the completed session; retain CLI fallback for compatibility.
- Scan existing official login states separately from adding a new account; an existing account is never silently re-imported by Add.
- Select accounts manually or with sticky-session, round-robin, or failover policies.
- Read live provider model catalogs, reasoning tiers, plans, and quota windows.
- Keep commands, model selection, and generation on the same Dockyard runtime and source of truth.

### Platform support: macOS only

**This release supports macOS only. Windows is not supported and has not been fully verified.**

The complete integration currently depends on macOS-specific behavior:

- Credentials use the macOS Keychain and a Swift helper.
- Browser OAuth is opened by the DSH GUI and uses PKCE, state validation, loopback callbacks, or manual-code entry; the official CLI is only a fallback.
- Scan mode still reads macOS desktop or local CLI session state for providers that expose it.
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

For a new account, use `/dockyard login <provider>` to open official browser OAuth. To import an existing local session, use `/dockyard scan <provider>` followed by `/dockyard add <provider>`, then inspect `/dockyard status` and `/dockyard models <provider>`.

### Official browser OAuth and active-session boundaries

- **Codex, Antigravity, Grok, Claude, and Cursor** open the provider's official browser authorization page directly when Login/Add is clicked; a local CLI is not required. The CLI remains a compatibility fallback.
- Codex uses loopback PKCE; Antigravity uses Google loopback OAuth; Grok uses xAI loopback OAuth; Cursor uses the official `loginDeepControl` + `/auth/poll` flow; Claude uses the official hosted callback and supports manual authorization-code entry.
- **Scan** can still read an existing official desktop/CLI session. Scan and browser account addition are separate operations.
- If a provider changes an OAuth endpoint, token response, or scope, Dockyard reports unavailable/degraded rather than guessing undocumented fields.

### Credentials and security

- Raw OAuth/token values are not stored in Git, account-pool snapshots, or page state; the runtime uses opaque credential references.
- Browser OAuth refresh tokens persist in secure credential storage; providers with refresh support renew short-lived access tokens after restart, while provider revocation or protocol changes still require reauthorization.
- macOS uses Keychain by default. Non-macOS defaults fail closed instead of silently falling back to an unsafe in-memory store.
- Provider models, plans, quotas, identities, and expiry values come from live provider responses; missing values remain `unknown`/`null`.
- Read [`SECURITY.md`](SECURITY.md) before filing issues. Never commit tokens, OAuth files, Keychain values, or sensitive logs.

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
tests/                      security, lifecycle, provider, and runtime tests
```

The core rule is simple: provider-specific logic stays in provider modules, account selection stays in the runtime, and hosts consume stable contracts. Do not add provider-specific branches to a host or hard-code dynamic provider data.

### Known limitations

- DeepSeek Harness is still a developer preview and may introduce breaking changes.
- Official provider CLIs, desktop paths, OAuth fields, and quota APIs can change; missing fields remain unknown.
- Browser account-pool behavior depends on each provider's official OAuth page and token response; endpoint changes require re-verification rather than guessed protocol fields.
- Windows is not supported in this release.
