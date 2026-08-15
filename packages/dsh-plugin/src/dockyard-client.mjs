import * as React from "react";

import { createSnapshotStore } from "@deepseek-ai/dsh-client-runtime/client";

import { TYPERT_REMOTE } from "./dockyard-typert.remote.mjs";
import {
  NativeKeyPoolController,
  NATIVE_KEY_POLICY_LABELS,
} from "./native-key-pool.mjs";

const h = React.createElement;
const {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} = React;

const STYLE_ID = "dockyard-dsh-account-control";
const POLICY_LABELS = Object.freeze({
  manual: "手动选择",
  sticky_session: "会话粘滞",
  round_robin: "账号轮询",
  failover: "失败转移",
});

const DOCKYARD_CHEVRON_PATH = "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z";

const CSS = `
.dockyard-dsh-anchor{position:relative;display:inline-flex;align-items:center;min-width:0;z-index:25}
/* The native model menu stays compact; live capacities remain in the Dockyard
   popup, where they belong with the provider/account state. */
button[role="menuitemradio"] [class$="_description"]{display:none!important}
.dockyard-dsh-model-group-toggle{display:flex!important;align-items:center;justify-content:space-between;gap:10px;min-height:26px;padding:4px 12px!important;border-radius:7px;cursor:pointer;user-select:none;outline:0}
.dockyard-dsh-model-group-toggle:hover,.dockyard-dsh-model-group-toggle:focus-visible{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#fff)}
.dockyard-dsh-model-group-toggle .dockyard-dsh-model-group-chevron{margin-left:auto}
section[data-dockyard-model-group-collapsed="true"]>[role="menuitemradio"]{display:none!important}
.dockyard-dsh-trigger{display:inline-flex;align-items:center;gap:4px;max-width:160px;height:28px;padding:0 8px;border:0;border-radius:999px;color:var(--dsw-alias-label-secondary,#c7ccd5);background:transparent;cursor:pointer;font:500 13px/20px Inter,var(--dsw-font-family,sans-serif);white-space:nowrap}
.dockyard-dsh-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#fff)}
.dockyard-dsh-trigger:focus-visible{outline:2px solid var(--dsw-alias-border-l3,#8fa3c7);outline-offset:1px}
.dockyard-dsh-trigger[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#fff)}
.dockyard-dsh-add-trigger{display:inline-flex;align-items:center;justify-content:center;gap:3px;height:28px;margin-left:2px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary,#c7ccd5);cursor:pointer;font:500 12px/20px Inter,var(--dsw-font-family,sans-serif);white-space:nowrap}
.dockyard-dsh-add-trigger:hover,.dockyard-dsh-add-trigger:focus-visible{border-color:rgba(121,214,200,.6);background:rgba(121,214,200,.09);color:var(--dsw-alias-label-primary,#fff)}
.dockyard-dsh-add-trigger:focus-visible{outline:2px solid var(--dsw-alias-border-l3,#8fa3c7);outline-offset:1px}
.dockyard-dsh-dot{width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-label-caption,#8b93a1)}
.dockyard-dsh-dot[data-live=true]{background:#79d6c8;box-shadow:0 0 8px rgba(121,214,200,.8)}
.dockyard-dsh-dot[data-loading=true]{background:#cbb7ff;animation:dockyard-dsh-pulse 1s ease-in-out infinite}
.dockyard-dsh-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dockyard-dsh-summary{color:var(--dsw-alias-label-caption,#8b93a1);font-weight:400;overflow:hidden;text-overflow:ellipsis}
.dockyard-dsh-chevron{display:inline-flex;width:14px;height:14px;flex:none;align-items:center;justify-content:center;color:var(--dsw-alias-label-caption,#8b93a1);transition:transform 140ms ease;transform-origin:center}
.dockyard-dsh-chevron[data-open=true]{transform:rotate(180deg)}
.dockyard-dsh-chevron svg{display:block;width:14px;height:14px}
.dockyard-dsh-popup{position:fixed;z-index:1000;left:var(--dockyard-dsh-popup-left,14px);top:var(--dockyard-dsh-popup-top,14px);right:auto;bottom:var(--dockyard-dsh-popup-bottom,auto);box-sizing:border-box;width:min(480px,calc(100vw - 28px));max-height:var(--dockyard-dsh-popup-max-height,min(560px,calc(100vh - 28px)));max-height:var(--dockyard-dsh-popup-max-height,min(560px,calc(100dvh - 28px)));overflow:hidden;display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:14px;background:var(--dsw-specific-menu,#2d2d31);box-shadow:var(--dsw-shadow-lv3,0 16px 50px rgba(0,0,0,.4));color:var(--dsw-alias-label-primary,#f5f7fb);font:400 12px/18px Inter,var(--dsw-font-family,sans-serif);text-align:left}
.dockyard-dsh-popup-scroll{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:10px;padding-right:1px}
.dockyard-dsh-provider-list{display:flex;flex-direction:column;gap:6px}
.dockyard-dsh-provider-row{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));border-radius:10px;background:rgba(255,255,255,.035);color:inherit;cursor:pointer;font:inherit;text-align:left}
.dockyard-dsh-provider-row:hover,.dockyard-dsh-provider-row[data-current=true]{border-color:rgba(121,214,200,.5);background:rgba(121,214,200,.08)}
.dockyard-dsh-provider-row:focus-visible{outline:2px solid var(--dsw-alias-border-l3,#8fa3c7);outline-offset:1px}
.dockyard-dsh-provider-row-copy{min-width:0;flex:1}
.dockyard-dsh-provider-row-name{overflow:hidden;color:var(--dsw-alias-label-primary,#f5f7fb);font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-provider-row-meta{margin-top:2px;overflow:hidden;color:var(--dsw-alias-label-caption,#8b93a1);font-size:10px;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-provider-row-arrow{flex:none;color:var(--dsw-alias-label-caption,#8b93a1);font-size:18px;line-height:18px}
.dockyard-dsh-head{display:flex;align-items:flex-start;gap:10px;padding-bottom:2px}
.dockyard-dsh-head-copy{min-width:0;flex:1}
.dockyard-dsh-eyebrow{color:#94d9d0;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
.dockyard-dsh-title{margin-top:2px;font-size:16px;font-weight:650;line-height:22px}
.dockyard-dsh-model{margin-top:2px;overflow:hidden;color:var(--dsw-alias-label-tertiary,#a9b0ba);text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-model-context{margin-top:2px;color:var(--dsw-alias-label-caption,#8b93a1);font-size:10px;line-height:15px;text-align:left}
.dockyard-dsh-close{width:26px;height:26px;flex:none;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary,#a9b0ba);cursor:pointer;font-size:20px;line-height:24px}
.dockyard-dsh-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#fff)}
.dockyard-dsh-status{display:flex;align-items:center;gap:7px;min-height:28px;padding:6px 8px;border-radius:8px;background:var(--dsw-alias-bg-module-platform,rgba(255,255,255,.06));color:var(--dsw-alias-label-tertiary,#a9b0ba)}
.dockyard-dsh-status[data-error=true]{background:rgba(255,104,104,.11);color:var(--dsw-alias-state-error-primary,#ff7a7a)}
.dockyard-dsh-status[data-success=true]{color:#9ce5dc}
.dockyard-dsh-status-copy{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.dockyard-dsh-auth-status{align-items:flex-start}
.dockyard-dsh-auth-status .dockyard-dsh-status-copy{white-space:normal;overflow-wrap:anywhere;line-height:18px}
.dockyard-dsh-auth-status .dockyard-dsh-auth-diagnostic{flex-basis:100%;color:var(--dsw-alias-state-error-primary,#ff7a7a)}
.dockyard-dsh-login-guide{display:flex;flex-direction:column;gap:6px;padding:9px 10px;border:1px solid rgba(121,214,200,.35);border-radius:9px;background:rgba(121,214,200,.07);text-align:left}
.dockyard-dsh-login-guide-title{color:#b8eee8;font-size:11px;font-weight:650;line-height:17px}
.dockyard-dsh-login-guide-copy{color:var(--dsw-alias-label-tertiary,#a9b0ba);font-size:10px;line-height:15px}
.dockyard-dsh-login-guide-steps{display:flex;flex-direction:column;gap:5px;margin:1px 0 0;padding:0;list-style:none}
.dockyard-dsh-login-guide-step{display:flex;align-items:flex-start;gap:7px;color:var(--dsw-alias-label-secondary,#c7ccd5);font-size:10px;line-height:15px}
.dockyard-dsh-login-guide-number{display:inline-flex;width:16px;height:16px;flex:none;align-items:center;justify-content:center;border-radius:50%;background:rgba(121,214,200,.2);color:#b8eee8;font-size:9px;font-weight:700}
.dockyard-dsh-login-guide-error{color:#ff9a83;font-size:10px;line-height:15px}
.dockyard-dsh-login-guide-code{display:flex;align-items:center;gap:6px;margin-top:2px}
.dockyard-dsh-login-guide-code input{min-width:0;flex:1;height:28px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:7px;background:rgba(0,0,0,.12);color:var(--dsw-alias-label-primary,#f5f7fb);font:400 11px/20px Inter,var(--dsw-font-family,sans-serif)}
.dockyard-dsh-login-guide-code input:focus{border-color:#8ecfc7;outline:0}
.dockyard-dsh-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dockyard-dsh-action{height:28px;padding:0 9px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#c7ccd5);cursor:pointer;font:500 11px/20px Inter,var(--dsw-font-family,sans-serif);white-space:nowrap;flex:none}
.dockyard-dsh-action:hover:not(:disabled){border-color:#8ecfc7;background:rgba(121,214,200,.09);color:#b8eee8}
.dockyard-dsh-action:disabled{cursor:default;opacity:.45}
.dockyard-dsh-action-primary{border-color:rgba(121,214,200,.55);color:#a5e6dd}
.dockyard-dsh-action-danger{border-color:rgba(255,125,110,.48);color:#ff9c91}
.dockyard-dsh-field{display:flex;align-items:center;justify-content:flex-start;gap:10px;padding:8px 9px;border-radius:8px;background:rgba(255,255,255,.045);text-align:left}
.dockyard-dsh-field-label{flex:1;color:var(--dsw-alias-label-tertiary,#a9b0ba);text-align:left}
.dockyard-dsh-select{max-width:170px;height:27px;padding:0 7px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:6px;background:var(--dsw-specific-menu,#2d2d31);color:var(--dsw-alias-label-primary,#f5f7fb);font:500 11px/20px Inter,var(--dsw-font-family,sans-serif)}
.dockyard-dsh-section{display:flex;flex-direction:column;gap:6px}
.dockyard-dsh-section-title{display:flex;width:100%;box-sizing:border-box;flex-direction:column;align-items:flex-start;gap:1px;color:var(--dsw-alias-label-tertiary,#a9b0ba);font-size:10px;font-weight:700;letter-spacing:1.2px;line-height:18px;text-transform:uppercase;text-align:left}
.dockyard-dsh-section-title>span:first-child{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-section-value{display:block;min-width:0;max-width:100%;margin:0;color:var(--dsw-alias-label-caption,#8b93a1);font-size:11px;font-weight:400;letter-spacing:0;line-height:16px;text-transform:none;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-tier-list{display:flex;gap:5px;flex-wrap:wrap}
.dockyard-dsh-tier{min-height:25px;padding:2px 8px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary,#a9b0ba);cursor:pointer;font:500 11px/18px Inter,var(--dsw-font-family,sans-serif)}
.dockyard-dsh-tier[data-active=true]{border-color:rgba(121,214,200,.65);background:rgba(121,214,200,.12);color:#a5e6dd}
.dockyard-dsh-tier:disabled{cursor:default;opacity:.55}
.dockyard-dsh-account{display:flex;flex-direction:column;gap:7px;padding:9px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));border-radius:10px;background:rgba(255,255,255,.035)}
.dockyard-dsh-account[data-current=true]{border-color:rgba(121,214,200,.45);background:rgba(121,214,200,.065)}
.dockyard-dsh-account-head{display:flex;align-items:center;gap:8px}
.dockyard-dsh-account-identity{min-width:0;flex:1}
.dockyard-dsh-account-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary,#f5f7fb);font-size:12px;font-weight:600}
.dockyard-dsh-account-id{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-caption,#8b93a1);font-size:10px}
.dockyard-dsh-account-actions{display:flex;align-items:center;gap:5px;flex:none}
.dockyard-dsh-account-use{height:25px;padding:0 7px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:6px;background:transparent;color:#a5e6dd;cursor:pointer;font:500 10px/18px Inter,var(--dsw-font-family,sans-serif);white-space:nowrap}
.dockyard-dsh-account-use:hover:not(:disabled){background:rgba(121,214,200,.12)}
.dockyard-dsh-account-use:disabled{cursor:default;opacity:.5}
.dockyard-dsh-account-remove{height:25px;padding:0 7px;border:1px solid rgba(255,122,122,.35);border-radius:6px;background:transparent;color:#ff9a83;cursor:pointer;font:500 10px/18px Inter,var(--dsw-font-family,sans-serif);white-space:nowrap}
.dockyard-dsh-account-remove:hover:not(:disabled){border-color:rgba(255,122,122,.7);background:rgba(255,104,104,.12)}
.dockyard-dsh-account-remove:disabled{cursor:default;opacity:.5}
.dockyard-dsh-account-meta{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-caption,#8b93a1);font-size:10px;flex-wrap:wrap}
.dockyard-dsh-health{color:#9ce5dc}.dockyard-dsh-health[data-bad=true]{color:#ff9a83}
.dockyard-dsh-account-note{padding:4px 6px;border-radius:6px;background:rgba(203,183,255,.07);color:var(--dsw-alias-label-caption,#8b93a1);font-size:10px;line-height:15px;text-align:left}
.dockyard-dsh-account-error{max-width:100%;overflow:hidden;color:#ff9a83;font-size:10px;line-height:15px;text-align:left;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-quota{display:flex;flex-direction:column;gap:4px}
.dockyard-dsh-quota-row{display:flex;align-items:center;gap:8px}
.dockyard-dsh-quota-copy{min-width:0;flex:1;color:var(--dsw-alias-label-tertiary,#a9b0ba);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-quota-value{flex:none;color:var(--dsw-alias-label-primary,#f5f7fb);font-size:11px}
.dockyard-dsh-quota-track{height:4px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.1)}
.dockyard-dsh-quota-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#8edbd1,#b59bff)}
.dockyard-dsh-muted{padding:4px 2px;color:var(--dsw-alias-label-caption,#8b93a1);text-align:left}
.dockyard-dsh-candidates{display:flex;flex-direction:column;gap:5px}
.dockyard-dsh-candidate{display:flex;align-items:center;gap:7px;padding:6px 7px;border-radius:7px;background:rgba(255,255,255,.04)}
.dockyard-dsh-candidate-copy{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#c7ccd5)}
.dockyard-dsh-key-notice{padding:7px 8px;border-radius:8px;background:rgba(203,183,255,.08);color:var(--dsw-alias-label-tertiary,#a9b0ba);line-height:17px;text-align:left}
.dockyard-dsh-key-form{--dockyard-dsh-key-control-height:32px;display:flex;width:100%;box-sizing:border-box;align-self:stretch;align-items:stretch;flex-direction:column;gap:6px;padding:9px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));border-radius:10px;background:rgba(255,255,255,.035)}
.dockyard-dsh-key-form-row{display:flex;width:100%;min-width:0;min-height:var(--dockyard-dsh-key-control-height);align-items:stretch;gap:6px}
.dockyard-dsh-key-input{display:block;box-sizing:border-box;width:100%;min-width:0;flex:1 1 auto;height:var(--dockyard-dsh-key-control-height);min-height:var(--dockyard-dsh-key-control-height);margin:0;padding:0 8px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:7px;background:rgba(0,0,0,.12);color:var(--dsw-alias-label-primary,#f5f7fb);font:400 11px/20px Inter,var(--dsw-font-family,sans-serif)}
.dockyard-dsh-key-form>.dockyard-dsh-key-input{flex:0 0 auto}
.dockyard-dsh-key-input::placeholder{color:var(--dsw-alias-label-caption,#8b93a1)}
.dockyard-dsh-key-input:focus{border-color:rgba(121,214,200,.7);outline:0;box-shadow:0 0 0 2px rgba(121,214,200,.12)}
.dockyard-dsh-key-save{box-sizing:border-box;height:var(--dockyard-dsh-key-control-height);min-height:var(--dockyard-dsh-key-control-height);padding:0 9px;border:1px solid rgba(121,214,200,.55);border-radius:7px;background:rgba(121,214,200,.08);color:#a5e6dd;cursor:pointer;font:500 11px/20px Inter,var(--dsw-font-family,sans-serif);white-space:nowrap}
.dockyard-dsh-key-save:hover:not(:disabled){background:rgba(121,214,200,.16)}
.dockyard-dsh-key-save:disabled{cursor:default;opacity:.45}
.dockyard-dsh-key-ref{overflow:hidden;color:var(--dsw-alias-label-caption,#8b93a1);font:400 9px/14px ui-monospace,SFMono-Regular,Menlo,monospace;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-key-source{color:var(--dsw-alias-label-caption,#8b93a1);font-size:10px}
@keyframes dockyard-dsh-pulse{0%,100%{opacity:.45}50%{opacity:1}}
`;

function installStyles() {
  if (typeof document === "undefined" || document.querySelector(`style[data-dockyard-dsh="${STYLE_ID}"]`)) return;
  const tag = document.createElement("style");
  tag.dataset.dockyardDsh = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

const modelGroupFoldState = new Map();

function modelMenuSections(menu) {
  return [...menu.querySelectorAll('section[role="group"]')].filter((section) => section.closest('[role="menu"]') === menu);
}

function syncModelGroupChevron(title, open) {
  let icon = title.querySelector(":scope > .dockyard-dsh-model-group-chevron");
  if (!icon) {
    icon = document.createElement("span");
    icon.className = "dockyard-dsh-chevron dockyard-dsh-model-group-chevron";
    icon.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 14 14");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", DOCKYARD_CHEVRON_PATH);
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    icon.appendChild(svg);
    title.appendChild(icon);
  }
  icon.dataset.open = String(open);
}

function syncModelMenuGroups(menu) {
  for (const section of modelMenuSections(menu)) {
    const labelledBy = section.getAttribute("aria-labelledby");
    const title = [...section.children].find((child) => child.id === labelledBy)
      ?? section.querySelector(".dockyard-dsh-model-group-toggle");
    if (!title) continue;
    const options = [...section.children].filter((child) => child.getAttribute("role") === "menuitemradio");
    if (options.length === 0) continue;
    const key = `${title.textContent?.trim() ?? "provider"}`;
    const stored = modelGroupFoldState.get(key);
    // Large live catalogs stay collapsed even when the current selection is
    // in that provider; the composer already shows the selected model.
    const collapsed = stored === undefined ? options.length > 8 : stored;
    modelGroupFoldState.set(key, collapsed);
    section.dataset.dockyardModelGroupCollapsed = String(collapsed);
    title.classList.add("dockyard-dsh-model-group-toggle");
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.setAttribute("aria-expanded", String(!collapsed));
    title.setAttribute("title", collapsed ? "展开模型" : "折叠模型");
    syncModelGroupChevron(title, !collapsed);
  }
}

/**
 * DSH owns the model menu markup, so provider grouping is decorated at the
 * boundary instead of duplicating or hard-coding the model catalog. The
 * section/title roles are stable API surface; generated CSS classes are not
 * used for the behavior.
 */
function installModelMenuFolding() {
  if (typeof document === "undefined" || !document.body || typeof MutationObserver === "undefined") return () => {};
  const boundMenus = new Set();
  const toggle = (event) => {
    const menu = event.currentTarget;
    const title = event.target?.closest?.(".dockyard-dsh-model-group-toggle");
    if (!title || !menu.contains(title)) return;
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const section = title.closest('section[role="group"]');
    if (!section) return;
    const key = `${title.textContent?.trim() ?? "provider"}`;
    const collapsed = modelGroupFoldState.get(key) === true;
    modelGroupFoldState.set(key, !collapsed);
    syncModelMenuGroups(menu);
  };
  const sync = () => {
    for (const menu of document.querySelectorAll('[role="menu"][aria-label="模型与推理等级"]')) {
      if (!boundMenus.has(menu)) {
        menu.addEventListener("click", toggle);
        menu.addEventListener("keydown", toggle);
        boundMenus.add(menu);
      }
      syncModelMenuGroups(menu);
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  sync();
  return () => {
    observer.disconnect();
    for (const menu of boundMenus) {
      menu.removeEventListener("click", toggle);
      menu.removeEventListener("keydown", toggle);
    }
    boundMenus.clear();
  };
}

function useSnapshot(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

function errorText(error) {
  if (error instanceof Error) return error.message;
  return String(error ?? "未知错误");
}

function refreshResultMessage(result) {
  if (!Array.isArray(result)) return null;
  const failures = result.reduce((count, entry) => count + (Array.isArray(entry?.diagnostics) && entry.diagnostics.length > 0 ? 1 : 0), 0);
  if (result.length === 0) return "没有已连接账号需要刷新。";
  if (failures === 0) return `已刷新 ${result.length} 个账号，额度来自 provider 最新返回。`;
  return `已返回 ${result.length - failures}/${result.length} 个账号；${failures} 个刷新超时或失败，已保留其上次额度。`;
}

function unwrapRemote(response) {
  if (response?.ok === true) return response.value;
  if (response?.ok === false) {
    const detail = response.error?.message ?? response.error?.code ?? "远程操作失败";
    throw new Error(detail);
  }
  return response;
}

function providerFromSnapshot(snapshot, providerId) {
  return snapshot?.providers?.find((provider) => provider.providerId === providerId) ?? null;
}

function providerDisplayName(providerId, manifest) {
  if (providerId === "antigravity") return "Gemini / Antigravity";
  if (providerId === "minimax" || providerId === "minimax-cn") return "MiniMax";
  if (providerId === "deepseek" || providerId === "deepseek-official") return "DeepSeek";
  if (providerId === "openrouter") return "OpenRouter";
  return manifest?.displayName ?? providerId ?? "provider";
}

function connectedAccountSignature(snapshot) {
  if (!Array.isArray(snapshot?.providers)) return "";
  return snapshot.providers.map((provider) => [
    provider.providerId,
    ...(Array.isArray(provider.accounts) ? provider.accounts.map((account) => account?.accountId).filter(Boolean).sort() : []),
  ].join(":")).join("|");
}

function formatDate(value) {
  if (!value) return "未返回";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatNumber(value) {
  if (value === null || value === undefined) return "未知";
  return typeof value === "number" ? new Intl.NumberFormat().format(value) : String(value);
}

function quotaWindowRows(quota) {
  if (!quota || typeof quota !== "object") return [];
  if (Array.isArray(quota.windows) && quota.windows.length > 0) return quota.windows;
  if (quota.remaining !== null || quota.limit !== null || quota.resetAt) return [{
    id: "quota",
    name: quota.unit ?? "额度",
    remaining: quota.remaining,
    limit: quota.limit,
    unit: quota.unit,
    resetAt: quota.resetAt,
    updatedAt: quota.updatedAt,
  }];
  return [];
}

function quotaRowsForAccount(account) {
  return quotaWindowRows(account?.quota);
}

function quotaPercent(window) {
  if (typeof window?.remaining !== "number" || typeof window?.limit !== "number" || window.limit <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((window.remaining / window.limit) * 100)));
}

function quotaSummary(account) {
  const health = account?.health?.status;
  if (health === "expired") return "需重新授权";
  if (health === "exhausted") return "额度耗尽";
  if (health === "degraded" && account?.health?.lastError) return "请求失败";
  const first = quotaRowsForAccount(account)[0];
  const percent = quotaPercent(first);
  if (percent !== null) return `${percent}%`;
  if (first?.remaining !== null && first?.remaining !== undefined) return formatNumber(first.remaining);
  return account ? "已连接" : "未添加";
}

function providerAccount(provider) {
  if (provider?.defaultAccountId) {
    return provider.accounts?.find((account) => account.accountId === provider.defaultAccountId) ?? null;
  }
  return provider?.accounts?.length === 1 ? provider.accounts[0] : null;
}

function providerOverviewSummary(provider) {
  const accounts = provider?.accounts ?? [];
  if (accounts.length === 0) return "未接入 · 点击配置";
  const selected = providerAccount(provider);
  const summary = selected ? quotaSummary(selected) : "已连接";
  return `${accounts.length} 个账号 · ${summary}`;
}

function accountName(account) {
  return account?.email ?? account?.displayName ?? account?.accountId ?? "未知账号";
}

function accountIdentityLine(account) {
  const identitySource = account?.resources?.identitySource;
  if (identitySource === "official_cli_auth_status") return "官方登录态 · 邮箱已识别";
  if (account?.resources?.sessionFingerprint) return `官方会话指纹 · ${account.resources.sessionFingerprint}`;
  return account?.accountId ?? "未知账号";
}

function healthLabel(status) {
  return ({
    healthy: "正常",
    degraded: "异常",
    cooldown: "冷却",
    expired: "需重新授权",
    exhausted: "额度耗尽",
    unknown: "待检查",
  })[status] ?? status ?? "待检查";
}

class DockyardClientController {
  remote;
  store = createSnapshotStore({
    snapshot: null,
    status: "idle",
    action: null,
    providerId: null,
    error: null,
    message: null,
    scan: null,
    auth: null,
  });
  snapshotPromise = null;
  refreshPromises = new Map();
  authTimers = new Map();

  constructor(remote) {
    this.remote = remote;
  }

  setState(next) {
    this.store.update((state) => Object.assign(state, next));
  }

  applyValue(value, providerId = null, { preserveControl = false } = {}) {
    const hasEnvelope = value && typeof value === "object" && Object.hasOwn(value, "snapshot");
    const snapshot = hasEnvelope ? value.snapshot : value;
    if (snapshot?.providers) this.setState({ snapshot });
    if (!hasEnvelope) return value;
    const result = value.result;
    if (preserveControl) {
      const next = {};
      if (result?.providers) next.scan = result;
      if (result?.scan?.providers) next.scan = result.scan;
      this.setState(next);
      return result;
    }
    const next = {
      providerId,
      action: null,
      status: "ready",
      error: null,
      // Login status belongs to the previous auth operation. Clear it when a
      // refresh/scan/add/remove result arrives so an old "unsupported" notice
      // cannot survive after the account was removed or discovered again.
      auth: null,
    };
    if (result?.status) {
      next.auth = result.status === "completed" ? null : {
        providerId: result.providerId ?? providerId,
        sessionId: result.sessionId ?? null,
        status: result.status,
        authorizationUrl: result.authorizationUrl ?? null,
        instructions: result.instructions ?? null,
        inputRequired: result.inputRequired === true,
        diagnostic: result.diagnostic ?? null,
      };
      if (result.diagnostic) next.message = result.diagnostic;
      else if (result.instructions && result.status !== "opened") next.message = result.instructions;
      else if (result.status === "completed") next.message = "官方 OAuth 已完成，账号池已更新。";
      else if (["failed", "error"].includes(result.status)) {
        next.error = result.diagnostic ?? result.instructions ?? "官方 OAuth 验证失败，请重新授权。";
      }
    }
    if (result?.providers) next.scan = result;
    if (result?.scan?.providers) next.scan = result.scan;
    this.setState(next);
    return result;
  }

  async call(method, ...args) {
    const fn = this.remote?.[method];
    if (typeof fn !== "function") throw new Error(`Dockyard Remote 尚未挂载：${method}`);
    return unwrapRemote(await fn(...args));
  }

  async ensureSnapshot() {
    const current = this.store.getSnapshot().snapshot;
    if (current?.providers) return current;
    if (this.snapshotPromise) return this.snapshotPromise;
    this.setState({ status: "loading", error: null });
    this.snapshotPromise = this.call("snapshot")
      .then((value) => {
        const snapshot = this.applyValue(value);
        this.setState({ status: "ready", error: null });
        return snapshot;
      })
      .catch((error) => {
        this.setState({ status: "error", error: errorText(error) });
        throw error;
      })
      .finally(() => {
        this.snapshotPromise = null;
      });
    return this.snapshotPromise;
  }

  async ensure(providerId) {
    const current = await this.ensureSnapshot();
    return providerId ? providerFromSnapshot(current, providerId) ?? current : current;
  }

  async refresh(providerId) {
    const existing = this.refreshPromises.get(providerId);
    if (existing) return existing;

    const promise = (async () => {
      this.setState({ action: "refresh", status: "loading", providerId, error: null, message: null });
      try {
        const value = await this.call("refresh", { providerId });
        const result = this.applyValue(value, providerId);
        this.setState({ message: refreshResultMessage(result) });
        return result;
      } catch (error) {
        this.setState({ action: null, status: "error", providerId, error: errorText(error) });
        return null;
      }
    })();
    this.refreshPromises.set(providerId, promise);
    try {
      return await promise;
    } finally {
      if (this.refreshPromises.get(providerId) === promise) this.refreshPromises.delete(providerId);
    }
  }

  async refreshAll() {
    const existing = this.refreshPromises.get("*");
    if (existing) return existing;

    const promise = (async () => {
      this.setState({ action: "refresh", status: "loading", providerId: null, error: null, message: null });
      try {
        const value = await this.call("refresh", {});
        const result = this.applyValue(value);
        this.setState({ message: refreshResultMessage(result) });
        return result;
      } catch (error) {
        this.setState({ action: null, status: "error", providerId: null, error: errorText(error) });
        return null;
      }
    })();
    this.refreshPromises.set("*", promise);
    try {
      return await promise;
    } finally {
      if (this.refreshPromises.get("*") === promise) this.refreshPromises.delete("*");
    }
  }

  async scan(providerId) {
    this.setState({ action: "scan", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("scan", { providerId });
      const result = this.applyValue(value, providerId);
      this.setState({ scan: result, action: null, status: "ready" });
      return result;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      return null;
    }
  }

  async refreshDiscovery(providerId) {
    try {
      const value = await this.call("scan", { providerId });
      return { result: this.applyValue(value, providerId, { preserveControl: true }), error: null };
    } catch (error) {
      return { result: null, error: errorText(error) };
    }
  }

  async add(providerId, candidateId) {
    this.setState({ action: "add", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("add", { providerId, ...(candidateId ? { candidateId } : {}) });
      const result = this.applyValue(value, providerId);
      const count = result?.accounts?.length ?? 0;
      const discovery = await this.refreshDiscovery(providerId);
      const scanNotice = discovery.error ? `发现登陆态刷新失败：${discovery.error}` : null;
      this.setState({ message: scanNotice ?? (count ? `已添加 ${count} 个账号。` : "没有新的 OAuth 候选。") });
      return result;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      return null;
    }
  }

  async login(providerId) {
    const current = this.store.getSnapshot();
    if (current.auth?.providerId === providerId
      && ["pending", "processing"].includes(current.auth.status)
      && current.auth.sessionId) {
      this.scheduleAuth(providerId, current.auth.sessionId);
      this.setState({ action: null, status: "ready", error: null, message: "已有登录验证进行中，请使用当前 Google 页面；不会重复打开。" });
      return current.auth;
    }
    this.setState({ action: "login", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("login", { providerId });
      const result = this.applyValue(value, providerId);
      if (["pending", "processing"].includes(result?.status) && result.sessionId) {
        this.scheduleAuth(providerId, result.sessionId);
      }
      return result;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      return null;
    }
  }

  async submitAuthorizationCode(providerId, sessionId, code) {
    this.setState({ action: "auth-code", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("submitAuthorizationCode", { providerId, sessionId, code });
      const result = this.applyValue(value, providerId);
      if (["pending", "processing"].includes(result?.status) && result.sessionId) {
        this.scheduleAuth(providerId, result.sessionId);
        this.setState({ message: "授权码已提交，正在等待 Google 验证结果…" });
      }
      return result;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      return null;
    }
  }

  scheduleAuth(providerId, sessionId) {
    if (this.authTimers.has(sessionId)) return;
    let attempts = 0;
    const tick = async () => {
      this.authTimers.delete(sessionId);
      if (++attempts > 180) return;
      try {
        const value = await this.call("poll", { providerId, sessionId });
        const result = this.applyValue(value, providerId);
        if (["pending", "processing"].includes(result?.status)) {
          const timer = setTimeout(tick, 1000);
          this.authTimers.set(sessionId, timer);
        }
      } catch (error) {
        this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      }
    };
    this.authTimers.set(sessionId, setTimeout(tick, 1000));
  }

  async cancelAuthorization(providerId, sessionId) {
    const timer = this.authTimers.get(sessionId);
    if (timer) clearTimeout(timer);
    this.authTimers.delete(sessionId);
    this.setState({ action: "cancel", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("cancel", { providerId, sessionId });
      this.applyValue(value, providerId);
      this.setState({ auth: null, action: null, status: "ready", message: "本次登录验证已取消。" });
      return value;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      return null;
    }
  }

  async selectAccount(providerId, accountId) {
    this.setState({ action: "use", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("setPolicy", { providerId, policy: "manual", defaultAccountId: accountId });
      this.applyValue(value, providerId);
      this.setState({ message: "已切换为手动账号。" });
      return value;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      return null;
    }
  }

  async removeAccount(providerId, accountId) {
    this.setState({ action: "remove", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("removeAccount", { providerId, accountId });
      const result = this.applyValue(value, providerId);
      const diagnostics = result?.diagnostics?.length ? `（${result.diagnostics.join("；")}）` : "";
      const discovery = await this.refreshDiscovery(providerId);
      const scanNotice = discovery.error ? `；发现登陆态刷新失败：${discovery.error}` : "";
      const provider = providerFromSnapshot(this.store.getSnapshot().snapshot, providerId);
      const supportsOAuthLogin = provider?.manifest?.capabilities?.includes("oauth_authorization");
      const reentry = supportsOAuthLogin
        ? "如需重新接入，请点击重新授权。"
        : "如需重新接入，请先在官方环境完成登录，再扫描本机登录态。";
      this.setState({ auth: null, message: `账号已移除${diagnostics}${scanNotice}；${reentry}` });
      return value;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      return null;
    }
  }

  async setPolicy(providerId, policy) {
    this.setState({ action: "policy", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("setPolicy", { providerId, policy });
      this.applyValue(value, providerId);
      this.setState({ message: `账号策略已设置为${POLICY_LABELS[policy] ?? policy}。` });
      return value;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error) });
      return null;
    }
  }

  dispose() {
    for (const timer of this.authTimers.values()) clearTimeout(timer);
    this.authTimers.clear();
  }
}

function modelDetails(directoryState, providerId = null) {
  const selected = directoryState?.current ?? null;
  const targetProviderId = providerId ?? selected?.provider ?? null;
  const group = targetProviderId
    ? directoryState?.groups?.find((entry) => entry.id === targetProviderId) ?? null
    : null;
  // A provider popup can be opened from the subscription overview while the
  // chat is still using another provider. Never leak that other provider's
  // model, context, or effort tiers into this popup.
  const current = selected && (!providerId || selected.provider === providerId) ? selected : null;
  if (!current) return { current: null, group, model: null, efforts: [] };
  const model = group?.models?.find((entry) => entry.id === current.model) ?? null;
  const efforts = model?.reasoning?.efforts ?? [];
  return { current, group, model, efforts };
}

function ChevronIcon({ open }) {
  return h("span", {
    className: "dockyard-dsh-chevron",
    "data-open": Boolean(open),
    "aria-hidden": true,
  }, h("svg", {
    viewBox: "0 0 14 14",
    focusable: "false",
    "aria-hidden": true,
  }, h("path", {
    d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
    fill: "currentColor",
  })));
}

function quotaView(account) {
  const rows = quotaRowsForAccount(account);
  if (rows.length === 0) return h("div", { className: "dockyard-dsh-muted" }, "provider 尚未返回额度窗口");
  return h("div", { className: "dockyard-dsh-quota" }, rows.map((window, index) => {
    const percent = quotaPercent(window);
    const value = window.limit === null || window.limit === undefined
      ? formatNumber(window.remaining)
      : `${formatNumber(window.remaining)} / ${formatNumber(window.limit)}`;
    const unit = window.unit ? ` ${window.unit}` : "";
    return h("div", { key: `${window.id ?? "quota"}-${index}` },
      h("div", { className: "dockyard-dsh-quota-row" },
        h("span", { className: "dockyard-dsh-quota-copy" }, `${window.name ?? window.id ?? "额度"}${unit}`),
        h("span", { className: "dockyard-dsh-quota-value" }, percent === null ? value : `${percent}%`)),
      percent === null ? null : h("div", { className: "dockyard-dsh-quota-track" },
        h("div", { className: "dockyard-dsh-quota-fill", style: { width: `${percent}%` } })),
      h("div", { className: "dockyard-dsh-muted" }, `重置：${formatDate(window.resetAt)} · 更新：${formatDate(window.updatedAt)}`));
  }));
}

function AccountCard({ account, current, providerId, controller, busy }) {
  const health = account?.health?.status;
  return h("div", { className: "dockyard-dsh-account", "data-current": current },
    h("div", { className: "dockyard-dsh-account-head" },
      h("div", { className: "dockyard-dsh-account-identity" },
        h("div", { className: "dockyard-dsh-account-name" }, accountName(account)),
        h("div", { className: "dockyard-dsh-account-id" }, accountIdentityLine(account))),
      h("div", { className: "dockyard-dsh-account-actions" },
        h("button", {
          type: "button",
          className: "dockyard-dsh-account-use",
          disabled: busy || current,
          onClick: () => controller.selectAccount(providerId, account.accountId),
        }, current ? "当前账号" : "手动使用"),
        h("button", {
          type: "button",
          className: "dockyard-dsh-account-remove",
          disabled: busy,
          onClick: () => {
            if (typeof window !== "undefined" && !window.confirm(`确认移除账号 ${accountName(account)}？这会从 Dockyard DSH 账号池和本机 Keychain 引用中删除。`)) return;
            controller.removeAccount(providerId, account.accountId);
          },
        }, "移除"))),
    h("div", { className: "dockyard-dsh-account-meta" },
      h("span", { className: "dockyard-dsh-health", "data-bad": ["degraded", "cooldown", "expired", "exhausted"].includes(health) }, `${healthLabel(health)} · ${account.subscription?.plan ?? "订阅未返回"}`),
      account.refresh?.nextRefreshAt ? h("span", null, `OAuth：${formatDate(account.refresh.nextRefreshAt)}`) : null),
    account.resources?.identityNote ? h("div", { className: "dockyard-dsh-account-note" }, account.resources.identityNote) : null,
    account.health?.lastError ? h("div", { className: "dockyard-dsh-account-error", title: account.health.lastError }, account.health.lastError) : null,
    quotaView(account));
}

function candidateMatchesAccount(candidate, account) {
  if (!candidate || !account) return false;
  if (candidate.accountId && account.accountId) return candidate.accountId === account.accountId;
  const candidateEmail = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const accountEmail = typeof account.email === "string" ? account.email.trim().toLowerCase() : "";
  return Boolean(candidateEmail && accountEmail && candidateEmail === accountEmail);
}

function CandidateList({ scan, providerId, controller, busy, accounts = [] }) {
  const provider = scan?.providers?.find((entry) => entry.providerId === providerId);
  const candidates = provider?.candidates ?? [];
  const availableCandidates = candidates.filter((candidate) => (
    !candidate.imported && !accounts.some((account) => candidateMatchesAccount(candidate, account))
  ));
  if (availableCandidates.length === 0) {
    return h("div", { className: "dockyard-dsh-muted" }, provider?.diagnostics?.join("；") ?? "没有发现新的本机 OAuth 登录态");
  }
  return h("div", { className: "dockyard-dsh-candidates" }, availableCandidates.map((candidate) => h("div", {
    className: "dockyard-dsh-candidate",
    key: candidate.candidateId,
  },
    h("span", { className: "dockyard-dsh-candidate-copy" }, candidate.email ?? candidate.displayName ?? candidate.candidateId),
    h("button", {
      type: "button",
      className: "dockyard-dsh-action",
      disabled: busy,
      onClick: () => controller.add(providerId, candidate.candidateId),
    }, "添加"))));
}

function AntigravityLoginGuide({ auth, providerId, controller, busy }) {
  const [code, setCode] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim() || busy || !auth?.sessionId) return;
    const result = await controller.submitAuthorizationCode(providerId, auth.sessionId, code);
    if (result) setCode("");
  };
  return h("div", { className: "dockyard-dsh-login-guide" },
    h("div", { className: "dockyard-dsh-login-guide-title" }, "Google 验证登录 Antigravity"),
    h("div", { className: "dockyard-dsh-login-guide-copy" }, "DSH 已在后台启动 agy 官方验证流程，不需要客户端或终端："),
    h("ol", { className: "dockyard-dsh-login-guide-steps" },
      h("li", { className: "dockyard-dsh-login-guide-step" },
        h("span", { className: "dockyard-dsh-login-guide-number" }, "1"),
        h("span", null, "在自动打开的 Google 页面选择要添加的账号并完成验证。")),
      h("li", { className: "dockyard-dsh-login-guide-step" },
        h("span", { className: "dockyard-dsh-login-guide-number" }, "2"),
        h("span", null, "验证完成后回到这里，DSH 会自动接入账号和额度。")),
      h("li", { className: "dockyard-dsh-login-guide-step" },
        h("span", { className: "dockyard-dsh-login-guide-number" }, "3"),
        h("span", null, "如果浏览器没有自动回调，把页面给出的授权码或回调地址粘贴到下面。"))),
    h("form", { className: "dockyard-dsh-login-guide-code", onSubmit: submit },
      h("input", {
        value: code,
        disabled: busy,
        onChange: (event) => setCode(event.target.value),
        placeholder: "授权码 / 回调地址（可选）",
        "aria-label": "Google 授权码或回调地址",
      }),
      h("button", { type: "submit", className: "dockyard-dsh-action", disabled: busy || !code.trim() }, "提交验证")),
    auth?.authorizationUrl && typeof window !== "undefined"
      ? h("button", { type: "button", className: "dockyard-dsh-action", onClick: () => window.open(auth.authorizationUrl, "_blank", "noopener,noreferrer") }, "重新打开验证页")
      : null,
    auth?.sessionId && ["pending", "processing"].includes(auth.status)
      ? h("button", {
        type: "button",
        className: "dockyard-dsh-action dockyard-dsh-action-danger",
        disabled: busy,
        onClick: () => controller.cancelAuthorization(providerId, auth.sessionId),
      }, busy ? "取消中…" : "取消本次登录")
      : null,
    auth?.diagnostic ? h("div", { className: "dockyard-dsh-login-guide-error" }, auth.diagnostic) : null);
}

function nativeQuotaView(native) {
  const usage = native?.usage ?? native?.entry?.usage ?? null;
  if (usage?.status === "unsupported") {
    return h("div", { className: "dockyard-dsh-muted" }, usage.message ?? "provider 官方未提供实时额度接口");
  }
  if (usage?.status === "error") {
    return h("div", { className: "dockyard-dsh-muted", "data-error": true }, `额度读取失败：${usage.message ?? "未知错误"}`);
  }
  if (usage?.status === "unconfigured") {
    return h("div", { className: "dockyard-dsh-muted" }, usage.message ?? "该 Key 尚未配置");
  }
  const quota = native?.quota ?? native?.entry?.quota ?? null;
  if (quota) return quotaView({ quota });
  return h("div", { className: "dockyard-dsh-muted" }, "当前 provider 未返回额度窗口；这里不会猜测或显示伪造百分比。");
}

function NativeKeyCard({ entry, providerId, controller, busy }) {
  const configured = entry?.configured === true;
  const current = entry?.active === true;
  const writable = entry?.credential?.writable !== false;
  return h("div", { className: "dockyard-dsh-account", "data-current": current },
    h("div", { className: "dockyard-dsh-account-head" },
      h("div", { className: "dockyard-dsh-account-identity" },
        h("div", { className: "dockyard-dsh-account-name" }, entry?.label ?? entry?.ref ?? "Key"),
        h("div", { className: "dockyard-dsh-key-ref", title: entry?.ref }, entry?.ref)),
      h("div", { className: "dockyard-dsh-account-actions" },
        h("button", {
          type: "button",
          className: "dockyard-dsh-account-use",
          disabled: busy || current || !configured,
          onClick: () => controller.selectKey(providerId, entry.ref),
        }, current ? "当前 Key" : "手动使用"),
        h("button", {
          type: "button",
          className: "dockyard-dsh-account-remove",
          disabled: busy,
          title: writable ? "从 DSH Credentials 移除" : "仅解除 provider 引用，不删除原始文件凭证",
          onClick: () => {
            const action = writable ? "从 DSH Credentials 中删除该 Key" : "解除 provider 对该 Key 的引用（原始文件凭证会保留）";
            if (typeof window !== "undefined" && !window.confirm(`确认${action}：${entry?.label ?? entry?.ref}？`)) return;
            controller.removeKey(providerId, entry.ref);
          },
        }, writable ? "移除" : "解除引用"))),
    h("div", { className: "dockyard-dsh-account-meta" },
      h("span", { className: configured ? "dockyard-dsh-health" : "dockyard-dsh-health", "data-bad": !configured }, configured ? "已配置" : "未配置"),
      entry?.credential?.source ? h("span", { className: "dockyard-dsh-key-source" }, `来源：${entry.credential.source}`) : null,
      entry?.implicit ? h("span", { className: "dockyard-dsh-key-source" }, "来自当前 provider 配置") : null),
    entry?.usage ? nativeQuotaView(entry) : null);
}

function NativeKeyPopup({ providerId, native, directory, directoryState, nativeController, onClose }) {
  const [tierBusy, setTierBusy] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const { current, group, model, efforts } = modelDetails(directoryState, providerId);
  const modelLabel = model?.name ?? current?.model ?? "未选择模型";
  const tier = current?.reasoningEffort ?? model?.reasoning?.defaultEffort ?? null;
  const busy = native.action !== null;
  const keys = native.keys ?? [];
  const configuredCount = keys.filter((entry) => entry.configured).length;

  const chooseTier = async (value) => {
    if (!current || !directory || tierBusy) return;
    setTierBusy(true);
    try {
      await directory.select({ ...current, reasoningEffort: value });
    } finally {
      setTierBusy(false);
    }
  };

  const addKey = async () => {
    if (!keyDraft.trim() || busy) return;
    const added = await nativeController.addKey(providerId, keyDraft, labelDraft);
    if (added) {
      setKeyDraft("");
      setLabelDraft("");
    }
  };

  const title = native.entry?.displayName ?? group?.name ?? providerId;
  return h("div", {
    className: "dockyard-dsh-popup",
    role: "dialog",
    "aria-label": `${title} Key 与额度管理`,
    onMouseDown: (event) => event.stopPropagation(),
  },
    h("div", { className: "dockyard-dsh-head" },
      h("div", { className: "dockyard-dsh-head-copy" },
        h("div", { className: "dockyard-dsh-eyebrow" }, "DOCKYARD KEY PROVIDER"),
        h("div", { className: "dockyard-dsh-title" }, title),
        h("div", { className: "dockyard-dsh-model", title: current?.model }, `${modelLabel}${current?.model && modelLabel !== current.model ? ` · ${current.model}` : ""}`),
        model?.description ? h("div", { className: "dockyard-dsh-model-context" }, model.description) : null),
      h("button", { type: "button", className: "dockyard-dsh-close", onClick: onClose, "aria-label": "关闭" }, "×")),
    h("div", {
      className: "dockyard-dsh-status",
      "data-error": Boolean(native.error),
      "data-success": Boolean(native.message && !native.error),
      role: native.error ? "alert" : "status",
    }, h("span", { className: "dockyard-dsh-status-copy" }, native.error ?? native.message ?? (native.status === "loading" ? "正在读取 DSH provider 状态…" : "状态来自 DSH 原生 provider 配置与 Credentials"))),
      h("div", { className: "dockyard-dsh-popup-scroll" },
      h("div", { className: "dockyard-dsh-toolbar" },
        h("button", { type: "button", className: "dockyard-dsh-action dockyard-dsh-action-primary", disabled: busy, onClick: () => nativeController.refresh(providerId) }, native.action === "refresh" ? "刷新中…" : "↻ 实时刷新")),
      h("div", { className: "dockyard-dsh-key-notice" }, native.runtimeMode === "request-key-pool"
        ? "API Key 只通过 DSH Credentials 保存，不会回显，也不会写入浏览器存储。当前已接入请求级 Key 池：手动、轮询和失败转移不会改写 provider 的激活配置。"
        : "API Key 只通过 DSH Credentials 保存，不会回显，也不会写入浏览器存储。当前 DSH 适配器未暴露请求级 Key 池，暂只能手动切换激活 Key。"),
      h("div", { className: "dockyard-dsh-field" },
        h("span", { className: "dockyard-dsh-field-label" }, "Key 策略"),
        h("select", {
          className: "dockyard-dsh-select",
          value: native.policy ?? "manual",
          disabled: busy,
          onChange: (event) => { void nativeController.setPolicy(providerId, event.target.value); },
        },
          h("option", { value: "manual" }, NATIVE_KEY_POLICY_LABELS.manual),
          h("option", { value: "round_robin", disabled: native.runtimeMode !== "request-key-pool" }, NATIVE_KEY_POLICY_LABELS.round_robin),
          h("option", { value: "failover", disabled: native.runtimeMode !== "request-key-pool" }, NATIVE_KEY_POLICY_LABELS.failover))),
      h("div", { className: "dockyard-dsh-key-form" },
        h("div", { className: "dockyard-dsh-section-title" }, h("span", null, "添加新的 API Key"), h("span", { className: "dockyard-dsh-section-value" }, "写入 DSH Credentials")),
        h("div", { className: "dockyard-dsh-key-form-row" },
          h("input", {
            className: "dockyard-dsh-key-input",
            type: "password",
            value: keyDraft,
            placeholder: "粘贴 API Key",
            autoComplete: "off",
            onChange: (event) => setKeyDraft(event.target.value),
          }),
          h("button", { type: "button", className: "dockyard-dsh-key-save", disabled: busy || !keyDraft.trim(), onClick: addKey }, native.action === "add" ? "保存中…" : "添加并启用")),
        h("input", {
          className: "dockyard-dsh-key-input",
          type: "text",
          value: labelDraft,
          placeholder: "名称（可选，例如工作 Key）",
          onChange: (event) => setLabelDraft(event.target.value),
        })),
      efforts.length > 0 ? h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" }, h("span", null, "当前模型档位"), h("span", { className: "dockyard-dsh-section-value" }, "来自实时 catalog")),
        h("div", { className: "dockyard-dsh-tier-list" }, efforts.map((effort) => h("button", {
          type: "button",
          className: "dockyard-dsh-tier",
          "data-active": tier === effort.id,
          disabled: tierBusy,
          key: effort.id,
          title: effort.description ?? effort.id,
          onClick: () => chooseTier(effort.id),
        }, effort.name ?? effort.id)))) : null,
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" }, h("span", null, "已配置 Key"), h("span", { className: "dockyard-dsh-section-value" }, `${configuredCount}`)),
        keys.length === 0
          ? h("div", { className: "dockyard-dsh-muted" }, "当前 provider 还没有配置 API Key。")
          : keys.map((entry) => h(NativeKeyCard, {
            key: entry.ref,
            entry,
            providerId,
            controller: nativeController,
            busy,
          }))),
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" }, h("span", null, "额度窗口"), h("span", { className: "dockyard-dsh-section-value" }, "provider 实时返回")),
        nativeQuotaView(native))));
}

function SubscriptionOverviewPopup({ providers, directoryState, controlState, controller, selectedProviderId, onSelect, onClose }) {
  const busy = controlState.action !== null;
  return h("div", {
    className: "dockyard-dsh-popup",
    role: "dialog",
    "aria-label": "订阅管理",
    onMouseDown: (event) => event.stopPropagation(),
  },
    h("div", { className: "dockyard-dsh-head" },
      h("div", { className: "dockyard-dsh-head-copy" },
        h("div", { className: "dockyard-dsh-eyebrow" }, "DOCKYARD SUBSCRIPTIONS"),
        h("div", { className: "dockyard-dsh-title" }, "订阅管理"),
        h("div", { className: "dockyard-dsh-model" }, "选择一个厂商，进入登录、账号和额度配置")),
      h("button", { type: "button", className: "dockyard-dsh-close", onClick: onClose, "aria-label": "关闭" }, "×")),
    h("div", {
      className: "dockyard-dsh-status",
      "data-error": Boolean(controlState.error),
      "data-success": Boolean(controlState.message && !controlState.error),
      role: controlState.error ? "alert" : "status",
    },
      h("span", { className: "dockyard-dsh-status-copy" }, controlState.error ?? controlState.message ?? (controlState.status === "loading"
        ? "正在读取订阅厂商…"
        : "接入账号后，模型会自动出现在模型选择器中。"))),
    h("div", { className: "dockyard-dsh-popup-scroll" },
      h("div", { className: "dockyard-dsh-toolbar" },
        h("button", {
          type: "button",
          className: "dockyard-dsh-action dockyard-dsh-action-primary",
          disabled: busy,
          onClick: () => controller.refreshAll(),
        }, controlState.action === "refresh" ? "刷新中…" : "↻ 刷新全部额度")),
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" },
          h("span", null, "订阅厂商"),
          h("span", { className: "dockyard-dsh-section-value" }, `${providers.length} 个`)),
        providers.length === 0
          ? h("div", { className: "dockyard-dsh-muted" }, "暂未发现可用的订阅厂商。")
          : h("div", { className: "dockyard-dsh-provider-list" }, providers.map((provider) => {
            const providerId = provider.providerId;
            const group = directoryState?.groups?.find((entry) => entry.id === providerId);
            const modelCount = Array.isArray(group?.models) ? `${group.models.length} 个模型` : "模型目录待加载";
            const displayName = providerDisplayName(providerId, provider.manifest);
            return h("button", {
              type: "button",
              className: "dockyard-dsh-provider-row",
              "data-current": providerId === selectedProviderId,
              key: providerId,
              onClick: () => onSelect(providerId),
              "aria-label": `配置${displayName}`,
            },
              h("span", { className: "dockyard-dsh-provider-row-copy" },
                h("span", { className: "dockyard-dsh-provider-row-name" }, displayName),
                h("span", { className: "dockyard-dsh-provider-row-meta" }, `${providerOverviewSummary(provider)} · ${modelCount}`)),
              h("span", { className: "dockyard-dsh-provider-row-arrow", "aria-hidden": true }, "›"));
          })))));
}

function DockyardPopup({ providerId, provider, directory, directoryState, controlState, controller, onOpenOverview, onClose }) {
  const [tierBusy, setTierBusy] = useState(false);
  const { current, group, model, efforts } = modelDetails(directoryState, providerId);
  const modelLabel = model?.name ?? current?.model ?? "未选择模型";
  const tier = current?.reasoningEffort ?? model?.reasoning?.defaultEffort ?? null;
  const accounts = provider?.accounts ?? [];
  const activeId = provider?.defaultAccountId ?? null;
  const busy = controlState.action !== null;
  const authInProgress = controlState.auth?.providerId === providerId
    && ["pending", "processing"].includes(controlState.auth?.status)
    && Boolean(controlState.auth?.sessionId);
  const needsReauthorization = accounts.some((account) => account?.health?.status === "expired");
  const supportsOAuthLogin = provider?.manifest?.capabilities?.includes("oauth_authorization");

  const chooseTier = async (value) => {
    if (!current || !directory || tierBusy) return;
    setTierBusy(true);
    try {
      await directory.select({ ...current, reasoningEffort: value });
    } finally {
      setTierBusy(false);
    }
  };

  return h("div", {
    className: "dockyard-dsh-popup",
    role: "dialog",
    "aria-label": `${providerDisplayName(providerId, provider?.manifest)} 账号管理`,
    onMouseDown: (event) => event.stopPropagation(),
  },
    h("div", { className: "dockyard-dsh-head" },
      h("div", { className: "dockyard-dsh-head-copy" },
        h("div", { className: "dockyard-dsh-eyebrow" }, "DOCKYARD SUBSCRIPTION"),
        h("div", { className: "dockyard-dsh-title" }, providerDisplayName(providerId, provider?.manifest) || group?.name),
        h("div", { className: "dockyard-dsh-model", title: current?.model }, `${modelLabel}${current?.model && modelLabel !== current.model ? ` · ${current.model}` : ""}`),
        model?.description ? h("div", { className: "dockyard-dsh-model-context" }, model.description) : null),
      h("button", { type: "button", className: "dockyard-dsh-close", onClick: onClose, "aria-label": "关闭" }, "×")),
    h("div", {
      className: "dockyard-dsh-status",
      "data-error": Boolean(controlState.error),
      "data-success": Boolean(controlState.message && !controlState.error),
      role: controlState.error ? "alert" : "status",
    },
      h("span", { className: "dockyard-dsh-status-copy" }, controlState.error ?? controlState.message ?? (controlState.status === "loading" ? "正在读取 provider 实时状态…" : "状态来自当前 provider 的 OAuth 与额度数据"))),
    h("div", { className: "dockyard-dsh-popup-scroll" },
      providerId === "antigravity" ? h("div", { className: "dockyard-dsh-account-note" }, "添加账号时，DSH 会自动打开 Google 官方验证页；选择账号后会自动接入额度，不需要客户端或终端。") : null,
      h("div", { className: "dockyard-dsh-toolbar" },
        h("button", { type: "button", className: "dockyard-dsh-action", disabled: busy, onClick: onOpenOverview }, "全部订阅"),
        h("button", { type: "button", className: "dockyard-dsh-action dockyard-dsh-action-primary", disabled: busy, onClick: () => controller.refresh(providerId) }, controlState.action === "refresh" ? "刷新中…" : "↻ 实时刷新"),
        h("button", { type: "button", className: "dockyard-dsh-action", disabled: busy || authInProgress, onClick: () => controller.login(providerId) }, controlState.action === "login" ? (supportsOAuthLogin ? "等待验证…" : "读取说明…") : authInProgress ? "验证进行中…" : needsReauthorization && supportsOAuthLogin ? "↻ 重新授权" : supportsOAuthLogin ? "＋ 登录添加账号" : "官方登录说明"),
        h("button", { type: "button", className: "dockyard-dsh-action", disabled: busy, onClick: () => controller.scan(providerId) }, controlState.action === "scan" ? "扫描中…" : "扫描本机登录态")),
      controlState.auth?.providerId === providerId
        ? providerId === "antigravity"
          ? h(AntigravityLoginGuide, { auth: controlState.auth, providerId, controller, busy })
          : h("div", { className: "dockyard-dsh-status dockyard-dsh-auth-status" },
            h("span", { className: "dockyard-dsh-status-copy" }, `${controlState.auth.status}${controlState.auth.instructions ? ` · ${controlState.auth.instructions}` : ""}`),
            controlState.auth.authorizationUrl && typeof window !== "undefined" ? h("button", { type: "button", className: "dockyard-dsh-action", title: "打开官方授权页面", onClick: () => window.open(controlState.auth.authorizationUrl, "_blank", "noopener,noreferrer") }, "授权") : null,
            controlState.auth.diagnostic ? h("span", { className: "dockyard-dsh-status-copy dockyard-dsh-auth-diagnostic" }, controlState.auth.diagnostic) : null)
        : null,
      h("div", { className: "dockyard-dsh-field" },
        h("span", { className: "dockyard-dsh-field-label" }, "账号策略"),
        h("select", {
          className: "dockyard-dsh-select",
          value: provider?.policy ?? "round_robin",
          disabled: busy,
          onChange: (event) => controller.setPolicy(providerId, event.target.value),
        }, Object.entries(POLICY_LABELS).map(([value, label]) => h("option", { value, key: value }, label)))),
      efforts.length > 0 ? h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" }, h("span", null, "当前模型档位"), h("span", { className: "dockyard-dsh-section-value" }, "来自实时 catalog")),
        h("div", { className: "dockyard-dsh-tier-list" }, efforts.map((effort) => h("button", {
          type: "button",
          className: "dockyard-dsh-tier",
          "data-active": tier === effort.id,
          disabled: tierBusy,
          key: effort.id,
          title: effort.description ?? effort.id,
          onClick: () => chooseTier(effort.id),
        }, effort.name ?? effort.id)))) : null,
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" }, h("span", null, "已连接账号"), h("span", { className: "dockyard-dsh-section-value" }, `${accounts.length}`)),
        accounts.length === 0
          ? h("div", { className: "dockyard-dsh-muted" }, supportsOAuthLogin
            ? "还没有账号；点击“登录添加账号”后会打开 provider 官方验证页。"
            : "还没有账号；请先在官方环境完成登录，再扫描本机登录态并添加候选。")
          : accounts.map((account) => h(AccountCard, {
            key: account.accountId,
            account,
            current: account.accountId === activeId,
            providerId,
            controller,
            busy,
          }))),
      controlState.scan ? h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" }, h("span", null, "本机 OAuth 候选")),
        h(CandidateList, { scan: controlState.scan, providerId, controller, busy, accounts })) : null));
}

function DockyardAccountControl({ directory, modelDirectory, controller, nativeController }) {
  const directoryState = useSnapshot(directory);
  const controlState = useSnapshot(controller.store);
  const nativeState = useSnapshot(nativeController.store);
  const [open, setOpen] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [detailProviderId, setDetailProviderId] = useState(null);
  const rootRef = useRef(null);
  const accountSignatureRef = useRef(undefined);
  const modelSelectionSignatureRef = useRef(undefined);
  const { current, group, model } = modelDetails(directoryState);
  const currentProviderId = current?.provider ?? null;
  const modelSelectionSignature = JSON.stringify([
    current?.provider ?? null,
    current?.model ?? null,
  ]);
  const providers = controlState.snapshot?.providers ?? [];
  const currentProvider = providerFromSnapshot(controlState.snapshot, currentProviderId);
  const currentNative = nativeState.providerId === currentProviderId && nativeState.native ? nativeState : null;
  const currentNativeLoading = nativeState.providerId === currentProviderId
    && ["loading", "error"].includes(nativeState.status);
  const providerId = showOverview ? null : detailProviderId ?? currentProviderId;
  const provider = providerFromSnapshot(controlState.snapshot, providerId);
  // Providers absent from the OAuth/account snapshot are DSH-native Key
  // providers. Render their management surface immediately in a loading state
  // while the native settings request is in flight; falling back to the
  // subscription overview here made a model switch look like a stale
  // subscription state until the user clicked again.
  const snapshotReady = Array.isArray(controlState.snapshot?.providers);
  const nativeCandidate = Boolean(providerId && (
    nativeState.providerId === providerId
    || (snapshotReady && !provider)
  ));
  const native = nativeState.providerId === providerId && nativeState.native
    ? nativeState
    : nativeCandidate
      ? nativeState.providerId === providerId
        ? nativeState
        : {
          providerId,
          status: "loading",
          action: "refresh",
          entry: null,
          namespace: null,
          profile: null,
          settingsPath: [],
          apiKeyRef: null,
          keys: [],
          policy: "manual",
          native: false,
          runtimeMode: "request-key-pool",
          quota: null,
          usage: null,
          error: null,
          message: null,
        }
      : null;
  const accountSignature = connectedAccountSignature(controlState.snapshot);

  useEffect(() => {
    installStyles();
  }, []);

  useEffect(() => {
    const previous = modelSelectionSignatureRef.current;
    modelSelectionSignatureRef.current = modelSelectionSignature;
    if (previous === undefined || previous === modelSelectionSignature) return;

    // The account-control popup follows the selected model's provider. A
    // provider chosen from the overview is only a temporary detail view; once
    // the model changes, keeping that override would show the previous
    // subscription or API-Key popup until a full page reload.
    setShowOverview(false);
    setDetailProviderId(currentProviderId);
  }, [currentProviderId, modelSelectionSignature]);

  useEffect(() => {
    controller.ensureSnapshot().catch(() => {});
  }, [controller]);

  useEffect(() => {
    if (typeof modelDirectory?.load !== "function") return undefined;
    const previous = accountSignatureRef.current;
    accountSignatureRef.current = accountSignature;
    // DSH's native ModelDirectory already performs the initial load. Only
    // reload after the Dockyard account pool actually changes (import,
    // removal, or a discovered provider becoming connected).
    if (previous === undefined || previous === accountSignature) return undefined;
    const timer = setTimeout(() => {
      const loading = modelDirectory.load();
      loading?.catch?.(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [accountSignature, modelDirectory]);

  useEffect(() => {
    if (!providerId) return undefined;
    controller.ensure(providerId).catch(() => {});
    nativeController.ensure(providerId).catch(() => {});
    return undefined;
  }, [controller, nativeController, providerId]);

  useEffect(() => {
    if (!open || !providerId) return undefined;
    const hasProvider = Boolean(provider);
    if (hasProvider) {
      void controller.refresh(providerId);
      const needsAntigravityIdentityScan = providerId === "antigravity"
        && (provider.accounts ?? []).some((account) => !account.email
          && !["official_cli_auth_status", "local_oauth_session_fingerprint"].includes(account.resources?.identitySource));
      if (needsAntigravityIdentityScan) void controller.scan(providerId);
      const timer = setInterval(() => controller.refresh(providerId), 30_000);
      return () => clearInterval(timer);
    }
    void nativeController.refresh(providerId);
    const timer = setInterval(() => nativeController.refresh(providerId), 30_000);
    return () => clearInterval(timer);
  }, [controller, nativeController, open, providerId, Boolean(provider)]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const updatePopupPosition = () => {
      const anchor = rootRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const margin = 14;
      const gap = 9;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupWidth = Math.min(480, Math.max(0, viewportWidth - margin * 2));
      const left = Math.min(
        Math.max(margin, rect.left),
        Math.max(margin, viewportWidth - popupWidth - margin),
      );
      const availableAbove = Math.max(0, rect.top - gap - margin);
      const availableBelow = Math.max(0, viewportHeight - rect.bottom - margin);
      const openAbove = availableAbove >= 280 || availableAbove >= availableBelow;

      anchor.style.setProperty("--dockyard-dsh-popup-left", `${left}px`);
      if (openAbove) {
        anchor.style.setProperty("--dockyard-dsh-popup-top", "auto");
        anchor.style.setProperty("--dockyard-dsh-popup-bottom", `${Math.max(margin, viewportHeight - rect.top + gap)}px`);
        anchor.style.setProperty("--dockyard-dsh-popup-max-height", `${Math.max(180, Math.min(560, availableAbove))}px`);
      } else {
        anchor.style.setProperty("--dockyard-dsh-popup-top", `${margin}px`);
        anchor.style.setProperty("--dockyard-dsh-popup-bottom", "auto");
        anchor.style.setProperty("--dockyard-dsh-popup-max-height", `${Math.max(180, viewportHeight - margin * 2)}px`);
      }
    };
    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [open, providerId, showOverview, providers.length]);

  const currentSelectedAccount = currentProvider?.defaultAccountId
    ? currentProvider.accounts?.find((account) => account.accountId === currentProvider.defaultAccountId)
    : currentProvider?.accounts?.length === 1 ? currentProvider.accounts[0] : null;
  const summary = currentProviderId && currentProvider
    ? currentProvider.accounts?.length > 1 && !currentProvider.defaultAccountId
      ? `${currentProvider.accounts.length} 账号`
      : quotaSummary(currentSelectedAccount)
    : currentProviderId && currentNative
      ? `${currentNative.keys?.filter((entry) => entry.configured).length ?? 0} Key`
    : currentProviderId && currentNativeLoading ? "读取中…" : "";
  const loading = controlState.action !== null || nativeState.action !== null || directoryState.status === "loading";
  const providerLabel = currentProviderId
    ? providerDisplayName(currentProviderId, currentProvider?.manifest ?? currentNative?.entry)
    : "订阅管理";
  const modelLabel = model?.name ?? current?.model ?? "";

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      setShowOverview(false);
      setDetailProviderId(null);
      return;
    }
    // The subscription entry must not disappear just because a model is
    // selected. Open the provider detail when its account/key state is
    // already loaded; otherwise fall back to the overview so OAuth login and
    // subscription discovery remain reachable for every model selection.
    const hasManagedProvider = Boolean(currentProvider || currentNative || nativeCandidate);
    setShowOverview(!currentProviderId || !hasManagedProvider);
    setDetailProviderId(currentProviderId && hasManagedProvider ? currentProviderId : null);
    setOpen(true);
  };
  const openSubscriptionOverview = () => {
    setShowOverview(true);
    setDetailProviderId(null);
    setOpen(true);
  };
  const overviewOpen = open && (showOverview || !providerId || (!provider && !native));
  return h("div", { className: "dockyard-dsh-anchor", ref: rootRef },
    h("button", {
      type: "button",
      className: "dockyard-dsh-trigger",
      title: currentProviderId ? `${providerLabel} · ${modelLabel}` : "订阅管理",
      "aria-label": currentProviderId
        ? `${providerLabel} ${currentProvider ? "账号与额度管理" : "Key 与额度管理"}`
        : "订阅管理",
      "aria-expanded": open,
      onClick: toggleOpen,
    },
      h("span", { className: "dockyard-dsh-dot", "data-live": Boolean(provider), "data-loading": loading }),
      h("span", { className: "dockyard-dsh-label" }, providerLabel),
      h("span", { className: "dockyard-dsh-summary" }, summary),
      h(ChevronIcon, { open })),
    h("button", {
      type: "button",
      className: "dockyard-dsh-add-trigger",
      title: "添加订阅",
      "aria-label": "添加订阅",
      onClick: openSubscriptionOverview,
    }, "＋ 添加订阅"),
    overviewOpen ? h(SubscriptionOverviewPopup, {
      providers,
      directoryState,
      controlState,
      controller,
      selectedProviderId: currentProviderId,
      onSelect: (selectedProviderId) => {
        setShowOverview(false);
        setDetailProviderId(selectedProviderId);
      },
      onClose: () => {
        setShowOverview(false);
        setOpen(false);
      },
    }) : open && provider ? h(DockyardPopup, {
      providerId,
      provider,
      directory: modelDirectory,
      directoryState,
      controlState,
      controller,
      onOpenOverview: openSubscriptionOverview,
      onClose: () => setOpen(false),
    }) : open && native ? h(NativeKeyPopup, {
      providerId,
      native,
      directory: modelDirectory,
      directoryState,
      nativeController,
      onClose: () => setOpen(false),
    }) : null);
}

// `remote.dockyard` is created by this plugin's own `$mount` call below. It
// must not be a top-level dependency, otherwise Cordis waits for the service
// before running this plugin and the plugin can never create it.
export const inject = ["slots", "modelDirectories", "remote", "connection"];

/** Mount the provider-aware account control in the native DSH composer. */
export async function apply(ctx) {
  installStyles();
  const disposeModelMenuFolding = installModelMenuFolding();
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
  // Read the dynamically mounted namespace through the service registry. The
  // traceable `ctx.remote.dockyard` property requires a declared inject and
  // would reintroduce the self-dependency deadlock above.
  const remote = ctx.get("remote.dockyard");
  const controller = new DockyardClientController(remote);
  ctx.inject(["slots", "modelDirectories", "connection"], (scope) => {
    const connection = scope.connection ?? ctx.get("connection");
    const nativeController = new NativeKeyPoolController(connection?.api, remote);
    scope.slots.inject("conversation.input.left", () => scope.slots.register({
      name: "conversation.input.left",
      id: "dockyard-account-control",
      order: 10,
      inject: (sessionId) => {
        const modelDirectory = scope.modelDirectories.directoryFor(sessionId);
        return {
          directory: modelDirectory.store,
          modelDirectory,
          controller,
          nativeController,
        };
      },
    }, DockyardAccountControl));
  });
  return async () => {
    disposeModelMenuFolding();
    controller.dispose();
    await disposeRemote?.();
  };
}
