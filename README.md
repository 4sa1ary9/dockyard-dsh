# Dockyard DSH

[English](README.en.md)

Windows 上把 **Codex / Grok / Claude / Cursor / Antigravity** 官方订阅接到 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的账号池插件。输入框左边会出现供应商选择条，点开后登录或导入本机官方登录态。

这不是官方插件。它从 [AITabby/dockyard-dsh](https://github.com/AITabby/dockyard-dsh) **fork 后二次开发**。上游当前发布版写明 **macOS only**，Windows EXE 尚未发布。这个仓库补了 Windows 凭据存储和系统浏览器打开，目标是在 Windows 10 / 11 上把同一套输入框供应商选择用起来。

本仓库与 DeepSeek AI、OpenAI、xAI、Anthropic、Cursor、Google 都没有从属关系。套餐、额度、模型能不能用，由各家账号决定。

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
| DeepSeek Harness | `npx @deepseek-ai/dsh`，按上游 `0.1.0-rc.6` 验证过 |
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

Cursor：官方浏览器登录轮询，CLI 是 fallback。Antigravity：Google 官方浏览器 OAuth，需要环境变量 `DOCKYARD_ANTIGRAVITY_CLIENT_ID` 和 `DOCKYARD_ANTIGRAVITY_CLIENT_SECRET`，仓库不内置。

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
npx @deepseek-ai/dsh plugin --profile web add "C:\Users\michael.li\lsz\dockyard-dsh"
npx @deepseek-ai/dsh web
```

打开 `http://127.0.0.1:3080`。输入框左侧会出现 Dockyard 供应商条。改完前端后要重启 `dsh web`。

命令：

```text
/dockyard status
/dockyard scan [provider]
/dockyard add [provider] [candidateId]
/dockyard login <provider>
/dockyard models <provider>
```

`provider` 常见为 `openai-codex`、`grok`、`claude`、`cursor`、`antigravity`。

## 开发

```powershell
npm install
npm test
npm run build
```

发布入口仍是 `packages/dsh-plugin/dist/index.mjs` 和 `packages/dsh-plugin/lib/client.js`。改 provider 或 vault 后要重新 `npm run build` 再提交产物。

## 许可证

[MIT](LICENSE)。上游版权归原作者。本仓库改动同样按 MIT 发布。
