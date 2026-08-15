const policyLabels = {
  manual: "手动选择",
  sticky_session: "会话粘性",
  round_robin: "账号轮询",
  failover: "失败切换",
};

let state = { providers: [], routes: [] };
let activeProviderId = null;
let busy = false;

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character]));
}

function safeExternalUrl(value, { allowLoopbackHttp = false } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const url = new URL(value.trim(), window.location.origin);
    const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""));
    if (url.username || url.password) return null;
    if (url.protocol !== "https:" && !(allowLoopbackHttp && loopback && url.protocol === "http:")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function formatDate(value, fallback = "未知") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatQuota(window) {
  if (window?.remaining === null || window?.remaining === undefined) return "未知";
  if (window.unit === "fraction") return `${Math.round(window.remaining * 100)}% 剩余`;
  if (window.unit === "percent") return `${trimNumber(window.remaining)}% 剩余`;
  if (window.limit !== null && window.limit !== undefined) return `${trimNumber(window.remaining)} / ${trimNumber(window.limit)} ${window.unit ?? ""}`.trim();
  return `${trimNumber(window.remaining)} ${window.unit ?? ""}`.trim();
}

function trimNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? (Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")) : "未知";
}

function quotaPercent(window) {
  if (!window || window.remaining === null || window.remaining === undefined) return 0;
  if (window.unit === "fraction") return Math.max(0, Math.min(100, Number(window.remaining) * 100));
  if (window.unit === "percent") return Math.max(0, Math.min(100, Number(window.remaining)));
  if (window.limit) return Math.max(0, Math.min(100, Number(window.remaining) / Number(window.limit) * 100));
  return 0;
}

function providerName(provider) {
  return provider?.manifest?.displayName ?? provider?.providerId ?? "Provider";
}

function providerInitial(provider) {
  return Array.from(providerName(provider)).at(0)?.toUpperCase() ?? "P";
}

function accountStatus(account) {
  return account?.health?.status ?? "unknown";
}

function statusLabel(status) {
  return ({ healthy: "正常", degraded: "需检查", cooldown: "冷却中", expired: "需重新授权", unknown: "待检查" }[status] ?? status);
}

function sourceLabel(source) {
  if (!source) return "live provider source";
  if (source === "official_antigravity_cli") return "官方 Antigravity CLI / 系统钥匙串";
  if (source === "official_grok_oauth") return "官方 Grok OAuth / 本机凭据";
  if (source.includes("auth.json")) return "本机 Codex OAuth / auth.json";
  return source;
}

function showToast(message, type = "") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  $("#toast-stack").append(toast);
  setTimeout(() => toast.remove(), 3600);
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(options.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? `请求失败 (${response.status})`);
    return body;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("本地服务响应超时，请检查 Keychain 或 provider 网络状态");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function activeProvider() {
  return state.providers.find((provider) => provider.providerId === activeProviderId) ?? state.providers[0] ?? null;
}

function renderSummary() {
  const providers = state.providers ?? [];
  const accounts = providers.flatMap((provider) => provider.accounts ?? []);
  const windows = accounts.reduce((count, account) => count + (account.quota?.windows?.length ?? 0), 0);
  const policies = [...new Set(providers.map((provider) => policyLabels[provider.policy] ?? provider.policy).filter(Boolean))];
  $("#summary-accounts").textContent = String(accounts.length);
  $("#summary-windows").textContent = String(windows || "—");
  $("#summary-policy").textContent = policies.length === 1 ? policies[0] : (policies.length ? "多策略" : "—");
  const generated = state.generatedAt;
  $("#summary-sync").textContent = generated ? formatDate(generated) : "尚未扫描";
  $("#summary-source").textContent = accounts.length ? "provider live response" : "等待本机 OAuth";
  $("#footer-route").textContent = `DSH routes: ${(state.routes ?? []).length || "—"}`;
}

function renderTabs() {
  const container = $("#provider-tabs");
  container.innerHTML = (state.providers ?? []).map((provider) => {
    const active = provider.providerId === activeProviderId;
    const count = provider.accounts?.length ?? 0;
    return `<button class="provider-tab ${active ? "active" : ""}" data-provider="${escapeHtml(provider.providerId)}">
      <span class="provider-logo">${escapeHtml(providerInitial(provider))}</span>
      <span class="provider-tab-copy"><span class="provider-tab-name">${escapeHtml(providerName(provider))}</span><span class="provider-tab-meta">${count} 个账号</span></span><span class="tab-arrow">›</span>
    </button>`;
  }).join("");
}

function renderCandidate(candidate) {
  const identity = candidate.email ?? candidate.displayName ?? candidate.accountId;
  const source = sourceLabel(candidate.source);
  return `<article class="candidate-card">
    <div class="candidate-copy"><div class="candidate-title"><span class="candidate-tag">发现 OAuth</span><strong>${escapeHtml(identity)}</strong></div><div class="candidate-meta">${escapeHtml(source)} · ${escapeHtml(candidate.subscription?.plan ?? "订阅计划待 provider 返回")}</div></div>
    <button class="button button-primary import-candidate" data-candidate="${escapeHtml(candidate.candidateId)}"><span class="button-icon">＋</span>接入已登录账号</button>
  </article>`;
}

function accountWindows(account) {
  if (account.quota?.windows?.length) return account.quota.windows;
  if (account.quota?.remaining !== null && account.quota?.remaining !== undefined) return [{ ...account.quota, id: "primary", name: "当前额度" }];
  return [];
}

function renderQuota(window) {
  const percent = quotaPercent(window);
  return `<div class="quota-row"><div class="quota-line"><span class="quota-name">${escapeHtml(window.name ?? window.id ?? "额度窗口")}</span><span class="quota-value">${escapeHtml(formatQuota(window))}</span></div><div class="quota-track"><div class="quota-fill" style="width:${percent}%"></div></div><span class="quota-reset">${window.resetAt ? `刷新 · ${escapeHtml(formatDate(window.resetAt))}` : "刷新时间由 provider 返回"}</span></div>`;
}

function renderResources(account) {
  return Object.entries(account.resources ?? {}).map(([key, value]) => {
    if (value === null || value === undefined) return "";
    if (typeof value !== "object") {
      return `<div class="quota-row"><div class="quota-line"><span class="quota-name">${escapeHtml(key)}</span><span class="quota-value">${escapeHtml(value)}</span></div></div>`;
    }
    if (value.remaining === null || value.remaining === undefined) return "";
    const label = value.name ?? key;
    const upgradeUri = safeExternalUrl(value.upgradeUri);
    const link = upgradeUri ? ` · <a href="${escapeHtml(upgradeUri)}" target="_blank" rel="noreferrer">升级</a>` : "";
    return `<div class="quota-row"><div class="quota-line"><span class="quota-name">${escapeHtml(label)}</span><span class="quota-value">${escapeHtml(trimNumber(value.remaining))}</span></div><span class="quota-reset">provider live resource${link}</span></div>`;
  }).join("");
}

function renderAccount(account, provider) {
  const status = accountStatus(account);
  const current = provider.defaultAccountId === account.accountId;
  const identity = account.email ?? account.displayName ?? account.accountId;
  const plan = account.subscription?.plan ?? "订阅信息待 provider 返回";
  const refresh = account.refresh ?? {};
  const subscriptionExpiry = account.subscription?.expiresAt
    ? `订阅到期 · ${formatDate(account.subscription.expiresAt)}`
    : "订阅到期 · provider 未返回";
  const oauthState = status === "expired"
    ? "OAuth 授权 · 需重新授权"
    : `OAuth token 有效至 · ${formatDate(refresh.accessTokenExpiresAt)}`;
  return `<article class="account-card ${current ? "current" : ""} provider-${escapeHtml(provider.providerId)}">
    <div class="account-top"><div class="account-identity"><div class="avatar">${escapeHtml((identity || "?").slice(0, 1).toUpperCase())}</div><div><div class="account-name">${escapeHtml(identity)} ${current ? "<span class=\"current-mark\">● 当前</span>" : ""}</div><div class="account-email">${escapeHtml(account.email ? account.accountId : `account ${account.accountId}`)}</div></div></div><span class="status-chip ${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span></div>
    <div class="plan-row"><span class="plan-label">Plan</span><span class="plan-value">${escapeHtml(plan)}</span><span class="live-dot"></span><span>live</span></div>
    <div class="quota-list">${accountWindows(account).map(renderQuota).join("") || "<div class=\"quota-reset\">尚未取得额度窗口，点击刷新读取 provider 实时数据。</div>"}${renderResources(account)}</div>
    <div class="account-foot"><div class="refresh-info">${escapeHtml(subscriptionExpiry)}<br>${escapeHtml(oauthState)}<br>上次同步 · ${escapeHtml(formatDate(refresh.lastRefreshedAt))}</div><div class="account-actions"><button class="mini-button refresh-account" data-account="${escapeHtml(account.accountId)}">↻ 刷新</button>${current ? "" : `<button class="mini-button select-account" data-account="${escapeHtml(account.accountId)}">设为当前</button>`}</div></div>
  </article>`;
}

function renderDiagnostics(provider) {
  const lines = [
    ...(provider?.diagnostics ?? []),
    ...(provider?.candidates ?? []).map((candidate) => candidate.diagnostic).filter(Boolean),
  ];
  const body = $("#diagnostics-body");
  body.innerHTML = lines.length ? lines.map((line) => `<div class="diagnostic-line">${escapeHtml(line)}</div>`).join("") : `<div class="diagnostic-ok">✓ 当前没有 provider 诊断信息</div>`;
}

function renderActive() {
  const provider = activeProvider();
  if (!provider) {
    $("#active-provider-name").textContent = "等待扫描";
    $("#account-grid").innerHTML = "";
    $("#empty-state").hidden = false;
    return;
  }
  activeProviderId = provider.providerId;
  $("#active-eyebrow").textContent = `${provider.providerId.toUpperCase()} / PROVIDER MODULE`;
  $("#active-provider-name").textContent = providerName(provider);
  $("#active-provider-source").textContent = sourceLabel(provider.source);
  $("#policy-select").value = provider.policy ?? "round_robin";
  const candidates = (provider.candidates ?? []).filter((candidate) => !candidate.imported);
  $("#candidate-area").innerHTML = candidates.map(renderCandidate).join("");
  const accounts = provider.accounts ?? [];
  $("#account-count").textContent = String(accounts.length);
  $("#account-grid").innerHTML = accounts.map((account) => renderAccount(account, provider)).join("");
  $("#empty-state").hidden = accounts.length > 0;
  renderDiagnostics(provider);
}

function render() {
  if (!activeProviderId && state.providers?.length) activeProviderId = state.providers[0].providerId;
  renderSummary();
  renderTabs();
  renderActive();
}

async function scan() {
  if (busy) return;
  busy = true;
  document.body.classList.add("is-busy");
  showToast("正在读取本机 OAuth 和 provider 实时状态…");
  try {
    state = await api("/api/scan", { method: "POST", body: "{}" });
    render();
    showToast("扫描完成");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    busy = false;
    document.body.classList.remove("is-busy");
  }
}

async function refreshAll() {
  if (busy) return;
  busy = true;
  document.body.classList.add("is-busy");
  showToast("正在向 provider 刷新额度…");
  try {
    await api("/api/refresh-all", { method: "POST", body: "{}" });
    state = await api("/api/scan", { method: "POST", body: "{}" });
    render();
    showToast("实时额度已更新");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    busy = false;
    document.body.classList.remove("is-busy");
  }
}

async function importCandidate(candidateId) {
  if (busy) return;
  busy = true;
  document.body.classList.add("is-busy");
  showToast("正在将 OAuth 安全写入本机 Keychain…");
  try {
    const imported = await api(`/api/providers/${encodeURIComponent(activeProviderId)}/candidates/${encodeURIComponent(candidateId)}/import`, { method: "POST", body: "{}" });
    state = await api("/api/scan", { method: "POST", body: "{}" });
    render();
    showToast("账号已导入，正在读取 provider 实时额度…");
    try {
      await api(`/api/providers/${encodeURIComponent(activeProviderId)}/refresh`, {
        method: "POST",
        body: JSON.stringify({ accountId: imported.account?.accountId, force: false }),
      });
      state = await api("/api/scan", { method: "POST", body: "{}" });
      render();
      showToast("账号已导入，实时额度已更新");
    } catch (refreshError) {
      state = await api("/api/scan", { method: "POST", body: "{}" });
      render();
      showToast(`账号已导入；额度刷新失败：${refreshError.message}`, "error");
    }
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    busy = false;
    document.body.classList.remove("is-busy");
  }
}

async function refreshAccount(accountId) {
  if (busy) return;
  busy = true;
  document.body.classList.add("is-busy");
  try {
    await api(`/api/providers/${encodeURIComponent(activeProviderId)}/refresh`, { method: "POST", body: JSON.stringify({ accountId, force: false }) });
    state = await api("/api/scan", { method: "POST", body: "{}" });
    render();
    showToast("账号已刷新");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    busy = false;
    document.body.classList.remove("is-busy");
  }
}

async function selectAccount(accountId) {
  try {
    await api(`/api/providers/${encodeURIComponent(activeProviderId)}/default`, { method: "POST", body: JSON.stringify({ accountId }) });
    state = await api("/api/state");
    render();
    showToast("已切换当前账号");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function changePolicy(policy) {
  try {
    await api(`/api/providers/${encodeURIComponent(activeProviderId)}/policy`, { method: "POST", body: JSON.stringify({ policy }) });
    state = await api("/api/state");
    render();
    showToast(`账号选择：${policyLabels[policy] ?? policy}`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

let oauthSession = null;
let oauthPollTimer = null;
let oauthPopup = null;
let oauthPopupNavigated = false;

function setOAuthStatus(status, title, copy) {
  $("#oauth-status-title").textContent = title;
  $("#oauth-status-copy").textContent = copy;
  $("#oauth-status-dot").className = `oauth-status-dot ${status}`;
}

function clearOAuthPolling() {
  if (oauthPollTimer) clearTimeout(oauthPollTimer);
  oauthPollTimer = null;
}

function closeOAuthModal({ cancelSession = true } = {}) {
  const session = oauthSession;
  oauthSession = null;
  clearOAuthPolling();
  $("#oauth-modal").hidden = true;
  busy = false;
  document.body.classList.remove("is-busy");
  if (oauthPopup && !oauthPopupNavigated && !oauthPopup.closed) oauthPopup.close();
  oauthPopup = null;
  oauthPopupNavigated = false;
  if (cancelSession && session?.sessionId && session.status !== "completed") {
    api(`/api/providers/${encodeURIComponent(session.providerId)}/oauth/${encodeURIComponent(session.sessionId)}/cancel`, {
      method: "POST",
      body: "{}",
    }).catch(() => {});
  }
}

function openAuthorizationUrl(url) {
  const safeUrl = safeExternalUrl(url, { allowLoopbackHttp: true });
  if (!safeUrl) {
    showToast("provider 返回的授权链接不安全，已拒绝打开", "error");
    return;
  }
  const link = $("#oauth-open-link");
  link.href = safeUrl;
  link.hidden = false;
  if (oauthPopup && !oauthPopup.closed) {
    try {
      oauthPopup.location.href = safeUrl;
      oauthPopup.focus?.();
      oauthPopupNavigated = true;
      return;
    } catch {
      // Fall through to the visible link/popup fallback.
    }
  }
  window.open(safeUrl, "_blank", "noopener,noreferrer");
}

async function pollOAuthSession() {
  const session = oauthSession;
  if (!session?.sessionId) return;
  try {
    const result = await api(`/api/providers/${encodeURIComponent(session.providerId)}/oauth/${encodeURIComponent(session.sessionId)}`);
    if (oauthSession !== session) return;
    if (result.authorizationUrl && result.authorizationUrl !== session.authorizationUrl) {
      session.authorizationUrl = result.authorizationUrl;
      openAuthorizationUrl(result.authorizationUrl);
    }
    if (result.status === "completed") {
      session.status = "completed";
      setOAuthStatus("completed", "授权完成", `已添加 ${result.accounts?.length ?? 1} 个账号，正在读取实时订阅状态…`);
      state = await api("/api/scan", { method: "POST", body: "{}" });
      render();
      showToast(`已通过官方 OAuth 添加 ${result.accounts?.length ?? 1} 个账号`);
      closeOAuthModal({ cancelSession: false });
      return;
    }
    if (["failed", "cancelled", "missing"].includes(result.status)) {
      session.status = result.status;
      setOAuthStatus("failed", "官方授权未完成", result.diagnostic ?? "请重新点击登录添加账号。");
      busy = false;
      document.body.classList.remove("is-busy");
      return;
    }
    setOAuthStatus("pending", "等待官方授权", result.authorizationUrl ? "请在刚打开的 provider 官方网页完成登录和授权。" : (result.instructions ?? "正在等待官方登录流程返回授权地址…"));
    oauthPollTimer = setTimeout(pollOAuthSession, 900);
  } catch (error) {
    if (oauthSession !== session) return;
    setOAuthStatus("failed", "无法读取授权状态", error.message);
    busy = false;
    document.body.classList.remove("is-busy");
  }
}

async function openOAuthModal() {
  const provider = activeProvider();
  if (!provider) {
    showToast("请先扫描 provider", "error");
    return;
  }
  if (!provider.manifest?.capabilities?.includes("oauth_authorization")) {
    showToast("当前 provider 没有可调用的官方网页登录入口；请先在官方应用完成登录，再点击扫描 OAuth", "error");
    return;
  }
  if (busy) return;
  const providerId = provider.providerId;
  const session = { providerId, sessionId: null, status: "starting", authorizationUrl: null };
  oauthSession = session;
  oauthPopupNavigated = false;
  oauthPopup = window.open("about:blank", "dockyard-oauth-auth", "popup,width=520,height=760");
  $("#oauth-provider-name").textContent = `当前 provider：${providerName(provider)}`;
  $("#oauth-open-link").hidden = true;
  $("#oauth-modal").hidden = false;
  setOAuthStatus("pending", "准备打开官方授权页", "正在启动 provider 官方 OAuth 登录…");
  busy = true;
  document.body.classList.add("is-busy");
  showToast(`正在启动 ${providerName(provider)} 官方 OAuth 登录…`);
  try {
    const started = await api(`/api/providers/${encodeURIComponent(providerId)}/oauth/start`, {
      method: "POST",
      body: "{}",
    });
    if (oauthSession !== session) {
      if (started.sessionId) {
        await api(`/api/providers/${encodeURIComponent(providerId)}/oauth/${encodeURIComponent(started.sessionId)}/cancel`, { method: "POST", body: "{}" }).catch(() => {});
      }
      return;
    }
    Object.assign(session, started);
    if (started.authorizationUrl) openAuthorizationUrl(started.authorizationUrl);
    await pollOAuthSession();
  } catch (error) {
    if (oauthSession === session) {
      setOAuthStatus("failed", "无法启动官方授权", error.message);
      busy = false;
      document.body.classList.remove("is-busy");
    }
    showToast(error.message, "error");
  }
}

$("#scan-button").addEventListener("click", scan);
$("#empty-scan-button").addEventListener("click", scan);
$("#add-account-button").addEventListener("click", openOAuthModal);
$("#refresh-all-button").addEventListener("click", refreshAll);
$("#policy-select").addEventListener("change", (event) => changePolicy(event.target.value));
$("#oauth-cancel-button").addEventListener("click", () => closeOAuthModal());
$("#oauth-cancel-button-bottom").addEventListener("click", () => closeOAuthModal());
$("#diagnostics-toggle").addEventListener("click", () => {
  const body = $("#diagnostics-body");
  const hidden = body.hasAttribute("hidden");
  if (hidden) body.removeAttribute("hidden"); else body.setAttribute("hidden", "");
});
document.addEventListener("click", (event) => {
  const tab = event.target.closest(".provider-tab");
  if (tab) { activeProviderId = tab.dataset.provider; render(); return; }
  const importButton = event.target.closest(".import-candidate");
  if (importButton) { importCandidate(importButton.dataset.candidate); return; }
  const refreshButton = event.target.closest(".refresh-account");
  if (refreshButton) { refreshAccount(refreshButton.dataset.account); return; }
  const selectButton = event.target.closest(".select-account");
  if (selectButton) { selectAccount(selectButton.dataset.account); }
});

async function boot() {
  try {
    state = await api("/api/state");
    render();
    await scan();
  } catch (error) {
    showToast(error.message, "error");
  }
}

boot();
