# Dockyard DSH

[English](README.en.md)

Windows 上把 **Codex / Grok / Claude / Cursor / Antigravity** 官方订阅接到 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的账号池插件。输入框左边会出现供应商选择条，点开后登录或导入本机官方登录态。

这不是官方插件。它从 [AITabby/dockyard-dsh](https://github.com/AITabby/dockyard-dsh) **fork 后二次开发**。上游 v0.1.1 已有 macOS DMG，Windows EXE 仍在他们自己的发布流程里。这个仓库补的是：在现有 `dsh web` 里用同一套输入框供应商选择，凭据和浏览器按 Windows 走。

已同步上游 `main` 的 [`373d945`](https://github.com/AITabby/dockyard-dsh/commit/373d945fa52f7ebee6f2c5de6c8dc4315126d334)（2026-09-30）。上游最新发布标签仍为 `v0.1.1`。

本仓库与 DeepSeek AI、OpenAI、xAI、Anthropic、Cursor、Google、Amazon 都没有从属关系。套餐、额度、模型能不能用，由各家账号决定。

## 相对上游改了什么

上游在非 macOS 上默认凭据库会 fail closed，浏览器打开也只调用 macOS 的 `open`。

这个 fork：

- Windows 凭据用当前用户 DPAPI 写到 `%LOCALAPPDATA%\dockyard-dsh\secrets`，不再静默拒绝写入。
- 登录时用 `rundll32` 打开系统默认浏览器。
- 去掉子包 `prepare` 构建脚本，GitHub 直装走已提交的 `dist/` 和 `lib/client.js`。
- DSH 仍优先走 Host 的 Credentials 服务；DPAPI 是 Windows 上的本机兜底，对应上游的 Keychain。

Linux 默认仍 fail closed，与上游一致。

## 环境要求

| 项 | 要求 |
|---|---|
| 系统 | Windows 10 / 11 |
| Node.js | `^22.19.0` 或 `>=24` |
| DeepSeek Harness | `npx @deepseek-ai/dsh`；依赖按上游 `0.1.7-alpha.2` 对齐，历史加载验证版本为 `0.1.6-alpha.2`；本次同步未重启正在使用的 DSH，尚未验证新版运行时加载 |
| pnpm | `dsh plugin add` 会转给 pnpm：`npm install -g pnpm` |

## 认证条件

输入框左边的 Dockyard 条里点供应商，再「登录添加账号」或先扫描再导入。没有对应套餐或本机登录态时，状态会是 unavailable / degraded，不会伪造额度或模型。

### Codex

需要带 Codex 资格的 ChatGPT 套餐。默认打开官方浏览器 OAuth（loopback PKCE）。本机已经 `codex login` 时，可用扫描导入 `%USERPROFILE%\.codex\auth.json`。这不是 OpenAI Platform API Key。

### Grok

需要能走 xAI 推理的 SuperGrok 或 X Premium。默认打开 xAI 官方浏览器 OAuth。也可扫描 `%USERPROFILE%\.grok\auth.json`。部分档位登录成功但推理 403，那是套餐门禁。

### Claude

需要 Claude 订阅（Pro / Max 或 Claude Code 同一套 OAuth）。浏览器回调有时要手动粘贴带 `state` 的完整地址或 `code#state`。扫描可读本机官方会话；`settings.json` 里指向网关的 API Key 不是这里的认证路径。

### Cursor / Antigravity

Cursor：官方浏览器登录轮询，CLI 是 fallback。

Antigravity：默认直接打开 Google 网页授权，不需要先安装或登录 `agy`。公开客户端配置参考 [LiZhenNet/dsh-antigravity](https://github.com/LiZhenNet/dsh-antigravity)，许可见 [第三方声明](modules/provider-antigravity/THIRD_PARTY_NOTICES.md)。仍可通过 `DOCKYARD_ANTIGRAVITY_CLIENT_ID` / `DOCKYARD_ANTIGRAVITY_CLIENT_SECRET` 成对覆盖；`DOCKYARD_ANTIGRAVITY_BROWSER_OAUTH=0` 可显式切回 CLI 登录。授权需要账号具备相应服务资格，插件不绕过 Google 权限限制。

桌面端（`dsh-app://app/`）拦截空白弹窗时由本机 Host 打开系统浏览器；普通远程 Web 页面保留手动授权链接，不在远程服务器开浏览器。回调只监听本机回环地址，默认端口 `51121`；端口占用会明确报错，不再静默切换到终端或导入别的本机账号。

授权结束后不会继续展示失效链接；点击「重新开始授权」创建新会话。后台与界面轮询共享登录结果，避免完成后误报「会话不存在」。更新插件的 Host 构建后，请完整退出并重开 DSH；仅关闭账号面板或禁用再启用插件不能保证清除模块缓存。

### 凭据放哪

- DSH Credentials（Host 已注入时优先）
- Windows：`%LOCALAPPDATA%\dockyard-dsh\secrets`（DPAPI）
- 账号池快照只有不透明引用，不写原始 token

扫描和「登录添加账号」是两件事。已有账号不会被新增操作静默重复导入。

## 安装

```powershell
npx @deepseek-ai/dsh plugin --profile web add github:4sa1ary9/dockyard-dsh
npx @deepseek-ai/dsh web
```

本地开发：

```powershell
npx @deepseek-ai/dsh plugin --profile web add "C:\Users\michael.li\lsz\dsh\dockyard-dsh"
npx @deepseek-ai/dsh web
```

打开 `http://127.0.0.1:3080`。输入框左侧会出现 Dockyard 供应商条。改完前端后要重启 `dsh web`。

上游另提供了预构建的一条命令安装器 `npx -y @dockyard-dsh/install@latest`，但它安装的是上游 bundle，不是本 fork；Windows fork 请按上面的方式从本仓库安装。历史加载验证版本为 `@deepseek-ai/dsh@0.1.6-alpha.2`，本次同步尚未验证新版运行时加载。

命令：

```text
/dockyard status
/dockyard scan [provider]
/dockyard add [provider] [candidateId]
/dockyard login <provider>
/dockyard models <provider>
```

`provider` 常见为 `openai-codex`、`grok`、`claude`、`cursor`、`antigravity`。


## 本地优化（2026-10-01）

- Windows 凭据使用原子替换写入；写入失败保留旧值。缺少 PowerShell 或浏览器启动失败时明确报错。
- 输入框常驻账号管理入口，未选模型或额度未知时也可打开。支持 Esc 关闭并返回入口、Enter 添加 Key，以及窄窗口布局。
- 后台刷新保留登录和账号操作状态；切换供应商后丢弃旧额度响应，添加 Key 失败时确认配置引用再清理凭据。
- 合并重复刷新和推理档位 UI，删除无入口的授权分支，复用已有凭据解析；没有新增生产依赖。

本轮验证使用独立浏览器和模拟账户，不启动或重启现有 DSH。真实供应商登录与已安装 DSH 的端到端加载仍需在空闲时验证。

## 开发

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

发布入口仍是 `packages/dsh-plugin/dist/index.mjs` 和 `packages/dsh-plugin/lib/client.js`。改 provider 或 vault 后要重新 `pnpm run build` 再提交产物。

## 许可证

[MIT](LICENSE)。上游版权归原作者。本仓库改动同样按 MIT 发布。
