import * as React from "react";

import { createSnapshotStore } from "@deepseek-ai/dsh-client-store";

import { TYPERT_REMOTE } from "./dockyard-typert.remote.mjs";
import {
  DOCKYARD_LOCALE_NS,
  DOCKYARD_LOCALES,
  translate as translateText,
} from "./dockyard-locale.mjs";
import { createNativeKeyApi, NativeKeyPoolController } from "./native-key-pool.mjs";
import { ProviderModelSelectionController } from "./model-selection.mjs";
import { selectPrimaryQuotaWindow, selectQuotaIndicator } from "./quota-display.mjs";

const h = React.createElement;
const {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} = React;

const STYLE_ID = "dockyard-dsh-account-control";
const POLICY_KEYS = Object.freeze({
  manual: "policy.manual",
  sticky_session: "policy.sticky_session",
  round_robin: "policy.round_robin",
  failover: "policy.failover",
});

function text(t, key, params) {
  return translateText(t, key, params);
}

function policyLabel(t, policy) {
  return text(t, POLICY_KEYS[policy] ?? "policy.manual");
}

const DOCKYARD_CHEVRON_PATH = "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z";

const CSS = `
.dockyard-dsh-anchor,.dockyard-dsh-settings-section{--dockyard-surface:rgb(from var(--dsw-specific-menu,#fff) r g b / 1);--dockyard-text:rgb(from var(--dsw-alias-label-primary,#202124) r g b / 1);--dockyard-muted:color-mix(in srgb,var(--dockyard-text) 72%,var(--dockyard-surface));--dockyard-border:color-mix(in srgb,var(--dockyard-text) 18%,var(--dockyard-surface));--dockyard-subtle:color-mix(in srgb,var(--dockyard-text) 5%,var(--dockyard-surface));--dockyard-accent:color-mix(in srgb,#5279dc 80%,var(--dockyard-text));--dockyard-danger:color-mix(in srgb,var(--dockyard-text) 30%,#e53935)}
.dockyard-dsh-anchor{position:relative;display:inline-flex;align-items:center;min-width:0;z-index:25}
.dockyard-dsh-model-group-toggle{display:flex!important;align-items:center;justify-content:space-between;gap:10px;min-height:26px;padding:4px 12px!important;border-radius:7px;cursor:pointer;user-select:none;outline:0}
.dockyard-dsh-model-group-toggle:hover,.dockyard-dsh-model-group-toggle:focus-visible{background:var(--dockyard-subtle);color:var(--dockyard-text)}
.dockyard-dsh-model-group-toggle .dockyard-dsh-model-group-chevron{margin-left:auto}
section[data-dockyard-model-group-collapsed="true"]>[role="menuitemradio"]{display:none!important}
.dockyard-dsh-trigger{display:inline-flex;align-items:center;gap:8px;max-width:260px;height:28px;padding:0 10px;border:0;border-radius:999px;color:var(--dockyard-muted);background:transparent;cursor:pointer;font:500 13px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif);white-space:nowrap}
.dockyard-dsh-balance{display:inline-flex;align-items:center;min-height:20px;color:var(--dockyard-accent);font-size:12px;font-weight:600;line-height:20px;white-space:nowrap}
.dockyard-dsh-balance[data-level=critical]{color:var(--dockyard-danger)}
.dockyard-dsh-quota-meter{display:block;position:relative;width:48px;height:5px;overflow:hidden;border-radius:999px;background:var(--dockyard-border)}
.dockyard-dsh-quota-meter-fill{display:block;height:100%;border-radius:inherit;background:var(--dockyard-accent);transition:width 220ms ease,background 220ms ease}
.dockyard-dsh-quota-meter[data-level=warning] .dockyard-dsh-quota-meter-fill{background:linear-gradient(90deg,#f0c36a,#eaa96a)}
.dockyard-dsh-quota-meter[data-level=critical] .dockyard-dsh-quota-meter-fill{background:linear-gradient(90deg,#ff8e7d,#e76b7c)}
.dockyard-dsh-quota-meter[data-level=unknown] .dockyard-dsh-quota-meter-fill{width:100%!important;background:#89919d;opacity:.42}
.dockyard-dsh-quota-meter[data-level=loading] .dockyard-dsh-quota-meter-fill{width:45%!important;background:#cbb7ff;animation:dockyard-dsh-quota-loading 1.1s ease-in-out infinite}
@keyframes dockyard-dsh-quota-loading{0%,100%{opacity:.35;transform:translateX(-25%)}50%{opacity:1;transform:translateX(25%)}}
.dockyard-dsh-trigger:hover{background:var(--dockyard-subtle);color:var(--dockyard-text)}
.dockyard-dsh-trigger:focus-visible{outline:2px solid var(--dsw-alias-border-l3,#8fa3c7);outline-offset:1px}
.dockyard-dsh-trigger[aria-expanded=true]{background:var(--dockyard-subtle);color:var(--dockyard-text)}
.dockyard-dsh-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dockyard-dsh-chevron{display:inline-flex;width:14px;height:14px;flex:none;align-items:center;justify-content:center;color:var(--dockyard-muted);transition:transform 140ms ease;transform-origin:center}
.dockyard-dsh-chevron[data-open=true]{transform:rotate(180deg)}
.dockyard-dsh-chevron svg{display:block;width:14px;height:14px}
.dockyard-dsh-popup{position:fixed;z-index:1000;left:var(--dockyard-dsh-popup-left,14px);top:var(--dockyard-dsh-popup-top,14px);right:auto;bottom:var(--dockyard-dsh-popup-bottom,auto);box-sizing:border-box;width:min(480px,calc(100vw - 28px));max-width:calc(100vw - 28px);min-width:0;max-height:var(--dockyard-dsh-popup-max-height,min(640px,calc(100vh - 28px)));max-height:var(--dockyard-dsh-popup-max-height,min(640px,calc(100dvh - 28px)));overflow:hidden;display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--dockyard-border);border-radius:14px;background:var(--dockyard-surface);box-shadow:0 12px 36px rgba(0,0,0,.18);color:var(--dockyard-text);font:400 13px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif);text-align:left}
.dockyard-dsh-popup-scroll{min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;display:flex;flex-direction:column;gap:10px;padding-right:1px}
.dockyard-dsh-settings-section{box-sizing:border-box;width:100%;min-width:0;color:var(--dockyard-text)}
.dockyard-dsh-settings-section>.dockyard-dsh-popup{position:static;width:100%;max-width:none;max-height:none;overflow:visible;gap:14px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
.dockyard-dsh-settings-section .dockyard-dsh-popup-scroll{max-height:none;overflow:visible;gap:14px;padding-right:0}
.dockyard-dsh-settings-section .dockyard-dsh-section{gap:8px}
.dockyard-dsh-native-key-popup{min-width:0;max-width:calc(100vw - 28px)}
.dockyard-dsh-native-key-popup>.dockyard-dsh-popup-scroll{display:flex!important;flex:1 1 auto!important;flex-direction:column!important;align-items:stretch!important;min-width:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box;overflow-x:hidden!important}
.dockyard-dsh-native-key-popup>.dockyard-dsh-popup-scroll>*{box-sizing:border-box;flex:0 0 auto!important;min-width:0!important;width:100%!important;max-width:100%!important}
.dockyard-dsh-native-key-popup .dockyard-dsh-status{box-sizing:border-box;min-width:0;width:100%;max-width:100%}
.dockyard-dsh-native-key-popup .dockyard-dsh-model-context{min-width:0;max-width:100%;overflow-wrap:anywhere;white-space:normal}
.dockyard-dsh-native-key-popup .dockyard-dsh-field,.dockyard-dsh-native-key-popup .dockyard-dsh-key-form,.dockyard-dsh-native-key-popup .dockyard-dsh-section,.dockyard-dsh-native-key-popup .dockyard-dsh-account,.dockyard-dsh-native-key-popup .dockyard-dsh-quota,.dockyard-dsh-native-key-popup .dockyard-dsh-key-notice{box-sizing:border-box;min-width:0;width:100%;max-width:100%}
.dockyard-dsh-native-key-popup .dockyard-dsh-field{flex-wrap:wrap}
.dockyard-dsh-native-key-popup .dockyard-dsh-field-label{min-width:0}
.dockyard-dsh-native-key-popup .dockyard-dsh-select{box-sizing:border-box;min-width:0;width:min(170px,100%);flex:0 1 auto}
.dockyard-dsh-native-key-popup .dockyard-dsh-key-form-row{flex-wrap:wrap}
.dockyard-dsh-native-key-popup .dockyard-dsh-key-form-row .dockyard-dsh-key-input{flex:1 1 220px}
@media (max-width:420px){.dockyard-dsh-native-key-popup .dockyard-dsh-field{align-items:stretch;flex-direction:column;gap:6px}.dockyard-dsh-native-key-popup .dockyard-dsh-select{width:100%;max-width:none}.dockyard-dsh-native-key-popup .dockyard-dsh-key-form-row{flex-direction:column}.dockyard-dsh-native-key-popup .dockyard-dsh-key-form-row .dockyard-dsh-key-input,.dockyard-dsh-native-key-popup .dockyard-dsh-key-save{width:100%;flex:0 0 auto}}
.dockyard-dsh-provider-list{display:flex;flex-direction:column;gap:10px}
.dockyard-dsh-provider-row{display:flex;align-items:center;gap:12px;width:100%;min-height:58px;padding:11px 14px;border:1px solid var(--dockyard-border);border-radius:12px;background:var(--dockyard-subtle);color:inherit;cursor:pointer;font:inherit;text-align:left;transition:border-color 140ms ease,background 140ms ease}
.dockyard-dsh-provider-row:hover,.dockyard-dsh-provider-row[data-current=true]{border-color:var(--dockyard-border);background:var(--dockyard-subtle)}
.dockyard-dsh-provider-row:focus-visible{outline:2px solid var(--dsw-alias-border-l3,#8fa3c7);outline-offset:1px}
.dockyard-dsh-provider-row-copy{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0;flex:1}
.dockyard-dsh-provider-row-name{min-width:0;overflow:hidden;color:var(--dockyard-text);font-size:13px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-provider-row-meta{min-width:0;overflow:hidden;color:var(--dockyard-muted);font-size:12px;line-height:17px;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-provider-row-arrow{flex:none;margin-left:4px;color:var(--dockyard-muted);font-size:20px;line-height:20px;transition:transform 140ms ease,color 140ms ease}
.dockyard-dsh-provider-row:hover .dockyard-dsh-provider-row-arrow{transform:translateX(2px);color:var(--dockyard-muted)}
.dockyard-dsh-head{display:flex;align-items:flex-start;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--dockyard-border)}
.dockyard-dsh-head-copy{min-width:0;flex:1}
.dockyard-dsh-title{margin-top:2px;font-size:16px;font-weight:650;line-height:22px}
.dockyard-dsh-model{margin-top:2px;overflow:hidden;color:var(--dockyard-muted);text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-model-context{margin-top:2px;color:var(--dockyard-muted);font-size:12px;line-height:15px;text-align:left}
.dockyard-dsh-close{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dockyard-muted);cursor:pointer;font-size:18px;line-height:1}
.dockyard-dsh-close:hover{background:var(--dockyard-subtle);color:var(--dockyard-text)}
.dockyard-dsh-status{display:flex;align-items:center;gap:8px;box-sizing:border-box;min-height:40px;padding:10px 12px;border-radius:9px;background:var(--dockyard-subtle);color:var(--dockyard-muted);line-height:18px}
.dockyard-dsh-status[data-error=true]{background:rgba(255,104,104,.11);color:var(--dsw-alias-state-error-primary,#ff7a7a)}
.dockyard-dsh-status[data-success=true]{background:rgba(156,229,220,.08);color:var(--dockyard-accent)}
.dockyard-dsh-status-copy{display:block;align-self:center;min-width:0;flex:1;overflow-wrap:anywhere;white-space:normal;text-align:left;line-height:18px}
.dockyard-dsh-auth-status{align-items:flex-start}
.dockyard-dsh-auth-status .dockyard-dsh-status-copy{white-space:normal;overflow-wrap:anywhere;line-height:18px}
.dockyard-dsh-auth-status .dockyard-dsh-auth-diagnostic{flex-basis:100%;color:var(--dsw-alias-state-error-primary,#ff7a7a)}
.dockyard-dsh-login-guide{display:flex;flex-direction:column;gap:6px;padding:9px 10px;border:1px solid var(--dockyard-border);border-radius:9px;background:var(--dockyard-subtle);text-align:left}
.dockyard-dsh-login-guide-title{color:var(--dockyard-accent);font-size:12px;font-weight:650;line-height:17px}
.dockyard-dsh-login-guide-copy{color:var(--dockyard-muted);font-size:12px;line-height:15px}
.dockyard-dsh-login-guide-steps{display:flex;flex-direction:column;gap:5px;margin:1px 0 0;padding:0;list-style:none}
.dockyard-dsh-login-guide-step{display:flex;align-items:flex-start;gap:7px;color:var(--dockyard-muted);font-size:12px;line-height:15px}
.dockyard-dsh-login-guide-number{display:inline-flex;width:16px;height:16px;flex:none;align-items:center;justify-content:center;border-radius:50%;background:var(--dockyard-subtle);color:var(--dockyard-accent);font-size:9px;font-weight:700}
.dockyard-dsh-login-guide-error{color:var(--dockyard-danger);font-size:12px;line-height:15px}
.dockyard-dsh-login-guide-code{display:flex;align-items:center;gap:6px;margin-top:2px}
.dockyard-dsh-login-guide-code input{min-width:0;flex:1;height:28px;padding:0 8px;border:1px solid var(--dockyard-border);border-radius:7px;background:var(--dockyard-subtle);color:var(--dockyard-text);font:400 11px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif)}
.dockyard-dsh-login-guide-code input:focus{border-color:var(--dockyard-text);outline:0}
.dockyard-dsh-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dockyard-dsh-action{height:34px;padding:0 12px;border:1px solid var(--dockyard-border);border-radius:7px;background:transparent;color:var(--dockyard-muted);cursor:pointer;font:500 11px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif);white-space:nowrap;flex:none}
.dockyard-dsh-action:hover:not(:disabled){border-color:var(--dockyard-text);background:var(--dockyard-subtle);color:var(--dockyard-accent)}
.dockyard-dsh-action:disabled{cursor:default;opacity:.65}
.dockyard-dsh-action-primary{border-color:var(--dockyard-accent);background:var(--dockyard-accent);color:#fff}
.dockyard-dsh-action-danger{border-color:rgba(255,125,110,.48);color:var(--dockyard-danger)}
.dockyard-dsh-field{display:flex;align-items:center;justify-content:flex-start;gap:10px;padding:8px 9px;border-radius:8px;background:var(--dockyard-subtle);text-align:left}
.dockyard-dsh-field-label{flex:1;color:var(--dockyard-muted);text-align:left}
.dockyard-dsh-select{max-width:170px;height:34px;padding:0 7px;border:1px solid var(--dockyard-border);border-radius:6px;background:var(--dockyard-surface);color:var(--dockyard-text);font:500 11px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif)}
.dockyard-dsh-section{display:flex;flex-direction:column;gap:6px}
.dockyard-dsh-section-title{display:flex;width:100%;box-sizing:border-box;flex-direction:column;align-items:flex-start;gap:3px;color:var(--dockyard-text);font-size:12px;font-weight:600;line-height:18px;text-align:left}
.dockyard-dsh-section-title>span:first-child{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-section-value{display:block;min-width:0;max-width:100%;margin:0;color:var(--dockyard-muted);font-size:12px;font-weight:400;letter-spacing:0;line-height:16px;text-transform:none;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-tier-list{display:flex;gap:5px;flex-wrap:wrap}
.dockyard-dsh-tier{min-height:32px;padding:4px 12px;border:1px solid var(--dockyard-border);border-radius:7px;background:transparent;color:var(--dockyard-muted);cursor:pointer;font:500 11px/18px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif)}
.dockyard-dsh-tier[data-active=true]{border-color:var(--dockyard-text);background:var(--dockyard-text);color:var(--dockyard-surface)}
.dockyard-dsh-tier:disabled{cursor:default;opacity:.65}
.dockyard-dsh-context-window{gap:7px}
.dockyard-dsh-context-window-row{display:flex;align-items:center;gap:6px;min-width:0}
.dockyard-dsh-context-window-select{box-sizing:border-box;min-width:0;flex:1;height:34px;padding:0 7px;border:1px solid var(--dockyard-border);border-radius:6px;background:var(--dockyard-surface);color:var(--dockyard-text);font:500 11px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif)}
.dockyard-dsh-context-window-input{box-sizing:border-box;min-width:0;flex:1;height:34px;padding:0 8px;border:1px solid var(--dockyard-border);border-radius:6px;background:var(--dockyard-subtle);color:var(--dockyard-text);font:400 11px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif)}
.dockyard-dsh-context-window-input:focus{border-color:var(--dockyard-border);outline:0;box-shadow:0 0 0 2px var(--dockyard-subtle)}
.dockyard-dsh-context-window-input::placeholder{color:var(--dockyard-muted)}
.dockyard-dsh-context-window-save{height:34px;padding:0 8px;border:1px solid var(--dockyard-border);border-radius:6px;background:var(--dockyard-subtle);color:var(--dockyard-accent);cursor:pointer;font:500 10px/18px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif);white-space:nowrap}
.dockyard-dsh-context-window-save:hover:not(:disabled){background:var(--dockyard-subtle)}
.dockyard-dsh-context-window-save:disabled{cursor:default;opacity:.65}
.dockyard-dsh-context-window-meta{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap;color:var(--dockyard-muted);font-size:12px;line-height:15px}
.dockyard-dsh-context-window-warning{color:var(--dockyard-muted)}
.dockyard-dsh-context-window-message{color:var(--dockyard-accent);font-size:12px;line-height:15px}
.dockyard-dsh-context-window-message[data-error=true]{color:var(--dockyard-danger)}
.dockyard-dsh-account{display:flex;flex-direction:column;gap:7px;padding:9px;border:1px solid var(--dockyard-border);border-radius:10px;background:var(--dockyard-subtle)}
.dockyard-dsh-account[data-current=true]{border-color:var(--dockyard-accent);box-shadow:inset 3px 0 var(--dockyard-accent);background:color-mix(in srgb,var(--dockyard-accent) 5%,var(--dockyard-surface))}
.dockyard-dsh-account-head{display:flex;align-items:center;gap:8px}
.dockyard-dsh-account-identity{min-width:0;flex:1}
.dockyard-dsh-account-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dockyard-text);font-size:12px;font-weight:600}
.dockyard-dsh-account-id{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dockyard-muted);font-size:12px}
.dockyard-dsh-account-actions{display:flex;align-items:center;gap:5px;flex:none}
.dockyard-dsh-account-use{height:32px;padding:0 7px;border:1px solid var(--dockyard-border);border-radius:6px;background:transparent;color:var(--dockyard-accent);cursor:pointer;font:500 10px/18px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif);white-space:nowrap}
.dockyard-dsh-account-use:hover:not(:disabled){background:var(--dockyard-subtle)}
.dockyard-dsh-account-use:disabled{cursor:default;opacity:.5}
.dockyard-dsh-account-remove{height:32px;padding:0 7px;border:1px solid rgba(255,122,122,.35);border-radius:6px;background:transparent;color:var(--dockyard-danger);cursor:pointer;font:500 10px/18px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif);white-space:nowrap}
.dockyard-dsh-account-remove:hover:not(:disabled){border-color:rgba(255,122,122,.7);background:rgba(255,104,104,.12)}
.dockyard-dsh-account-remove:disabled{cursor:default;opacity:.5}
.dockyard-dsh-account-meta{display:flex;align-items:center;gap:8px;color:var(--dockyard-muted);font-size:12px;flex-wrap:wrap}
.dockyard-dsh-health{color:var(--dockyard-accent)}.dockyard-dsh-health[data-bad=true]{color:var(--dockyard-danger)}
.dockyard-dsh-account-note{padding:4px 6px;border-radius:6px;background:var(--dockyard-subtle);color:var(--dockyard-muted);font-size:12px;line-height:15px;text-align:left}
.dockyard-dsh-account-error{max-width:100%;overflow:hidden;color:var(--dockyard-danger);font-size:12px;line-height:15px;text-align:left;overflow-wrap:anywhere;white-space:normal}
.dockyard-dsh-quota{display:flex;flex-direction:column;gap:4px}
.dockyard-dsh-quota-row{display:flex;align-items:center;gap:8px}
.dockyard-dsh-quota-copy{min-width:0;flex:1;color:var(--dockyard-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-quota-value{flex:none;color:var(--dockyard-text);font-size:12px}
.dockyard-dsh-quota-track{height:4px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.1)}
.dockyard-dsh-quota-fill{height:100%;border-radius:inherit;background:var(--dockyard-accent)}
.dockyard-dsh-muted{padding:4px 2px;color:var(--dockyard-muted);text-align:left}
.dockyard-dsh-candidates{display:flex;flex-direction:column;gap:5px}
.dockyard-dsh-candidate{display:flex;align-items:center;gap:7px;padding:6px 7px;border-radius:7px;background:var(--dockyard-subtle)}
.dockyard-dsh-candidate-copy{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dockyard-muted)}
.dockyard-dsh-key-notice{padding:7px 8px;border-radius:8px;background:var(--dockyard-subtle);color:var(--dockyard-muted);line-height:17px;text-align:left}
.dockyard-dsh-key-form{--dockyard-dsh-key-control-height:36px;display:flex;width:100%;box-sizing:border-box;align-self:stretch;align-items:stretch;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--dockyard-border);border-radius:10px;background:var(--dockyard-surface)}
.dockyard-dsh-key-form-row{display:flex;width:100%;min-width:0;min-height:var(--dockyard-dsh-key-control-height);align-items:stretch;gap:6px}
.dockyard-dsh-key-input{display:block;box-sizing:border-box;width:100%;min-width:0;flex:1 1 auto;height:var(--dockyard-dsh-key-control-height);min-height:var(--dockyard-dsh-key-control-height);margin:0;padding:0 8px;border:1px solid var(--dockyard-border);border-radius:7px;background:var(--dockyard-subtle);color:var(--dockyard-text);font:400 11px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif)}
.dockyard-dsh-key-form>.dockyard-dsh-key-input{flex:0 0 auto}
.dockyard-dsh-key-input::placeholder{color:var(--dockyard-muted)}
.dockyard-dsh-key-input:focus{border-color:var(--dockyard-border);outline:0;box-shadow:0 0 0 2px var(--dockyard-subtle)}
.dockyard-dsh-key-save{box-sizing:border-box;height:var(--dockyard-dsh-key-control-height);min-height:var(--dockyard-dsh-key-control-height);padding:0 9px;border:1px solid var(--dockyard-border);border-radius:7px;background:var(--dockyard-subtle);color:var(--dockyard-accent);cursor:pointer;font:500 11px/20px var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif);white-space:nowrap}
.dockyard-dsh-key-save:hover:not(:disabled){background:var(--dockyard-subtle)}
.dockyard-dsh-key-save:disabled{cursor:default;opacity:.65}
.dockyard-dsh-key-ref{overflow:hidden;color:var(--dockyard-muted);font:400 9px/14px ui-monospace,SFMono-Regular,Menlo,monospace;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-key-source{color:var(--dockyard-muted);font-size:12px}
.dockyard-dsh-popup>.dockyard-dsh-head,.dockyard-dsh-popup>.dockyard-dsh-status{flex-shrink:0}
.dockyard-dsh-popup:focus{outline:none}
.dockyard-dsh-popup[popover]{margin:0}
.dockyard-dsh-popup :is(button,input,select,a,summary):focus-visible{outline:2px solid var(--dockyard-accent);outline-offset:2px}
.dockyard-dsh-popup :is(button:not(.dockyard-dsh-close),input,select){font-size:12px}
.dockyard-dsh-trigger .dockyard-dsh-quota-meter{flex-shrink:0}
@media (max-width:420px){.dockyard-dsh-trigger{max-width:190px}.dockyard-dsh-popup{padding:12px}.dockyard-dsh-context-window-row{flex-wrap:wrap}.dockyard-dsh-context-window-save{flex:1 0 100%}.dockyard-dsh-account-head{flex-wrap:wrap}.dockyard-dsh-account-identity{flex-basis:100%}}

.dockyard-dsh-navigation{display:flex;gap:8px;flex-shrink:0;min-width:0}
.dockyard-dsh-navigation .dockyard-dsh-select{flex:1;min-width:0;max-width:none;font-size:13px}
.dockyard-dsh-model-picker{display:flex;flex-direction:column;gap:6px;min-width:0}
.dockyard-dsh-model-picker .dockyard-dsh-select{width:100%;max-width:none;min-width:0;height:36px;font-size:13px}
.dockyard-dsh-section-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600;min-height:34px}
.dockyard-dsh-disclosure{border-top:1px solid var(--dockyard-border);min-width:0}
.dockyard-dsh-disclosure>summary{padding:12px 2px;cursor:pointer;color:var(--dockyard-text);font-weight:500}
.dockyard-dsh-disclosure>summary:hover{color:var(--dockyard-accent)}
.dockyard-dsh-disclosure>.dockyard-dsh-section{padding-bottom:4px}
.dockyard-dsh-disclosure .dockyard-dsh-key-form{padding:0 0 8px;border:0;border-radius:0}
.dockyard-dsh-empty{padding:16px 12px;background:var(--dockyard-subtle);border-radius:8px;color:var(--dockyard-muted)}
.dockyard-dsh-provider-row:disabled{cursor:default;opacity:.65}
.dockyard-dsh-provider-row[data-current=true]{border-color:var(--dockyard-accent)}
.dockyard-dsh-account-use:disabled{opacity:1}
.dockyard-dsh-count{margin-left:8px;font-size:12px;font-weight:400;color:var(--dockyard-muted)}
.dockyard-dsh-inline-status{padding:12px 0;color:var(--dockyard-muted);font-size:12px;line-height:18px}
.dockyard-dsh-native-key-popup{gap:10px}
.dockyard-dsh-native-key-popup .dockyard-dsh-head{padding-bottom:10px}
.dockyard-dsh-native-key-popup .dockyard-dsh-account{padding:10px;background:transparent}
.dockyard-dsh-native-key-popup .dockyard-dsh-account[data-current=true]{background:color-mix(in srgb,var(--dockyard-accent) 4%,var(--dockyard-surface))}
.dockyard-dsh-native-key-popup .dockyard-dsh-muted{font-size:12px;line-height:18px}
.dockyard-dsh-native-key-popup .dockyard-dsh-disclosure>summary{padding:10px 2px}
.dockyard-dsh-login-guide a.dockyard-dsh-action{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;box-sizing:border-box}
.dockyard-dsh-account[data-current=true] .dockyard-dsh-account-use{border-color:transparent;background:color-mix(in srgb,var(--dockyard-accent) 12%,var(--dockyard-surface))}
.dockyard-dsh-key-save:not(:disabled){background:var(--dockyard-accent);border-color:var(--dockyard-accent);color:#fff}
@media (prefers-reduced-motion:reduce){.dockyard-dsh-anchor *,.dockyard-dsh-settings-section *{animation:none!important;transition:none!important}}
`;

function installStyles() {
  if (typeof document === "undefined") return;
  const tag = document.querySelector(`style[data-dockyard-dsh="${STYLE_ID}"]`) ?? document.createElement("style");
  tag.dataset.dockyardDsh = STYLE_ID;
  if (tag.textContent !== CSS) tag.textContent = CSS;
  if (!tag.isConnected) document.head.appendChild(tag);
}

export const modelGroupFoldState = new Map();

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

export function syncModelMenuGroups(menu) {
  const english = menu.getAttribute("aria-label") === "Model and reasoning effort";
  for (const section of modelMenuSections(menu)) {
    const labelledBy = section.getAttribute("aria-labelledby");
    const title = [...section.children].find((child) => child.id === labelledBy)
      ?? section.querySelector(".dockyard-dsh-model-group-toggle");
    if (!title) continue;
    const options = [...section.children].filter((child) => child.getAttribute("role") === "menuitemradio");
    if (options.length === 0) continue;
    const key = `${title.textContent?.trim() ?? "provider"}`;
    const stored = modelGroupFoldState.get(key);
    const hasCheckedModel = options.some((child) => child.getAttribute("aria-checked") === "true");
    // Groups stay expanded by default so models remain visible and DSH's
    // autofocus on the active radio item does not fail and trigger an instant onBlur close.
    // The group containing the active selection must never be collapsed.
    const collapsed = hasCheckedModel ? false : (stored === true);
    modelGroupFoldState.set(key, collapsed);
    section.dataset.dockyardModelGroupCollapsed = String(collapsed);
    title.classList.add("dockyard-dsh-model-group-toggle");
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.setAttribute("aria-expanded", String(!collapsed));
    title.setAttribute("title", collapsed
      ? (english ? "Expand model" : "展开模型")
      : (english ? "Collapse model" : "折叠模型"));
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
  const menuSelector = '[role="menu"][aria-label="模型与推理等级"], [role="menu"][aria-label="Model and reasoning effort"]';
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
    for (const menu of boundMenus) {
      if (menu.isConnected) continue;
      menu.removeEventListener("click", toggle);
      menu.removeEventListener("keydown", toggle);
      boundMenus.delete(menu);
    }
    for (const menu of document.querySelectorAll(menuSelector)) {
      if (!boundMenus.has(menu)) {
        menu.addEventListener("click", toggle);
        menu.addEventListener("keydown", toggle);
        boundMenus.add(menu);
      }
      syncModelMenuGroups(menu);
    }
  };
  const observer = new MutationObserver((records) => {
    if (records.some(({ target, addedNodes, removedNodes }) =>
      [...addedNodes, ...removedNodes, target].some((node) => node.nodeType === 1
        && (node.matches(menuSelector) || node.closest(menuSelector) || node.querySelector(menuSelector))))) sync();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-checked"] });
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

function errorText(error, t) {
  if (error instanceof Error) return error.message;
  return String(error ?? text(t, "error.unknown"));
}

function refreshResultMessage(result, t) {
  if (!Array.isArray(result)) return null;
  const failures = result.reduce((count, entry) => count + (Array.isArray(entry?.diagnostics) && entry.diagnostics.length > 0 ? 1 : 0), 0);
  if (result.length === 0) return text(t, "status.noConnectedAccounts");
  if (failures === 0) return text(t, "status.refreshedAccounts", { count: result.length });
  return text(t, "status.refreshPartial", {
    success: result.length - failures,
    total: result.length,
    failures,
  });
}

function unwrapRemote(response, t) {
  if (response?.ok === true) return response.value;
  if (response?.ok === false) {
    const detail = response.error?.message ?? response.error?.code ?? text(t, "error.remoteNotMounted", { method: "remote operation" });
    throw new Error(detail);
  }
  return response;
}

function providerFromSnapshot(snapshot, providerId) {
  return snapshot?.providers?.find((provider) => provider.providerId === providerId) ?? null;
}

function providerDisplayName(providerId, manifest, t) {
  if (providerId === "antigravity") return "Antigravity";
  if (providerId === "minimax" || providerId === "minimax-cn") return "MiniMax";
  if (providerId === "deepseek" || providerId === "deepseek-official") return "DeepSeek";
  if (providerId === "openrouter") return "OpenRouter";
  return manifest?.displayName ?? providerId ?? text(t, "value.provider");
}

function displayModelId(providerId, modelId) {
  const value = String(modelId ?? "");
  if (providerId === "antigravity") return value.replace(/^gemini[-_:]/i, "");
  return value;
}

function connectedAccountSignature(snapshot) {
  if (!Array.isArray(snapshot?.providers)) return "";
  return snapshot.providers.map((provider) => [
    provider.providerId,
    provider.policy,
    provider.defaultAccountId,
    ...(Array.isArray(provider.accounts) ? provider.accounts.map((account) => account?.accountId).filter(Boolean).sort() : []),
  ].join(":")).join("|");
}

function formatDate(value, t) {
  if (!value) return text(t, "value.notReturned");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatNumber(value, t) {
  if (value === null || value === undefined) return text(t, "value.unknown");
  return typeof value === "number" ? new Intl.NumberFormat().format(value) : String(value);
}

function quotaWindowRows(quota, t) {
  if (!quota || typeof quota !== "object") return [];
  if (Array.isArray(quota.windows) && quota.windows.length > 0) return quota.windows;
  if (quota.remaining !== null || quota.limit !== null || quota.resetAt) return [{
    id: "quota",
    name: quota.unit ?? text(t, "value.quota"),
    remaining: quota.remaining,
    limit: quota.limit,
    unit: quota.unit,
    resetAt: quota.resetAt,
    updatedAt: quota.updatedAt,
  }];
  return [];
}

function quotaRowsForAccount(account, t) {
  return quotaWindowRows(account?.quota, t);
}

function quotaPercent(window) {
  if (typeof window?.remaining !== "number" || typeof window?.limit !== "number" || window.limit <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((window.remaining / window.limit) * 100)));
}

function balanceCurrency(window) {
  const raw = String(window?.currency ?? window?.unit ?? "").trim().toUpperCase();
  const normalized = raw === "RMB" ? "CNY" : raw;
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function formatBalance(window, t, value = window?.remaining) {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  const currency = balanceCurrency(window);
  if (!Number.isFinite(amount) || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return null;
  }
}

function quotaSummary(account, t) {
  const health = account?.health?.status;
  if (health === "expired") return text(t, "health.expired");
  if (health === "exhausted") return text(t, "health.exhausted");
  if (health === "degraded" && account?.health?.lastError) return text(t, "health.degraded");
  const rows = quotaRowsForAccount(account, t);
  const indicator = selectQuotaIndicator(rows);
  if (indicator?.type === "balance") return formatBalance(indicator.window, t) ?? text(t, "value.unknown");
  if (indicator?.type === "quota") return `${indicator.percent}%`;
  const first = selectPrimaryQuotaWindow(rows);
  if (first?.remaining !== null && first?.remaining !== undefined) return formatNumber(first.remaining, t);
  if (account?.resources?.quotaDiagnostic) return text(t, "value.quota");
  return account ? text(t, "summary.connected") : text(t, "summary.notConnected");
}

function providerAccount(provider) {
  if (provider?.defaultAccountId) {
    return provider.accounts?.find((account) => account.accountId === provider.defaultAccountId) ?? null;
  }
  return provider?.accounts?.length === 1 ? provider.accounts[0] : null;
}

function providerOverviewSummary(provider, t) {
  const accounts = provider?.accounts ?? [];
  if (accounts.length === 0) return text(t, "summary.notConnected");
  const selected = providerAccount(provider);
  const summary = selected ? quotaSummary(selected, t) : text(t, "summary.connected");
  return text(t, "summary.accounts", { count: accounts.length, summary });
}

function accountName(account, t) {
  return account?.email ?? account?.displayName ?? account?.accountId ?? text(t, "value.unknown");
}

function accountIdentityLine(account, t) {
  const identitySource = account?.resources?.identitySource;
  if (account?.email && account?.resources?.authSource === "official_cursor_browser_oauth") return text(t, "identity.cursorBrowser");
  if (["official_cli_auth_status", "official_client_auth_status"].includes(identitySource)) return text(t, "identity.officialLogin");
  if (account?.resources?.sessionFingerprint) return text(t, "identity.sessionFingerprint", { fingerprint: account.resources.sessionFingerprint });
  return account?.accountId ?? text(t, "value.unknown");
}

function accountPlanLabel(account, t) {
  if (account?.subscription?.plan) return account.subscription.plan;
  if (Array.isArray(account?.quota?.windows) && account.quota.windows.length > 0) {
    return text(t, "account.quotaReturned");
  }
  return text(t, "account.planMissing");
}

function healthLabel(status, t) {
  return status === "healthy" ? text(t, "health.healthy")
    : status === "degraded" ? text(t, "health.degraded")
      : status === "cooldown" ? text(t, "health.cooldown")
        : status === "expired" ? text(t, "health.expired")
          : status === "exhausted" ? text(t, "health.exhausted")
            : status ?? text(t, "health.unknown");
}

export class DockyardClientController {
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
  authPolling = new Set();
  // Per-session poll generation. Cancelling (or rescheduling) bumps the
  // generation so an in-flight poll RPC can no longer apply its stale result
  // over the cancelled/newer state.
  authGenerations = new Map();

  constructor(remote, t) {
    this.remote = remote;
    this.t = t;
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
    const next = preserveControl ? {} : {
      providerId,
      action: null,
      status: "ready",
      error: null,
      // Refreshing account data must not hide an active browser login.
      auth: ["pending", "processing"].includes(this.store.getSnapshot().auth?.status)
        ? this.store.getSnapshot().auth : null,
    };
    if (result?.status) {
      const previousAuth = this.store.getSnapshot().auth;
      const sameSession = previousAuth?.sessionId && previousAuth.sessionId === result.sessionId;
      const active = ["pending", "processing"].includes(result.status);
      if (!active && result.sessionId) this.stopAuth(result.sessionId);
      next.auth = result.status === "completed" ? null : {
        providerId: result.providerId ?? providerId,
        sessionId: result.sessionId ?? null,
        status: result.status,
        // A terminal session's URL contains spent/invalid state. Never offer it
        // as a retry link or retain the old blocked-popup warning.
        authorizationUrl: active ? result.authorizationUrl ?? (sameSession ? previousAuth.authorizationUrl : null) ?? null : null,
        browserOpenFailed: active && result.browserOpened !== true && sameSession ? previousAuth.browserOpenFailed === true : false,
        terminalOpened: active && (result.terminalOpened ?? (sameSession ? previousAuth.terminalOpened : false)),
        instructions: result.instructions ?? null,
        inputRequired: active && result.inputRequired === true,
        authorizationCodeRequired: active && result.authorizationCodeRequired === true,
        diagnostic: result.diagnostic ?? null,
      };
      if (!preserveControl) {
        if (["failed", "error", "missing", "expired", "timeout"].includes(result.status)) {
          next.error = result.diagnostic ?? result.instructions ?? text(this.t, "status.oauthFailed");
          next.message = null;
        } else if (result.diagnostic) next.message = result.diagnostic;
        else if (result.instructions && result.status !== "opened") next.message = result.instructions;
        else if (result.status === "completed") next.message = text(this.t, "status.oauthCompleted");
      }
    }
    if (result?.providers) next.scan = result;
    if (result?.scan?.providers) next.scan = result.scan;
    this.setState(next);
    return result;
  }

  async call(method, ...args) {
    const fn = this.remote?.[method];
    if (typeof fn !== "function") throw new Error(text(this.t, "error.remoteNotMounted", { method }));
    return unwrapRemote(await fn(...args), this.t);
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
        this.setState({ status: "error", error: errorText(error, this.t) });
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

  async refresh(providerId = null, { background = false } = {}) {
    const state = this.store.getSnapshot();
    if (background && (globalThis.document?.hidden || state.action
      || ["pending", "processing"].includes(state.auth?.status))) return null;
    const key = providerId ?? "*";
    const existing = this.refreshPromises.get(key);
    if (existing) {
      if (!background && existing.background) {
        this.setState({ action: "refresh", status: "loading", providerId, error: null, message: null });
        await existing.promise;
        return this.refresh(providerId);
      }
      return existing.promise;
    }

    const promise = (async () => {
      if (!background) this.setState({ action: "refresh", status: "loading", providerId, error: null, message: null });
      try {
        const value = await this.call("refresh", providerId ? { providerId } : {});
        const latest = this.store.getSnapshot();
        if (background && (latest.action || latest.snapshot !== state.snapshot)) return null;
        const result = this.applyValue(value, providerId, { preserveControl: background });
        if (!background) this.setState({ message: refreshResultMessage(result, this.t) });
        return result;
      } catch (error) {
        if (!background) this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
        return null;
      }
    })();
    const request = { promise, background };
    this.refreshPromises.set(key, request);
    try {
      return await promise;
    } finally {
      if (this.refreshPromises.get(key) === request) this.refreshPromises.delete(key);
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
      this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
      return null;
    }
  }

  async refreshDiscovery(providerId) {
    try {
      const value = await this.call("scan", { providerId });
      return { result: this.applyValue(value, providerId, { preserveControl: true }), error: null };
    } catch (error) {
      return { result: null, error: errorText(error, this.t) };
    }
  }

  async add(providerId, candidateId) {
    this.setState({ action: "add", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("add", { providerId, ...(candidateId ? { candidateId } : {}) });
      const result = this.applyValue(value, providerId);
      const count = result?.accounts?.length ?? 0;
      const discovery = await this.refreshDiscovery(providerId);
      const scanNotice = discovery.error
        ? text(this.t, "status.discoveryRefreshFailed", { error: discovery.error })
        : null;
      this.setState({ message: scanNotice ?? (count
        ? text(this.t, "status.accountAdded", { count })
        : text(this.t, "status.noNewOAuthCandidates")) });
      return result;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
      return null;
    }
  }

  async login(providerId) {
    const current = this.store.getSnapshot();
    if (current.action) return null;
    if (["pending", "processing"].includes(current.auth?.status)
      && current.auth.sessionId) {
      const authProviderId = current.auth.providerId;
      if (authProviderId === providerId) this.scheduleAuth(authProviderId, current.auth.sessionId);
      this.setState({ providerId, status: "ready", error: null, message: text(this.t,
        authProviderId === providerId ? "status.oauthInProgress" : "status.oauthOtherInProgress",
        { provider: providerDisplayName(authProviderId, providerFromSnapshot(current.snapshot, authProviderId)?.manifest, this.t) }) });
      return current.auth;
    }
    if (current.auth?.sessionId) this.stopAuth(current.auth.sessionId);
    this.setState({ action: "login", status: "loading", providerId, error: null, message: null, auth: null });
    // Reserve the window while the user's click is still active. A later
    // window.open after the OAuth RPC can be blocked by the browser.
    let authWindow = null;
    try {
      if (typeof window !== "undefined" && typeof window.open === "function") authWindow = window.open("about:blank", "dockyard-dsh-oauth", "popup");
      if (authWindow) authWindow.opener = null;
    } catch {
      // A blocked popup must leave the authorization URL available in the UI.
    }
    try {
      // Electron denies about:blank windows, so there is no WindowProxy to
      // navigate. Let the local Host open the actual OAuth URL in that case.
      // Never open a browser on a remote server for a blocked Web popup.
      const location = typeof window !== "undefined" ? window.location : null;
      // Packaged desktop pages use dsh-app://app/, not the loopback HTTP
      // address of their Host. Match the exact scheme AND host so a remote
      // https://app/ page cannot request the desktop fallback accidentally.
      const localPage = ["localhost", "127.0.0.1", "[::1]"].includes(location?.hostname)
        || (location?.protocol === "dsh-app:" && location?.hostname === "app");
      const hostBrowserFallback = (!authWindow || authWindow.closed) && localPage;
      const value = await this.call("login", { providerId, ...(hostBrowserFallback ? { openBrowser: true } : {}) });
      const result = this.applyValue(value, providerId);
      if (result?.browserOpened) {
        authWindow?.close?.();
      } else if (result?.authorizationUrl && ["pending", "processing"].includes(result.status)) {
        let opened = false;
        try {
          if (authWindow && !authWindow.closed) {
            authWindow.location.href = result.authorizationUrl;
            opened = true;
          }
        } catch { authWindow?.close?.(); }
        const auth = this.store.getSnapshot().auth;
        if (auth) this.setState({ auth: { ...auth, browserOpenFailed: !opened } });
      } else {
        authWindow?.close?.();
      }
      if (["pending", "processing"].includes(result?.status) && result.sessionId) {
        this.scheduleAuth(providerId, result.sessionId);
      }
      return result;
    } catch (error) {
      authWindow?.close?.();
      this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
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
        this.setState({ message: text(this.t, "status.oauthCodeSubmitted") });
      }
      return result;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
      return null;
    }
  }

  scheduleAuth(providerId, sessionId) {
    if (this.authPolling.has(sessionId)) return;
    this.authPolling.add(sessionId);
    // Browser OAuth allows ten minutes. The former three-minute cap silently
    // abandoned a still-valid login and left the UI stuck in progress.
    const deadline = Date.now() + 11 * 60 * 1000;
    const generation = (this.authGenerations.get(sessionId) ?? 0) + 1;
    this.authGenerations.set(sessionId, generation);
    const tick = async () => {
      this.authTimers.delete(sessionId);
      if (this.authGenerations.get(sessionId) !== generation) return;
      if (Date.now() >= deadline) {
        this.stopAuth(sessionId);
        // Keep the pending session cancellable; do not imply its provider-side
        // state has been deleted merely because this client stopped waiting.
        this.setState({ error: text(this.t, "status.oauthPollTimeout"), message: null });
        return;
      }
      const before = this.store.getSnapshot();
      try {
        const value = await this.call("poll", { providerId, sessionId });
        // A cancel (or a newer scheduling round) invalidated this poll;
        // applying its result would resurrect cancelled/older auth state.
        if (this.authGenerations.get(sessionId) !== generation) return;
        const latest = this.store.getSnapshot();
        // Keep the Host's terminal result even when a foreground operation
        // owns the status message.
        const result = this.applyValue(latest.snapshot !== before.snapshot
          ? { ...value, snapshot: latest.snapshot } : value, providerId,
        { preserveControl: Boolean(latest.action) });
        if (["pending", "processing"].includes(result?.status)) {
          const timer = setTimeout(tick, 1000);
          this.authTimers.set(sessionId, timer);
        }
      } catch (error) {
        if (this.authGenerations.get(sessionId) !== generation) return;
        if (this.store.getSnapshot().action) {
          this.authTimers.set(sessionId, setTimeout(tick, 1000));
          return;
        }
        this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
        // A transient RPC failure must not permanently abandon the provider's
        // still-running authorization. Retry within the bounded deadline.
        this.authTimers.set(sessionId, setTimeout(tick, 1000));
      }
    };
    this.authTimers.set(sessionId, setTimeout(tick, 1000));
  }

  stopAuth(sessionId) {
    const timer = this.authTimers.get(sessionId);
    if (timer) clearTimeout(timer);
    this.authTimers.delete(sessionId);
    this.authPolling.delete(sessionId);
    this.authGenerations.set(sessionId, (this.authGenerations.get(sessionId) ?? 0) + 1);
  }

  async cancelAuthorization(providerId, sessionId) {
    // Invalidate any in-flight poll for this session before cancelling.
    this.stopAuth(sessionId);
    this.setState({ action: "cancel", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("cancel", { providerId, sessionId });
      this.applyValue(value, providerId);
      this.setState({ auth: null, action: null, status: "ready", message: text(this.t, "status.oauthCancelled") });
      return value;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
      return null;
    }
  }

  async selectAccount(providerId, accountId) {
    this.setState({ action: "use", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("setPolicy", { providerId, policy: "manual", defaultAccountId: accountId });
      this.applyValue(value, providerId);
      const account = providerFromSnapshot(this.store.getSnapshot().snapshot, providerId)?.accounts?.find((entry) => entry.accountId === accountId);
      this.setState({ message: text(this.t, "status.accountSelected", { account: accountName(account ?? { accountId }, this.t) }) });
      return value;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
      return null;
    }
  }

  async removeAccount(providerId, accountId) {
    this.setState({ action: "remove", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("removeAccount", { providerId, accountId });
      const result = this.applyValue(value, providerId);
      const diagnostics = result?.diagnostics?.length ? ` (${result.diagnostics.join("; ")})` : "";
      const discovery = await this.refreshDiscovery(providerId);
      const scanNotice = discovery.error
        ? text(this.t, "status.discoveryRefreshFailed", { error: discovery.error })
        : "";
      const provider = providerFromSnapshot(this.store.getSnapshot().snapshot, providerId);
      const supportsOAuthLogin = provider?.manifest?.capabilities?.includes("oauth_authorization");
      const reentry = supportsOAuthLogin
        ? text(this.t, "status.reentryOAuth")
        : text(this.t, "status.reentryScan");
      this.setState({ message: text(this.t, "status.accountRemoved", {
        details: diagnostics,
        scanNotice: scanNotice ? `; ${scanNotice}` : "",
        reentry,
      }) });
      return value;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
      return null;
    }
  }

  async setPolicy(providerId, policy) {
    this.setState({ action: "policy", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("setPolicy", { providerId, policy });
      this.applyValue(value, providerId);
      this.setState({ message: text(this.t, "status.policyUpdated", { policy: policyLabel(this.t, policy) }) });
      return value;
    } catch (error) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error, this.t) });
      return null;
    }
  }

  dispose() {
    for (const timer of this.authTimers.values()) clearTimeout(timer);
    this.authTimers.clear();
    this.authPolling.clear();
    this.authGenerations.clear();
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

function modelContextWindow(model) {
  const values = [model?.context?.contextWindow, model?.contextWindow, model?.metadata?.contextWindow];
  return values.find((value) => Number.isSafeInteger(value) && value > 0) ?? null;
}

function contextWindowScopeLabel({ accountId, keyRef }, t) {
  if (keyRef) return text(t, "contextWindow.scopeKey");
  if (accountId) return text(t, "contextWindow.scopeAccount");
  return text(t, "contextWindow.scopeProvider");
}

function normalizeDraftContextWindow(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const numeric = Number(String(value).replaceAll(",", "").trim());
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

function ContextWindowSection({ providerId, current, model, accountId = null, keyRef = null, remote, t }) {
  const modelId = current?.model ?? null;
  const detected = modelContextWindow(model);
  const scope = {
    providerId,
    modelId,
    ...(accountId ? { accountId } : {}),
    ...(keyRef ? { keyRef } : {}),
  };
  const [state, setState] = useState({ status: "idle", override: null, effectiveOverride: null, source: "auto" });
  const [mode, setMode] = useState("auto");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", override: null, effectiveOverride: null, source: "auto" });
    setMode("auto");
    setDraft("");
    setMessage(null);
    if (!modelId || typeof remote?.getContextWindowOverride !== "function") {
      setState({ status: "ready", override: null, effectiveOverride: null, source: "auto" });
      return undefined;
    }
    Promise.resolve(remote.getContextWindowOverride(scope))
      .then((response) => unwrapRemote(response, t))
      .then((value) => {
        if (cancelled) return;
        const override = normalizeDraftContextWindow(value?.override);
        const effectiveOverride = normalizeDraftContextWindow(value?.effectiveOverride);
        setState({
          status: "ready",
          override,
          effectiveOverride,
          source: value?.source ?? (override !== null ? "custom" : "auto"),
        });
        setMode(override !== null ? "custom" : "auto");
        setDraft(override === null ? "" : String(override));
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: "error", override: null, effectiveOverride: null, source: "auto" });
        setMessage({ error: true, text: errorText(error, t) });
      });
    return () => { cancelled = true; };
  }, [remote, providerId, modelId, accountId, keyRef]);

  if (!modelId) return null;

  const effective = state.effectiveOverride ?? detected;
  const modeValue = state.source === "inherited" && state.override === null ? "auto" : mode;
  const save = async () => {
    const value = mode === "custom" ? normalizeDraftContextWindow(draft) : null;
    if (mode === "custom" && value === null) {
      setMessage({ error: true, text: text(t, "contextWindow.invalid") });
      return;
    }
    if (typeof remote?.setContextWindowOverride !== "function") {
      setMessage({ error: true, text: text(t, "error.remoteNotMounted", { method: "setContextWindowOverride" }) });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const saved = unwrapRemote(await remote.setContextWindowOverride({ ...scope, value }), t);
      const override = normalizeDraftContextWindow(saved?.override);
      const effectiveOverride = normalizeDraftContextWindow(saved?.effectiveOverride);
      setState({
        status: "ready",
        override,
        effectiveOverride,
        source: saved?.source ?? (override !== null ? "custom" : "auto"),
      });
      setMode(override !== null ? "custom" : "auto");
      setDraft(override === null ? "" : String(override));
      setMessage({ error: false, text: text(t, "contextWindow.saved") });
    } catch (error) {
      setMessage({ error: true, text: errorText(error, t) });
    } finally {
      setBusy(false);
    }
  };

  return h("div", { className: "dockyard-dsh-section dockyard-dsh-context-window" },
    h("div", { className: "dockyard-dsh-section-title" },
      h("span", null, text(t, "contextWindow.title")),
      h("span", { className: "dockyard-dsh-section-value" }, contextWindowScopeLabel(scope, t))),
    h("div", { className: "dockyard-dsh-context-window-meta" },
      h("span", null, text(t, "contextWindow.detected", {
        value: detected === null ? text(t, "contextWindow.noDetected") : `${formatNumber(detected, t)} tokens`,
      })),
      h("span", null, text(t, "contextWindow.effective", {
        value: effective === null ? text(t, "contextWindow.noDetected") : `${formatNumber(effective, t)} tokens`,
      }))),
    h("div", { className: "dockyard-dsh-context-window-row" },
      h("select", {
        className: "dockyard-dsh-context-window-select",
        "aria-label": text(t, "contextWindow.title"),
        value: modeValue,
        disabled: busy || state.status === "loading",
        onChange: (event) => {
          setMode(event.target.value);
          setMessage(null);
          if (event.target.value !== "custom") setDraft("");
        },
      },
        h("option", { value: "auto" }, text(t, "contextWindow.auto")),
        h("option", { value: "custom" }, text(t, "contextWindow.custom"))),
      mode === "custom" ? h("input", {
        className: "dockyard-dsh-context-window-input",
        type: "number",
        min: "1",
        step: "1",
        value: draft,
        placeholder: text(t, "contextWindow.placeholder"),
        "aria-label": text(t, "contextWindow.placeholder"),
        disabled: busy,
        onChange: (event) => setDraft(event.target.value),
      }) : null,
      h("button", {
        type: "button",
        className: "dockyard-dsh-context-window-save",
        disabled: busy || state.status === "loading" || (mode === "custom" && normalizeDraftContextWindow(draft) === null),
        onClick: save,
      }, busy ? text(t, "contextWindow.saving") : text(t, "contextWindow.save"))),
    h("div", { className: "dockyard-dsh-context-window-warning" }, text(t, "contextWindow.warning")),
    message ? h("div", { className: "dockyard-dsh-context-window-message", "data-error": message.error }, message.text) : null);
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
    d: DOCKYARD_CHEVRON_PATH,
    fill: "currentColor",
  })));
}

function quotaView(account, t) {
  const rows = quotaRowsForAccount(account, t);
  if (rows.length === 0) {
    const diagnostic = account?.resources?.quotaDiagnostic ?? text(t, "quota.noWindow");
    const quotaUrl = account?.resources?.quotaUrl;
    return h("div", { className: "dockyard-dsh-muted" },
      diagnostic,
      quotaUrl
        ? h("span", null, " · ", h("a", {
          href: quotaUrl,
          target: "_blank",
          rel: "noreferrer noopener",
        }, text(t, "quota.openUsage")))
        : null,
    );
  }
  return h("div", { className: "dockyard-dsh-quota" }, rows.map((window, index) => {
    const balance = window.kind === "balance";
    const percent = balance ? null : quotaPercent(window);
    const remaining = balance ? (formatBalance(window, t) ?? formatNumber(window.remaining, t)) : formatNumber(window.remaining, t);
    const limit = balance && window.limit !== null && window.limit !== undefined
      ? (formatBalance(window, t, window.limit) ?? formatNumber(window.limit, t))
      : null;
    const value = balance
      ? limit ? `${remaining} / ${limit}` : remaining
      : window.limit === null || window.limit === undefined
        ? remaining
        : `${remaining} / ${formatNumber(window.limit, t)}`;
    const unit = window.unit ? ` ${window.unit}` : "";
    return h("div", { key: `${window.id ?? "quota"}-${index}` },
      h("div", { className: "dockyard-dsh-quota-row" },
        h("span", { className: "dockyard-dsh-quota-copy" }, `${window.name ?? window.id ?? text(t, "value.quota")}${unit}`),
        h("span", { className: "dockyard-dsh-quota-value" }, percent === null ? value : `${percent}%`)),
      percent === null ? null : h("div", { className: "dockyard-dsh-quota-track" },
        h("div", { className: "dockyard-dsh-quota-fill", style: { width: `${percent}%` } })),
      h("div", { className: "dockyard-dsh-muted" }, text(t, "quota.resetUpdated", {
        reset: formatDate(window.resetAt, t),
        updated: formatDate(window.updatedAt, t),
      })));
  }));
}

function AccountCard({ account, current, providerId, controller, busy, t }) {
  const health = account?.health?.status;
  return h("div", { className: "dockyard-dsh-account", "data-current": current },
    h("div", { className: "dockyard-dsh-account-head" },
      h("div", { className: "dockyard-dsh-account-identity" },
        h("div", { className: "dockyard-dsh-account-name" }, accountName(account, t)),
        h("div", { className: "dockyard-dsh-account-id" }, accountIdentityLine(account, t))),
      h("div", { className: "dockyard-dsh-account-actions" },
        h("button", {
          type: "button",
          className: "dockyard-dsh-account-use",
          disabled: busy || current,
          onClick: () => controller.selectAccount(providerId, account.accountId),
        }, current ? text(t, "account.current") : text(t, "account.manualUse")),
        h("button", {
          type: "button",
          className: "dockyard-dsh-account-remove",
          disabled: busy,
          onClick: () => {
            if (typeof window !== "undefined" && !window.confirm(text(t, "account.confirmRemove", { account: accountName(account, t) }))) return;
            controller.removeAccount(providerId, account.accountId);
          },
        }, text(t, "account.remove")))),
    h("div", { className: "dockyard-dsh-account-meta" },
      h("span", { className: "dockyard-dsh-health", "data-bad": ["degraded", "cooldown", "expired", "exhausted"].includes(health) }, `${healthLabel(health, t)} · ${accountPlanLabel(account, t)}`),
      account.refresh?.nextRefreshAt ? h("span", null, `OAuth: ${formatDate(account.refresh.nextRefreshAt, t)}`) : null),
    account.resources?.identityNote ? h("div", { className: "dockyard-dsh-account-note" }, account.resources.identityNote) : null,
    account.health?.lastError ? h("div", { className: "dockyard-dsh-account-error", title: account.health.lastError }, account.health.lastError) : null,
    quotaView(account, t));
}

function candidateMatchesAccount(candidate, account) {
  if (!candidate || !account) return false;
  if (candidate.accountId && account.accountId) return candidate.accountId === account.accountId;
  const candidateEmail = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const accountEmail = typeof account.email === "string" ? account.email.trim().toLowerCase() : "";
  return Boolean(candidateEmail && accountEmail && candidateEmail === accountEmail);
}

function CandidateList({ scan, providerId, controller, busy, accounts = [], t }) {
  const provider = scan?.providers?.find((entry) => entry.providerId === providerId);
  const candidates = provider?.candidates ?? [];
  const availableCandidates = candidates.filter((candidate) => (
    !candidate.imported && !accounts.some((account) => candidateMatchesAccount(candidate, account))
  ));
  if (availableCandidates.length === 0) {
    return h("div", { className: "dockyard-dsh-muted" }, provider?.diagnostics?.join("；") ?? text(t, "candidate.noNew"));
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
    }, text(t, "candidate.add")))));
}

function AuthorizationLoginGuide({ auth, providerId, controller, busy, t }) {
  const [code, setCode] = useState("");
  const active = ["pending", "processing"].includes(auth?.status);
  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim() || busy || !auth?.sessionId) return;
    const result = await controller.submitAuthorizationCode(providerId, auth.sessionId, code);
    if (result) setCode("");
  };
  const providerLabel = providerId === "antigravity" ? "Antigravity" : text(t, "auth.providerSubscription");
  if (!active) return h("div", { className: "dockyard-dsh-login-guide" },
    h("div", { className: "dockyard-dsh-login-guide-title" }, text(t, "auth.browserTitle", { provider: providerLabel })),
    h("div", { className: "dockyard-dsh-login-guide-error" }, auth.diagnostic ?? text(t, "status.oauthEnded")),
    h("button", {
      type: "button", className: "dockyard-dsh-action dockyard-dsh-action-primary", disabled: busy,
      onClick: () => controller.login(providerId),
    }, text(t, "auth.restart")));
  return h("div", { className: "dockyard-dsh-login-guide" },
    h("div", { className: "dockyard-dsh-login-guide-title" }, text(t, auth.terminalOpened ? "auth.terminalTitle" : "auth.browserTitle", { provider: providerLabel })),
    h("div", { className: "dockyard-dsh-login-guide-copy" }, auth.browserOpenFailed ? text(t, "auth.popupBlocked") : auth.instructions ?? text(t, "auth.intro")),
    !auth.terminalOpened ? h("ol", { className: "dockyard-dsh-login-guide-steps" },
      h("li", { className: "dockyard-dsh-login-guide-step" },
        h("span", { className: "dockyard-dsh-login-guide-number" }, "1"),
        h("span", null, text(t, "auth.step1"))),
      h("li", { className: "dockyard-dsh-login-guide-step" },
        h("span", { className: "dockyard-dsh-login-guide-number" }, "2"),
        h("span", null, text(t, "auth.step2"))),
      auth.authorizationCodeRequired ? h("li", { className: "dockyard-dsh-login-guide-step" },
        h("span", { className: "dockyard-dsh-login-guide-number" }, "3"),
        h("span", null, text(t, "auth.step3"))) : null) : null,
    auth.authorizationCodeRequired ? h("form", { className: "dockyard-dsh-login-guide-code", onSubmit: submit },
      h("input", {
        value: code,
        disabled: busy,
        onChange: (event) => setCode(event.target.value),
        placeholder: text(t, "auth.callbackPlaceholder"),
        "aria-label": text(t, "auth.callbackAria"),
      }),
      h("button", { type: "submit", className: "dockyard-dsh-action", disabled: busy || !code.trim() }, text(t, "auth.submit"))) : null,
    auth?.authorizationUrl
      ? h("a", { className: "dockyard-dsh-action", href: auth.authorizationUrl, target: "_blank", rel: "noopener noreferrer" }, text(t, "auth.reopen"))
      : null,
    auth?.sessionId && ["pending", "processing"].includes(auth.status)
      ? h("button", {
        type: "button",
        className: "dockyard-dsh-action dockyard-dsh-action-danger",
        disabled: busy,
        onClick: () => controller.cancelAuthorization(providerId, auth.sessionId),
      }, busy ? text(t, "status.canceling") : text(t, "auth.cancel"))
      : null,
    auth?.diagnostic ? h("div", { className: "dockyard-dsh-login-guide-error" }, auth.diagnostic) : null);
}

function nativeQuotaView(native, t) {
  const usage = native?.usage ?? native?.entry?.usage ?? null;
  if (usage?.status === "unsupported") {
    return h("div", { className: "dockyard-dsh-muted" }, text(t, "native.quotaUnsupported"));
  }
  if (usage?.status === "error") {
    return h("div", { className: "dockyard-dsh-muted", "data-error": true }, text(t, "quota.readFailed", { error: usage.message ?? text(t, "error.unknown") }));
  }
  if (usage?.status === "unconfigured") {
    return h("div", { className: "dockyard-dsh-muted" }, usage.message ?? text(t, "quota.keyUnconfigured"));
  }
  const quota = native?.quota ?? native?.entry?.quota ?? null;
  if (quota) return quotaView({ quota }, t);
  return h("div", { className: "dockyard-dsh-muted" }, text(t, "quota.currentNoWindow"));
}

function NativeKeyCard({ entry, providerId, controller, busy, t }) {
  const configured = entry?.configured === true;
  const current = entry?.active === true;
  const writable = entry?.credential?.writable !== false;
  const label = entry?.label ?? entry?.ref ?? text(t, "title.key");
  return h("div", { className: "dockyard-dsh-account", "data-current": current },
    h("div", { className: "dockyard-dsh-account-head" },
      h("div", { className: "dockyard-dsh-account-identity" },
        h("div", { className: "dockyard-dsh-account-name", title: entry?.ref }, label)),
      h("div", { className: "dockyard-dsh-account-actions" },
        h("button", {
          type: "button",
          className: "dockyard-dsh-account-use",
          disabled: busy || current || !configured,
          onClick: () => controller.selectKey(providerId, entry.ref),
        }, current ? text(t, "native.currentKey") : text(t, "native.manualUse")),
        h("button", {
          type: "button",
          className: "dockyard-dsh-account-remove",
          disabled: busy,
          title: writable ? text(t, "native.removeTitle") : text(t, "native.unlinkTitle"),
          onClick: () => {
            const action = writable ? text(t, "native.removeTitle") : text(t, "native.unlinkTitle");
            if (typeof window !== "undefined" && !window.confirm(text(t, "native.removeConfirm", { action, label }))) return;
            controller.removeKey(providerId, entry.ref);
          },
        }, writable ? text(t, "native.remove") : text(t, "native.unlinkReference")))),
    h("div", { className: "dockyard-dsh-account-meta" },
      h("span", { className: "dockyard-dsh-health", "data-bad": !configured }, configured ? text(t, "native.configured") : text(t, "native.unconfigured")),
      entry?.credential?.source ? h("span", { className: "dockyard-dsh-key-source" }, text(t, "native.source", { source: entry.credential.source })) : null,
      entry?.implicit ? h("span", { className: "dockyard-dsh-key-source" }, text(t, "native.fromProviderConfig")) : null),
    entry?.usage && entry.usage.status !== "unsupported" ? nativeQuotaView(entry, t) : null);
}

function ModelEffortSection({ current, model, efforts, directory, modelSelector, disabled = false, t }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (efforts.length === 0) return null;
  const tier = current?.reasoningEffort ?? model?.reasoning?.defaultEffort;
  const select = async (reasoningEffort) => {
    if (!current || !directory || busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const selection = { ...current, reasoningEffort };
      if (modelSelector) await modelSelector.selectModel(selection);
      else unwrapRemote(await directory.select(selection), t);
    } catch (error) {
      setError(errorText(error, t));
    } finally {
      setBusy(false);
    }
  };
  return h("div", { className: "dockyard-dsh-section" },
    h("div", { className: "dockyard-dsh-section-title" }, text(t, "native.currentModelTier")),
    h("div", { className: "dockyard-dsh-tier-list" }, efforts.map((effort) => h("button", {
      type: "button", className: "dockyard-dsh-tier", key: effort.id,
      "data-active": tier === effort.id, "aria-pressed": tier === effort.id,
      disabled: busy || disabled, title: effort.description ?? effort.id, onClick: () => select(effort.id),
    }, effort.name ?? effort.id))),
    error ? h("div", { role: "alert", className: "dockyard-dsh-account-error" }, error) : null);
}

function ProviderNavigation({ providerId, providers, directoryState, onSelect, busy, t }) {
  const subscriptions = new Map((providers ?? []).map((entry) => [entry.providerId, providerDisplayName(entry.providerId, entry.manifest, t)]));
  const custom = new Map();
  for (const group of directoryState?.groups ?? []) {
    if (!subscriptions.has(group.id)) custom.set(group.id, group.name ?? group.id);
  }
  if (!subscriptions.has(providerId) && !custom.has(providerId)) custom.set(providerId, providerId);
  return h("div", { className: "dockyard-dsh-navigation" },
    h("select", {
      className: "dockyard-dsh-select", value: providerId,
      "aria-label": text(t, "ui.manageProvider"), disabled: busy,
      onChange: (event) => onSelect(event.target.value),
    }, [["ui.subscriptionProviders", subscriptions], ["ui.apiProviders", custom]].filter(([, values]) => values.size)
      .map(([label, values]) => h("optgroup", { key: label, label: text(t, label) },
        [...values].map(([id, name]) => h("option", { key: id, value: id }, name))))));
}

function ModelSelectionStatus({ state, onRetry, t }) {
  if (!state?.pending && !state?.error) return null;
  return h("div", {
    role: state.error ? "alert" : "status",
    className: state.error ? "dockyard-dsh-account-error" : "dockyard-dsh-inline-status",
  }, state.error ?? text(t, "ui.switching"),
  state.error && onRetry ? h("button", {
    type: "button", className: "dockyard-dsh-action", onClick: onRetry,
  }, text(t, "ui.retry")) : null);
}

function ModelSelectionSection({ providerId, directory, directoryState, remote, modelSelector, modelSelectionState, compact = false, busy, t }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState({ busy: false, message: null, error: null });
  const catalogPending = useRef(false);
  const liveCatalog = ["openai-codex", "claude"].includes(providerId) && typeof remote?.catalog === "function";
  const refreshCatalog = async (force = false) => {
    if (!liveCatalog || catalogPending.current) return;
    catalogPending.current = true;
    setCatalogStatus({ busy: true, message: null, error: null });
    try {
      const result = unwrapRemote(await remote.catalog({ providerId, force }), t);
      const entry = result?.providers?.find((value) => value.providerId === providerId);
      setCatalogStatus({ busy: false, message: text(t, "ui.modelsUpdated", { count: entry?.count ?? 0 }), error: entry?.diagnostic ?? null });
    } catch (error) {
      setCatalogStatus({ busy: false, message: null, error: errorText(error, t) });
    } finally {
      catalogPending.current = false;
    }
  };
  useEffect(() => {
    if (!liveCatalog) return undefined;
    void refreshCatalog();
    const timer = setInterval(() => { void refreshCatalog(); }, 300_000);
    return () => clearInterval(timer);
  }, [providerId, remote]);
  const { current, group, model, efforts } = modelDetails(directoryState, providerId);
  if (!directory) return null;
  const models = group?.models ?? [];
  const providerSelectionPending = Boolean(modelSelectionState?.pending);
  const selectionStatus = modelSelectionState?.providerId === providerId ? modelSelectionState : null;
  const select = async (modelId) => {
    if (!modelId || pending || providerSelectionPending || !models.some((entry) => entry.id === modelId)) return;
    setPending(true);
    setError(null);
    try {
      const selection = { provider: providerId, model: modelId };
      if (modelSelector) await modelSelector.selectModel(selection);
      else unwrapRemote(await directory.select(selection), t);
    } catch (error) {
      setError(errorText(error, t));
    } finally {
      setPending(false);
    }
  };
  return h("div", { className: "dockyard-dsh-section" },
    h("label", { className: "dockyard-dsh-model-picker" },
      h("span", { className: "dockyard-dsh-field-label" }, pending ? text(t, "ui.switching") : text(t, "ui.sessionModel")),
      h("select", {
        className: "dockyard-dsh-select", value: current?.model ?? "",
        disabled: busy || pending || providerSelectionPending || directoryState?.status === "selecting" || models.length === 0,
        onChange: (event) => { void select(event.target.value); },
      },
        !current ? h("option", { value: "", disabled: true }, text(t, models.length ? "ui.chooseModel" : selectionStatus?.error || directoryState?.status === "ready" ? "title.noModel" : "subscription.modelPending")) : null,
        current && !models.some((entry) => entry.id === current.model) ? h("option", { value: current.model }, current.model) : null,
        models.map((entry) => h("option", { key: entry.id, value: entry.id }, entry.name ?? entry.id)))),
    liveCatalog ? h("div", { className: "dockyard-dsh-toolbar" },
      h("button", { type: "button", className: "dockyard-dsh-action", disabled: busy || catalogStatus.busy, onClick: () => { void refreshCatalog(true); } }, text(t, catalogStatus.busy ? "ui.refreshingModels" : "ui.refreshModels")),
      catalogStatus.message && !catalogStatus.error ? h("span", { className: "dockyard-dsh-muted", role: "status" }, catalogStatus.message) : null) : null,
    catalogStatus.error ? h("div", { role: "alert", className: "dockyard-dsh-account-error" }, catalogStatus.error) : null,
    h(ModelSelectionStatus, { state: selectionStatus, onRetry: modelSelector ? () => { void modelSelector.retry(); } : null, t }),
    error ? h("div", { role: "alert", className: "dockyard-dsh-account-error" }, error) : null,
    h(ModelEffortSection, { key: current?.model, current, model, efforts, directory, modelSelector, disabled: providerSelectionPending, t }));
}

function OperationStatus({ state, providerId, t }) {
  if (providerId && state.providerId && state.providerId !== providerId) return null;
  const message = state.error ?? (state.action ? text(t, `ui.action.${state.action}`) : state.message)
    ?? (state.status === "loading" ? text(t, "status.reading") : null);
  if (!message) return null;
  return h("div", {
    className: "dockyard-dsh-status", "data-error": Boolean(state.error),
    "data-success": Boolean(state.message && !state.error && !state.action),
    role: state.error ? "alert" : "status", "aria-atomic": true,
  }, h("span", { className: "dockyard-dsh-status-copy" }, message));
}

function NativeKeyPopup({ providerId, native, providers, directory, directoryState, modelSelector, modelSelectionState, nativeController, remote, onSelectProvider, onClose, t }) {
  const [keyDraft, setKeyDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const { current, group, model } = modelDetails(directoryState, providerId);
  const busy = native.action !== null;
  const loadingConfig = ["idle", "loading"].includes(native.status) && !native.native;
  const canManage = native.native && Boolean(native.namespace);
  const keys = native.keys ?? [];
  const activeKeyRef = native.apiKeyRef ?? keys.find((entry) => entry.active)?.ref ?? null;
  const title = native.entry?.displayName ?? group?.name ?? providerId;
  const accountProvider = native.entry?.settingsNs === "llm-deepseek";
  let endpointHost = null;
  try { endpointHost = new URL(native.profile?.baseURL).host; } catch { /* Optional connection detail. */ }
  const addKey = async (event) => {
    event.preventDefault();
    if (!keyDraft.trim() || busy) return;
    const added = await nativeController.addKey(providerId, keyDraft, labelDraft);
    if (added) { setKeyDraft(""); setLabelDraft(""); setAdding(false); }
  };
  return h("div", {
    className: "dockyard-dsh-popup dockyard-dsh-native-key-popup", role: "dialog", tabIndex: -1,
    "aria-label": text(t, "native.keyAria", { title }),
    onMouseDown: (event) => event.stopPropagation(),
  },
    h("div", { className: "dockyard-dsh-head" },
      h("div", { className: "dockyard-dsh-head-copy" },
        h("div", { className: "dockyard-dsh-title" }, title),
        h("div", { className: "dockyard-dsh-model" }, accountProvider ? text(t, "native.dshAccount") : endpointHost ?? text(t, "ui.apiProviderSubtitle"))),
      h("button", { type: "button", className: "dockyard-dsh-close", onClick: onClose, "aria-label": text(t, "ui.close") }, "×")),
    h(ProviderNavigation, { providerId, providers, directoryState, onSelect: onSelectProvider, busy: busy && native.action !== "refresh", t }),
    native.error || native.message || (native.action && native.action !== "refresh")
      ? h(OperationStatus, { state: native, providerId, t }) : null,
    h("div", { className: "dockyard-dsh-popup-scroll" },
      h(ModelSelectionSection, { key: providerId, providerId, directory, directoryState, modelSelector, modelSelectionState, remote, compact: true, busy: busy && native.action !== "refresh", t }),
      accountProvider ? h("div", { className: "dockyard-dsh-empty" }, text(t, "native.dshAccountHint")) : h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-heading" },
          h("span", null, "API Key", canManage ? h("span", { className: "dockyard-dsh-count" }, keys.length) : null),
          h("button", { type: "button", className: "dockyard-dsh-action", disabled: busy, onClick: () => nativeController.refresh(providerId) }, text(t, "native.reload"))),
        loadingConfig
          ? h("div", { className: "dockyard-dsh-inline-status", role: "status" }, text(t, "native.readingConfig"))
          : !canManage
            ? (!native.error ? h("div", { className: "dockyard-dsh-muted" }, text(t, "native.configUnavailable")) : null)
          : keys.length === 0
            ? h("div", { className: "dockyard-dsh-empty" }, text(t, "native.noKeys"))
          : keys.map((entry) => h(NativeKeyCard, { key: entry.ref, entry, providerId, controller: nativeController, busy, t })),
        canManage && native.quotaRefreshing ? h("div", { className: "dockyard-dsh-inline-status", role: "status" }, text(t, "native.readingQuota")) : null,
        canManage && !busy && keys.length > 0 && !keys.some((entry) => entry.active && entry.usage && entry.usage.status !== "unsupported")
          ? nativeQuotaView(keys.find((entry) => entry.active && entry.usage) ?? native, t) : null),
      canManage ? h("details", { className: "dockyard-dsh-disclosure", open: adding, onToggle: (event) => setAdding(event.currentTarget.open) },
        h("summary", null, text(t, "native.addKeyTitle")),
        h("form", { className: "dockyard-dsh-key-form", onSubmit: addKey },
          h("input", {
            className: "dockyard-dsh-key-input", type: "password", value: keyDraft,
            placeholder: text(t, "native.pasteApiKey"), "aria-label": text(t, "native.pasteApiKey"),
            autoCapitalize: "none", spellCheck: false, disabled: busy, autoComplete: "off",
            onChange: (event) => setKeyDraft(event.target.value),
          }),
          h("input", {
            className: "dockyard-dsh-key-input", type: "text", value: labelDraft,
            placeholder: text(t, "native.optionalName"), "aria-label": text(t, "native.optionalName"), disabled: busy,
            onChange: (event) => setLabelDraft(event.target.value),
          }),
          h("button", { type: "submit", className: "dockyard-dsh-key-save", disabled: busy || !keyDraft.trim() }, native.action === "add" ? text(t, "native.saving") : text(t, "native.save")))) : null,
      canManage ? h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-heading" }, text(t, "ui.advanced")),
        h("div", { className: "dockyard-dsh-section" },
          h("label", { className: "dockyard-dsh-field" },
            h("span", { className: "dockyard-dsh-field-label" }, text(t, "native.keyStrategy")),
            h("select", { className: "dockyard-dsh-select", value: native.policy ?? "manual", disabled: busy,
              onChange: (event) => { void nativeController.setPolicy(providerId, event.target.value); } },
              h("option", { value: "manual" }, text(t, "nativePolicy.manual")),
              h("option", { value: "round_robin", disabled: native.runtimeMode !== "request-key-pool" }, text(t, "nativePolicy.round_robin")),
              h("option", { value: "failover", disabled: native.runtimeMode !== "request-key-pool" }, text(t, "nativePolicy.failover")))),
          h("div", { className: "dockyard-dsh-muted" }, text(t, native.runtimeMode === "request-key-pool" ? "native.notice.requestPool" : "native.notice.manual")),
          h(ContextWindowSection, { key: `${providerId}:${current?.model}:${activeKeyRef}`, providerId, current, model, keyRef: activeKeyRef, remote, t }))) : null));
}

function SubscriptionOverviewPopup({ providers, directoryState, modelSelectionState, controlState, controller, selectedProviderId, onSelect, onClose, t }) {
  const busy = controlState.action !== null;
  const custom = (directoryState?.groups ?? []).filter((group) => !providers.some((provider) => provider.providerId === group.id));
  return h("div", {
    className: "dockyard-dsh-popup",
    role: "dialog",
    tabIndex: -1,
    "aria-label": text(t, "subscription.aria"),
    onMouseDown: (event) => event.stopPropagation(),
  },
    h("div", { className: "dockyard-dsh-head" },
      h("div", { className: "dockyard-dsh-head-copy" },
        h("div", { className: "dockyard-dsh-title" }, text(t, "title.subscriptionManagement")),
        h("div", { className: "dockyard-dsh-model" }, text(t, "subtitle.subscriptionManagement"))),
      h("button", { type: "button", className: "dockyard-dsh-close", onClick: onClose, "aria-label": text(t, "ui.close") }, "×")),
    h(OperationStatus, { state: controlState, t }),
    h(ModelSelectionStatus, { state: modelSelectionState, t }),
    h("div", { className: "dockyard-dsh-popup-scroll" },
      h("div", { className: "dockyard-dsh-toolbar" },
        h("button", {
          type: "button",
          className: "dockyard-dsh-action dockyard-dsh-action-primary",
          disabled: busy,
          onClick: () => controlState.snapshot ? controller.refresh() : controller.ensureSnapshot().catch(() => {}),
        }, controlState.status === "loading" ? text(t, "status.refreshing") : text(t, controlState.snapshot ? "subscription.refreshAll" : "ui.retry"))),
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" },
          h("span", null, text(t, "subscription.providers")),
          h("span", { className: "dockyard-dsh-section-value" }, text(t, "subscription.providerCount", { count: providers.length }))),
        providers.length === 0
          ? h("div", { className: "dockyard-dsh-muted" }, text(t, "subscription.none"))
          : h("div", { className: "dockyard-dsh-provider-list" }, providers.map((provider) => {
            const providerId = provider.providerId;
            const group = directoryState?.groups?.find((entry) => entry.id === providerId);
            const modelCount = directoryState
              ? Array.isArray(group?.models)
                ? text(t, "subscription.modelCount", { count: group.models.length })
                : text(t, "subscription.modelPending")
              : null;
            const displayName = providerDisplayName(providerId, provider.manifest, t);
            return h("button", {
              type: "button",
              className: "dockyard-dsh-provider-row",
              "data-current": providerId === selectedProviderId,
              key: providerId,
              disabled: busy && controlState.action !== "refresh",
              onClick: () => onSelect(providerId),
              "aria-label": text(t, "subscription.configure", { provider: displayName }),
            },
              h("span", { className: "dockyard-dsh-provider-row-copy" },
                h("span", { className: "dockyard-dsh-provider-row-name" }, displayName),
                h("span", { className: "dockyard-dsh-provider-row-meta" }, `${providerOverviewSummary(provider, t)}${modelCount ? ` · ${modelCount}` : ""}`)),
              h("span", { className: "dockyard-dsh-provider-row-arrow", "aria-hidden": true }, "›"));
         }))),
      custom.length ? h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-heading" }, text(t, "ui.apiProviders")),
        h("div", { className: "dockyard-dsh-provider-list" }, custom.map((group) => h("button", {
          key: group.id, type: "button", className: "dockyard-dsh-provider-row", "data-current": group.id === selectedProviderId,
          disabled: busy && controlState.action !== "refresh", onClick: () => onSelect(group.id),
          "aria-label": text(t, "subscription.configure", { provider: group.name ?? group.id }),
        }, h("span", { className: "dockyard-dsh-provider-row-copy" },
          h("span", { className: "dockyard-dsh-provider-row-name" }, group.name ?? group.id),
          h("span", { className: "dockyard-dsh-provider-row-meta" }, text(t, "subscription.modelCount", { count: group.models?.length ?? 0 }))),
        h("span", { className: "dockyard-dsh-provider-row-arrow", "aria-hidden": true }, "›"))))) : null));
}

function SubscriptionSettingsSection({ close, controller, remote, t }) {
  const controlState = useSnapshot(controller.store);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const providers = controlState.snapshot?.providers ?? [];
  const provider = selectedProviderId
    ? providerFromSnapshot(controlState.snapshot, selectedProviderId)
    : null;

  useEffect(() => {
    controller.ensureSnapshot().catch(() => {});
  }, [controller]);

  useEffect(() => {
    if (selectedProviderId && !provider) setSelectedProviderId(null);
  }, [selectedProviderId, provider]);

  useEffect(() => {
    if (!selectedProviderId || !provider) return undefined;
    controller.ensure(selectedProviderId).catch(() => {});
    void controller.refresh(selectedProviderId, { background: true });
    const timer = setInterval(() => controller.refresh(selectedProviderId, { background: true }), 30_000);
    return () => clearInterval(timer);
  }, [controller, selectedProviderId, Boolean(provider)]);

  return h("div", { className: "dockyard-dsh-settings-section" },
    provider
      ? h(DockyardPopup, {
        providerId: selectedProviderId,
        provider,
        directory: null,
        directoryState: null,
        controlState,
        controller,
        remote,
        onSelectProvider: setSelectedProviderId,
        onClose: close,
        t,
      })
      : h(SubscriptionOverviewPopup, {
        providers,
        directoryState: null,
        controlState,
        controller,
        selectedProviderId: null,
        onSelect: setSelectedProviderId,
        onClose: close,
        t,
      }));
}

function DockyardPopup({ providerId, provider, directory, directoryState, modelSelector, modelSelectionState, controlState, controller, remote, onSelectProvider, onClose, t }) {
  const { current, model } = modelDetails(directoryState, providerId);
  const accounts = provider?.accounts ?? [];
  const activeId = provider?.defaultAccountId ?? null;
  const contextAccountId = activeId ?? (accounts.length === 1 ? accounts[0]?.accountId ?? null : null);
  const busy = controlState.action !== null;
  const authInProgress = controlState.auth?.providerId === providerId
    && ["pending", "processing"].includes(controlState.auth?.status)
    && Boolean(controlState.auth?.sessionId);
  const needsReauthorization = accounts.some((account) => account?.health?.status === "expired");
  const supportsOAuthLogin = provider?.manifest?.capabilities?.includes("oauth_authorization");
  const scan = controlState.scan?.providers?.some((entry) => entry.providerId === providerId) ? controlState.scan : null;
  return h("div", {
    className: "dockyard-dsh-popup", role: "dialog", tabIndex: -1,
    "aria-label": `${providerDisplayName(providerId, provider?.manifest, t)} ${text(t, "trigger.accountQuota")}`,
    onMouseDown: (event) => event.stopPropagation(),
  },
    h("div", { className: "dockyard-dsh-head" },
      h("div", { className: "dockyard-dsh-head-copy" },
        h("div", { className: "dockyard-dsh-title" }, providerDisplayName(providerId, provider?.manifest, t)),
        h("div", { className: "dockyard-dsh-model" }, text(t, "ui.subscriptionSubtitle"))),
      h("button", { type: "button", className: "dockyard-dsh-close", onClick: onClose, "aria-label": text(t, "ui.close") }, "×")),
    h(ProviderNavigation, { providerId, providers: controlState.snapshot?.providers, directoryState, onSelect: onSelectProvider, busy: busy && controlState.action !== "refresh", t }),
    h(OperationStatus, { state: controlState, providerId, t }),
    h("div", { className: "dockyard-dsh-popup-scroll" },
      h(ModelSelectionSection, { key: connectedAccountSignature({ providers: [provider] }), providerId, directory, directoryState, modelSelector, modelSelectionState, remote, busy, t }),
      controlState.auth?.providerId === providerId
        ? h(AuthorizationLoginGuide, { key: controlState.auth.sessionId, auth: controlState.auth, providerId, controller, busy, t }) : null,
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-heading" },
          h("span", null, text(t, "subscription.connectedAccounts"), " (", accounts.length, ")"),
          h("button", { type: "button", className: "dockyard-dsh-action", disabled: busy, onClick: () => controller.refresh(providerId) }, controlState.action === "refresh" && controlState.providerId === providerId ? text(t, "status.refreshing") : text(t, "native.refresh"))),
        accounts.length === 0
          ? h("div", { className: "dockyard-dsh-empty" }, text(t, providerId === "antigravity" ? "subscription.noAntigravityAccounts" : supportsOAuthLogin ? "subscription.noAccountsOAuth" : "subscription.noAccountsScan"))
          : accounts.map((account) => h(AccountCard, { key: account.accountId, account, current: account.accountId === activeId, providerId, controller, busy, t }))),
      h("div", { className: "dockyard-dsh-toolbar" },
        h("button", { type: "button", className: "dockyard-dsh-action dockyard-dsh-action-primary", disabled: busy || authInProgress, onClick: () => controller.login(providerId) }, authInProgress ? text(t, "status.verificationInProgress")
          : providerId === "antigravity" ? text(t, "auth.connectOfficial")
          : needsReauthorization && supportsOAuthLogin ? text(t, "auth.reauthorize")
            : text(t, supportsOAuthLogin ? "auth.loginAdd" : "auth.officialInstructions")),
        h("button", { type: "button", className: "dockyard-dsh-action", disabled: busy, onClick: () => controller.scan(providerId) }, controlState.action === "scan" && controlState.providerId === providerId ? text(t, "status.scanning") : text(t, "auth.scanLocal"))),
      scan ? h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-title" }, text(t, "subscription.localCandidates")),
        h(CandidateList, { scan, providerId, controller, busy, accounts, t })) : null,
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-heading" }, text(t, "ui.advanced")),
        h("div", { className: "dockyard-dsh-section" },
          h("label", { className: "dockyard-dsh-field" },
            h("span", { className: "dockyard-dsh-field-label" }, text(t, "subscription.accountStrategy")),
            h("select", { className: "dockyard-dsh-select", value: provider?.policy ?? "round_robin", disabled: busy,
              onChange: (event) => controller.setPolicy(providerId, event.target.value) },
              Object.keys(POLICY_KEYS).map((value) => h("option", { value, key: value }, policyLabel(t, value))))),
          h(ContextWindowSection, { key: `${providerId}:${current?.model}:${contextAccountId}`, providerId, current, model, accountId: contextAccountId, remote, t }),
          providerId === "antigravity" ? h("div", { className: "dockyard-dsh-muted" }, text(t, "subscription.antigravityNote")) : null))));
}

function DockyardAccountControl({ sessionId, directory, modelDirectory, loadModelCatalog, controller, nativeController, remote, t }) {
  const directoryState = useSnapshot(directory);
  const modelSelector = useMemo(() => new ProviderModelSelectionController(modelDirectory, {
    loadCatalog: loadModelCatalog,
  }), [modelDirectory, loadModelCatalog]);
  const modelSelectionState = useSnapshot(modelSelector.store);
  useEffect(() => () => modelSelector.cancel(), [modelSelector]);
  useEffect(() => {
    modelSelector.remember(directoryState.current);
  }, [modelSelector, directoryState.current]);
  const controlState = useSnapshot(controller.store);
  const nativeState = useSnapshot(nativeController.store);
  const [open, setOpen] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [detailProviderId, setDetailProviderId] = useState(null);
  const rootRef = useRef(null);
  const compactIndicatorCacheRef = useRef({ providerId: null, indicator: null });
  const accountSignatureRef = useRef(undefined);
  const modelSelectionSignatureRef = useRef(undefined);
  const { current, group, model } = modelDetails(directoryState);
  const currentProviderId = current?.provider ?? null;
  const modelSelectionSignature = JSON.stringify([
    sessionId,
    current?.provider ?? null,
    current?.model ?? null,
  ]);
  const providers = controlState.snapshot?.providers ?? [];
  const currentProvider = providerFromSnapshot(controlState.snapshot, currentProviderId);
  const currentNative = nativeState.providerId === currentProviderId && nativeState.native ? nativeState : null;
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
  const nativeSwitchBlocked = Boolean(!provider && nativeState.providerId !== providerId
    && nativeState.action && nativeState.action !== "refresh");

  useEffect(() => {
    installStyles();
  }, []);

  useEffect(() => {
    const previous = modelSelectionSignatureRef.current;
    modelSelectionSignatureRef.current = modelSelectionSignature;
    if (previous === undefined || previous === modelSelectionSignature) return;

    // Follow external model changes, but an older in-flight selection must not
    // pull the popup away from a newer provider the user is choosing.
    if (modelSelector.store.getSnapshot().pending) return;
    setShowOverview(false);
    setDetailProviderId(currentProviderId);
  }, [currentProviderId, modelSelectionSignature, modelSelector]);

  useEffect(() => {
    controller.ensureSnapshot().catch(() => {});
  }, [controller]);

  useEffect(() => {
    if (typeof remote?.catalog !== "function") return undefined;
    const previous = accountSignatureRef.current;
    accountSignatureRef.current = accountSignature;
    // The host invalidates DSH's shared model directory after account changes;
    // ModelDirectory.load alone reuses its already-loaded catalog.
    if (!accountSignature || (previous !== undefined && previous === accountSignature)) return undefined;
    const timer = setTimeout(() => {
      const loading = remote.catalog({});
      loading?.catch?.(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [accountSignature, remote]);

  useEffect(() => {
    if (!providerId || !snapshotReady || nativeSwitchBlocked) return undefined;
    const hasProvider = Boolean(provider);
    if (hasProvider) {
      void controller.refresh(providerId, { background: true });
      const timer = setInterval(() => controller.refresh(providerId, { background: true }), 30_000);
      return () => clearInterval(timer);
    }
    void nativeController.refresh(providerId);
    const timer = setInterval(() => nativeController.refresh(providerId, { background: true }), 30_000);
    return () => clearInterval(timer);
  }, [controller, nativeController, providerId, Boolean(provider), snapshotReady, nativeSwitchBlocked]);

  useEffect(() => {
    if (!open) return undefined;
    const anchor = rootRef.current;
    const popup = anchor?.querySelector('[role="dialog"]');
    // The browser's top layer keeps transformed composer ancestors from
    // shifting or clipping a viewport-positioned popup.
    if (typeof popup?.showPopover === "function") {
      popup.setAttribute("popover", "manual");
      popup.showPopover();
    }
    popup?.focus({ preventScroll: true });
    const closeOutside = (event) => {
      if (!anchor?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape" && (anchor?.contains(event.target) || event.target === document.body)) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        anchor.querySelector(".dockyard-dsh-trigger")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", onKeyDown);
      if (document.activeElement === document.body || popup?.contains(document.activeElement)) {
        anchor?.querySelector(".dockyard-dsh-trigger")?.focus({ preventScroll: true });
      }
    };
  }, [open, providerId, showOverview, sessionId]);

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
        anchor.style.setProperty("--dockyard-dsh-popup-max-height", `${Math.min(640, availableAbove)}px`);
      } else {
        anchor.style.setProperty("--dockyard-dsh-popup-top", `${margin}px`);
        anchor.style.setProperty("--dockyard-dsh-popup-bottom", "auto");
        anchor.style.setProperty("--dockyard-dsh-popup-max-height", `${Math.max(0, viewportHeight - margin * 2)}px`);
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

  const currentSelectedAccount = providerAccount(currentProvider);
  const loading = controlState.action !== null || nativeState.action !== null || directoryState.status === "loading";
  const quotaSource = currentProvider
    ? currentSelectedAccount?.quota
    : currentNative?.quota ?? currentNative?.entry?.quota;
  const liveCompactIndicator = selectQuotaIndicator(quotaWindowRows(quotaSource, t));
  let compactIndicator = liveCompactIndicator;
  if (liveCompactIndicator) {
    compactIndicatorCacheRef.current = { providerId: currentProviderId, indicator: liveCompactIndicator };
  } else if (loading && compactIndicatorCacheRef.current.providerId === currentProviderId) {
    // A refresh clears the native quota briefly. Keep the last verified value
    // mounted while the popup refreshes so the control does not jump away.
    compactIndicator = compactIndicatorCacheRef.current.indicator;
  } else if (!loading) {
    compactIndicatorCacheRef.current = { providerId: currentProviderId, indicator: null };
  }
  const compactBalance = compactIndicator?.type === "balance"
    ? formatBalance(compactIndicator.window, t)
    : null;
  const compactLabel = compactIndicator?.type === "balance"
    ? compactBalance
    : compactIndicator?.type === "quota" ? `${compactIndicator.percent}%` : null;
  const quotaValue = compactIndicator?.type === "quota" ? compactIndicator.percent : null;
  const health = currentSelectedAccount?.health?.status;
  const quotaLevel = loading
    ? "loading"
    : ["expired", "exhausted", "degraded"].includes(health)
      ? "critical"
      : compactIndicator?.type === "balance"
        ? compactIndicator.remaining <= 0 ? "critical" : "balance"
        : quotaValue === null
        ? "unknown"
        : quotaValue <= 10 ? "critical" : quotaValue <= 25 ? "warning" : "healthy";
  const providerLabel = currentProviderId
    ? providerDisplayName(currentProviderId, currentProvider?.manifest ?? currentNative?.entry, t)
    : text(t, "trigger.subscriptionManagement");
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
  const selectProvider = (selectedProviderId) => {
    setShowOverview(false);
    setDetailProviderId(selectedProviderId);
    void modelSelector.selectProvider(selectedProviderId);
  };
  const overviewOpen = open && (showOverview || !providerId || (!provider && !native));
  return h("div", { className: "dockyard-dsh-anchor", ref: rootRef },
    h("button", {
      type: "button",
      className: "dockyard-dsh-trigger",
      "aria-haspopup": "dialog",
      title: currentProviderId
         ? [text(t, "trigger.providerModel", { provider: providerLabel, model: modelLabel }), compactLabel].filter(Boolean).join(" · ")
         : text(t, "trigger.subscriptionManagement"),
      "aria-label": currentProviderId
        ? `${providerLabel} ${text(t, "trigger.accountQuota")}${compactLabel ? ` ${compactLabel}` : ""}`
        : text(t, "subscription.aria"),
      "aria-expanded": open,
      onClick: toggleOpen,
    },
      h("span", { className: "dockyard-dsh-label" }, providerLabel),
      compactIndicator?.type === "balance"
        ? h("span", { className: "dockyard-dsh-balance", "data-level": quotaLevel }, compactLabel)
        : compactIndicator?.type === "quota" ? h(React.Fragment, null, h("span", {
          className: "dockyard-dsh-quota-meter",
          role: "progressbar",
          "aria-label": `${text(t, "value.quota")} ${compactLabel}`,
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-valuenow": quotaValue,
          "data-level": quotaLevel,
        }, h("span", {
          className: "dockyard-dsh-quota-meter-fill",
          style: { width: `${quotaValue}%` },
        })), h("span", { className: "dockyard-dsh-balance", "data-level": quotaLevel }, compactLabel)) : null,
      h(ChevronIcon, { open })),
    overviewOpen ? h(SubscriptionOverviewPopup, {
      providers,
      directoryState,
      modelSelectionState,
      controlState,
      controller,
      selectedProviderId: currentProviderId,
       t,
      onSelect: selectProvider,
      onClose: () => {
        setShowOverview(false);
        setOpen(false);
      },
    }) : open && provider ? h(DockyardPopup, {
      key: `${sessionId}:${providerId}`,
      providerId,
      provider,
      directory: modelDirectory,
      directoryState,
      modelSelector,
      modelSelectionState,
      controlState,
      controller,
      remote,
      t,
      onSelectProvider: selectProvider,
      onClose: () => setOpen(false),
    }) : open && native ? h(NativeKeyPopup, { t,
      key: `${sessionId}:${providerId}`,
      providerId,
      native,
      providers,
      directory: modelDirectory,
      directoryState,
      modelSelector,
      modelSelectionState,
      nativeController,
      remote,
      onSelectProvider: selectProvider,
      onClose: () => setOpen(false),
    }) : null);
}

// `remote.dockyard` is created by this plugin's own `$mount` call below. It
// must not be a top-level dependency, otherwise Cordis waits for the service
// before running this plugin and the plugin can never create it.
export const inject = ["slots", "modelDirectories", "remote", "remote.session", "remote.llm", "remote.settings", "remote.credentials", "locale"];

/** Mount the provider-aware account control in the native DSH composer. */
export async function apply(ctx) {
  installStyles();
  const disposeModelMenuFolding = installModelMenuFolding();
  const disposeLocale = ctx.locale.register(DOCKYARD_LOCALE_NS, DOCKYARD_LOCALES);
  const t = ctx.locale.bind(DOCKYARD_LOCALE_NS);
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
  // Read the dynamically mounted namespace through the service registry. The
  // traceable `ctx.remote.dockyard` property requires a declared inject and
  // would reintroduce the self-dependency deadlock above.
  const remote = ctx.get("remote.dockyard");
  const controller = new DockyardClientController(remote, t);
  ctx.inject(["slots", "modelDirectories", "remote.session", "remote.llm", "remote.settings", "remote.credentials"], (scope) => {
    const nativeController = new NativeKeyPoolController(createNativeKeyApi(scope.remote), remote, t);
    const loadModelCatalog = () => scope.remote.session.modelCatalog();
    scope.slots.inject("conversation.input.right", () => scope.slots.register({
      name: "conversation.input.right",
      id: "dockyard-account-control",
      order: 10,
       locale: DOCKYARD_LOCALE_NS,
      inject: (sessionId) => {
        const modelDirectory = scope.modelDirectories.directoryFor(sessionId);
        return {
          sessionId,
          directory: modelDirectory.store,
          modelDirectory,
          loadModelCatalog,
          controller,
          nativeController,
          remote,
        };
      },
    }, DockyardAccountControl));
    scope.slots.inject("settings.section", () => scope.slots.register({
      name: "settings.section",
      id: "dockyard-subscriptions",
      order: 15,
      label: () => text(t, "settings.subscriptionSection"),
      locale: DOCKYARD_LOCALE_NS,
      inject: () => ({ controller, remote }),
    }, SubscriptionSettingsSection));
  });
  return async () => {
    disposeModelMenuFolding();
    disposeLocale?.();
    controller.dispose();
    await disposeRemote?.();
  };
}
