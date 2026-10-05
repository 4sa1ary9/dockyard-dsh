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
import { quotaLevel, quotaWindowLabel, selectQuotaIndicator } from "./quota-display.mjs";

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

const POPUP_WIDTH = 440;
const POPUP_MAX_HEIGHT = 640;
const POPUP_MARGIN = 14;

// Every colour, radius and shadow comes from the DSH design tokens (--dsw-*),
// so the control follows the host's light/dark palette and menu material. The
// fallbacks cover hosts that predate a token (radius, elevation, focus ring).
// Coloured 12px text uses the *-ink variants: the state colour mixed toward the
// text colour, which keeps it at 4.5:1 on both themes. Fills use the raw token.
const CSS = `
.dockyard-dsh-anchor,.dockyard-dsh-settings-section{--dockyard-ink:var(--dsw-alias-label-primary,#0f1115);--dockyard-ink-2:var(--dsw-alias-label-secondary,#61666b);--dockyard-ink-3:color-mix(in srgb,var(--dsw-alias-label-secondary,#61666b) 60%,var(--dsw-alias-label-tertiary,#81858c));--dockyard-line:var(--dsw-alias-border-l2,#0000001a);--dockyard-line-strong:var(--dsw-alias-border-l4,#00000029);--dockyard-fill:var(--dsw-alias-interactive-bg-hover,#2631480f);--dockyard-fill-active:var(--dsw-alias-interactive-bg-active,#2631481a);--dockyard-track:var(--dsw-alias-border-l3,#0000001f);--dockyard-control:var(--dsw-alias-bg-layer-1,#fff);--dockyard-accent:var(--dsw-alias-state-business-primary,#4176e6);--dockyard-ok:var(--dsw-alias-state-success-primary,#22c55e);--dockyard-warn:var(--dsw-alias-state-warn-primary,#f59e0b);--dockyard-danger:var(--dsw-alias-state-error-primary,#ec1313);--dockyard-accent-ink:color-mix(in srgb,var(--dockyard-accent) 78%,var(--dockyard-ink));--dockyard-danger-ink:color-mix(in srgb,var(--dockyard-danger) 70%,var(--dockyard-ink));--dockyard-warn-ink:color-mix(in srgb,var(--dsw-alias-state-warn-label,#dd8629) 60%,var(--dockyard-ink));--dockyard-danger-fill:var(--dsw-alias-interactive-bg-hover-danger,#ec13130d);--dockyard-idle:var(--dsw-alias-state-idle-primary,var(--dsw-alias-label-caption,#adb2b8));--dockyard-radius-sm:var(--dsw-radius-sm,8px);--dockyard-radius-md:var(--dsw-radius-md,10px);--dockyard-radius-lg:var(--dsw-radius-lg,14px);--dockyard-font:var(--dsw-font-family,"Segoe UI","Microsoft YaHei",sans-serif);--dockyard-ease:var(--ds-ease-in-out,cubic-bezier(.4,0,.2,1))}

/* Composer trigger: same geometry as the host's model selector next to it. */
.dockyard-dsh-anchor{position:relative;display:inline-flex;align-items:center;min-width:0;z-index:25}
.dockyard-dsh-trigger{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:min(260px,40cqw);height:28px;padding:0 4px 0 8px;border:0;border-radius:var(--dsw-radius-sm,999px);background:transparent;color:var(--dockyard-ink-2);cursor:pointer;font:400 13px/20px var(--dockyard-font);white-space:nowrap}
.dockyard-dsh-trigger:hover,.dockyard-dsh-trigger[aria-expanded=true]{background:var(--dockyard-fill)}
.dockyard-dsh-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dockyard-dsh-trigger .dockyard-dsh-meter{flex:none;width:40px}
.dockyard-dsh-trigger-value{flex:none;font-size:12px;font-variant-numeric:tabular-nums}
.dockyard-dsh-trigger-value[data-level=critical]{color:var(--dockyard-danger-ink)}
.dockyard-dsh-chevron{display:inline-flex;width:14px;height:14px;flex:none;align-items:center;justify-content:center;color:var(--dsw-alias-label-caption,#adb2b8);transition:transform 120ms}
.dockyard-dsh-chevron[data-open=true],.dockyard-dsh-disclosure[open]>summary .dockyard-dsh-chevron{transform:rotate(180deg)}
.dockyard-dsh-chevron svg{display:block;width:14px;height:14px}

/* Group folding inside the host's own model menu, which sits outside the anchor. */
.dockyard-dsh-model-group-toggle{display:flex!important;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;user-select:none;outline:0}
.dockyard-dsh-model-group-toggle:hover,.dockyard-dsh-model-group-toggle:focus-visible{color:var(--dsw-alias-label-primary,#0f1115)}
.dockyard-dsh-model-group-toggle .dockyard-dsh-model-group-chevron{margin-left:auto;color:inherit}
section[data-dockyard-model-group-collapsed="true"]>[role="menuitemradio"]{display:none!important}

/* Popup surface: the host's translucent menu material and elevation. */
.dockyard-dsh-popup{position:fixed;z-index:1000;left:var(--dockyard-dsh-popup-left,${POPUP_MARGIN}px);top:var(--dockyard-dsh-popup-top,${POPUP_MARGIN}px);right:auto;bottom:var(--dockyard-dsh-popup-bottom,auto);box-sizing:border-box;display:flex;flex-direction:column;width:min(${POPUP_WIDTH}px,calc(100vw - ${POPUP_MARGIN * 2}px));max-height:var(--dockyard-dsh-popup-max-height,min(${POPUP_MAX_HEIGHT}px,calc(100dvh - ${POPUP_MARGIN * 2}px)));margin:0;padding:0;overflow:hidden;border:0;border-radius:var(--dockyard-radius-lg);background:var(--dsw-menu-surface-fill,var(--dsw-specific-menu,#fff));-webkit-backdrop-filter:var(--dsw-menu-backdrop-filter,none);backdrop-filter:var(--dsw-menu-backdrop-filter,none);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,#0000000a);box-shadow:var(--dsw-elevation-prominent,0 0 0 .5px var(--dsw-alias-border-l3,#00000029),0 12px 32px #00000024);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2,#e5e5e5);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2,#d4d4d4);color:var(--dockyard-ink);font:400 13px/20px var(--dockyard-font);text-align:left;animation:dockyard-dsh-popup-in 140ms var(--dockyard-ease)}
body[data-ds-dark-theme] .dockyard-dsh-popup{--dsw-elevation-stroke-color:var(--dsw-alias-border-l3,#ffffff29)}
.dockyard-dsh-popup:focus{outline:none}
@keyframes dockyard-dsh-popup-in{from{opacity:0;transform:translateY(4px)}}
.dockyard-dsh-head{display:flex;align-items:center;gap:2px;flex:none;min-height:28px;padding:8px 8px 8px 10px;border-bottom:.5px solid var(--dockyard-line)}
.dockyard-dsh-title{min-width:0;flex:1;padding-left:4px;overflow:hidden;font-size:14px;font-weight:600;line-height:22px;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-navigation{display:flex;min-width:0;flex:1}
.dockyard-dsh-navigation select{field-sizing:content;appearance:none;min-width:0;max-width:100%;height:28px;margin:0;padding:0 22px 0 6px;border:0;border-radius:var(--dockyard-radius-sm);background:transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") right 5px center/12px no-repeat;color:var(--dockyard-ink);cursor:pointer;font:600 14px/22px var(--dockyard-font);text-overflow:ellipsis}
.dockyard-dsh-navigation select:hover:not(:disabled){background-color:var(--dockyard-fill)}
.dockyard-dsh-head-caption{min-width:0;flex:0 1 auto;padding:0 6px;overflow:hidden;color:var(--dockyard-ink-3);font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-popup-scroll{display:flex;flex-direction:column;gap:14px;min-width:0;min-height:0;padding:12px 9px 14px 14px;overflow:hidden auto;overscroll-behavior:contain;scrollbar-gutter:stable}

/* Controls: the host's small button, input and segmented-control geometry. */
.dockyard-dsh-icon{display:block;width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.dockyard-dsh-icon[data-spin=true],.dockyard-dsh-spinner{animation:dockyard-dsh-spin 900ms linear infinite}
@keyframes dockyard-dsh-spin{to{transform:rotate(360deg)}}
.dockyard-dsh-spinner{box-sizing:border-box;width:14px;height:14px;flex:none;border:1.5px solid var(--dockyard-track);border-top-color:currentColor;border-radius:50%;corner-shape:round}
.dockyard-dsh-icon-button{display:inline-grid;place-items:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:var(--dockyard-radius-sm);background:transparent;color:var(--dockyard-ink-2);cursor:pointer}
.dockyard-dsh-icon-button:hover:not(:disabled){background:var(--dockyard-fill);color:var(--dockyard-ink)}
.dockyard-dsh-button{display:inline-flex;align-items:center;justify-content:center;gap:5px;box-sizing:border-box;flex:none;height:28px;padding:0 10px;border:.5px solid var(--dockyard-line-strong);border-radius:var(--dockyard-radius-sm);background:transparent;color:var(--dockyard-ink);cursor:pointer;font:400 12px/18px var(--dockyard-font);text-decoration:none;white-space:nowrap}
.dockyard-dsh-button:hover:not(:disabled){background:var(--dockyard-fill)}
.dockyard-dsh-button:active:not(:disabled),.dockyard-dsh-icon-button:active:not(:disabled){background:var(--dockyard-fill-active)}
.dockyard-dsh-button:disabled,.dockyard-dsh-icon-button:disabled{cursor:not-allowed;opacity:.4}
.dockyard-dsh-button[data-variant=primary]{border-color:transparent;background:var(--dsw-alias-button-primary-fill,var(--dockyard-ink));color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-label-primary-inverted,#fff))}
.dockyard-dsh-button[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dockyard-ink-2))}
.dockyard-dsh-button[data-variant=ghost]{border-color:transparent;color:var(--dockyard-ink-2)}
.dockyard-dsh-button[data-variant=ghost]:hover:not(:disabled){color:var(--dockyard-ink)}
.dockyard-dsh-button[data-variant=danger]{border-color:transparent;color:var(--dockyard-ink-3)}
.dockyard-dsh-button[data-variant=danger]:is(:hover,:focus-visible):not(:disabled){background:var(--dockyard-danger-fill);color:var(--dockyard-danger-ink)}
.dockyard-dsh-button[data-variant=danger-solid]{border-color:transparent;background:var(--dockyard-danger);color:#fff}
.dockyard-dsh-button[data-variant=danger-solid]:hover:not(:disabled){background:color-mix(in srgb,var(--dockyard-danger) 88%,#000)}
.dockyard-dsh-select,.dockyard-dsh-input{box-sizing:border-box;min-width:0;height:32px;margin:0;border:.5px solid var(--dockyard-line-strong);border-radius:var(--dockyard-radius-md);background-color:var(--dockyard-control);color:var(--dockyard-ink);font:400 13px/20px var(--dockyard-font)}
.dockyard-dsh-select{appearance:none;padding:0 28px 0 10px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-position:right 9px center;background-repeat:no-repeat;background-size:12px;cursor:pointer;text-overflow:ellipsis}
.dockyard-dsh-input{padding:0 10px}
.dockyard-dsh-input::placeholder{color:var(--dockyard-ink-3)}
.dockyard-dsh-select:disabled,.dockyard-dsh-input:disabled{cursor:not-allowed;opacity:.5}
.dockyard-dsh-anchor :is(button,select,a,summary):focus-visible,.dockyard-dsh-settings-section :is(button,select,a,summary):focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dockyard-accent));outline-offset:1px}
.dockyard-dsh-input:focus-visible{outline:none;border-color:var(--dockyard-accent)}
.dockyard-dsh-segments{display:flex;flex-wrap:wrap;gap:2px;min-width:0;padding:3px;border-radius:var(--dockyard-radius-md);background:var(--dockyard-fill)}
.dockyard-dsh-segment{flex:1 0 auto;height:26px;padding:0 10px;border:0;border-radius:var(--dockyard-radius-sm);background:transparent;color:var(--dockyard-ink-2);cursor:pointer;font:400 12px/18px var(--dockyard-font);white-space:nowrap}
.dockyard-dsh-segment:hover:not(:disabled){color:var(--dockyard-ink)}
.dockyard-dsh-segment[aria-pressed=true]{background:var(--dockyard-control);color:var(--dockyard-ink);font-weight:500;--dsw-elevation-stroke-color:var(--dockyard-line);box-shadow:var(--dsw-elevation-soft,0 0 0 .5px var(--dockyard-line),0 1px 3px #0000000f)}
.dockyard-dsh-segment:disabled{cursor:not-allowed;opacity:.5}

/* Sections and label/control rows. */
.dockyard-dsh-section{display:flex;flex-direction:column;gap:8px;min-width:0}
.dockyard-dsh-section-head{display:flex;align-items:center;gap:8px;min-height:28px}
.dockyard-dsh-section-title{min-width:0;flex:1;color:var(--dockyard-ink-2);font-size:12px;font-weight:500;line-height:18px}
.dockyard-dsh-count{margin-left:6px;color:var(--dockyard-ink-3);font-weight:400;font-variant-numeric:tabular-nums}
.dockyard-dsh-fields{display:grid;grid-template-columns:minmax(48px,max-content) minmax(0,1fr);align-items:center;gap:8px 12px;min-width:0}
.dockyard-dsh-field-label{color:var(--dockyard-ink-2);font-size:12px;line-height:18px}
.dockyard-dsh-field-label small{display:block;color:var(--dockyard-ink-3);font-size:11px;line-height:16px}
.dockyard-dsh-field-control{display:flex;align-items:center;gap:6px;min-width:0}
.dockyard-dsh-field-control>:is(.dockyard-dsh-select,.dockyard-dsh-input,.dockyard-dsh-segments){flex:1 1 0}
.dockyard-dsh-fields>.dockyard-dsh-note,.dockyard-dsh-fields>.dockyard-dsh-problem{grid-column:1/-1}
.dockyard-dsh-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.dockyard-dsh-note{min-width:0;color:var(--dockyard-ink-3);font-size:12px;line-height:18px;overflow-wrap:anywhere}
.dockyard-dsh-note a{color:var(--dockyard-accent-ink)}
.dockyard-dsh-facts{display:flex;flex-wrap:wrap;gap:0 14px}
.dockyard-dsh-empty{padding:10px 12px;border-radius:var(--dockyard-radius-md);background:var(--dockyard-fill);color:var(--dockyard-ink-2);font-size:12px;line-height:18px}

/* Feedback: errors stay in the flow; progress and results float as a toast. */
.dockyard-dsh-problem{display:flex;align-items:center;gap:8px;min-width:0;padding:6px 8px;border-radius:var(--dockyard-radius-sm);background:var(--dockyard-danger-fill);color:var(--dockyard-danger-ink);font-size:12px;line-height:18px}
.dockyard-dsh-problem[data-tone=warning]{background:color-mix(in srgb,var(--dockyard-warn) 12%,transparent);color:var(--dockyard-warn-ink)}
.dockyard-dsh-problem>span{min-width:0;flex:1;overflow-wrap:anywhere}
.dockyard-dsh-problem .dockyard-dsh-button{border-color:currentColor;color:inherit}
.dockyard-dsh-banner{flex:none;margin:10px 14px 0;border-radius:var(--dockyard-radius-md)}
.dockyard-dsh-toast{position:absolute;left:50%;bottom:12px;z-index:2;display:flex;align-items:center;gap:8px;box-sizing:border-box;width:max-content;max-width:calc(100% - 28px);padding:8px 12px;border-radius:var(--dockyard-radius-md);background:var(--dsw-alias-toast-bg,#353638);color:var(--dsw-alias-toast-label,#fff);font-size:12px;line-height:18px;box-shadow:var(--dsw-shadow-lv3,0 12px 32px #00000024);pointer-events:none;transform:translateX(-50%);animation:dockyard-dsh-toast-in 160ms ease-out}
.dockyard-dsh-toast[data-done=true]{animation:dockyard-dsh-toast-in 160ms ease-out,dockyard-dsh-toast-out 600ms ease 4s forwards}
@keyframes dockyard-dsh-toast-in{from{opacity:0;transform:translate(-50%,6px)}}
@keyframes dockyard-dsh-toast-out{to{opacity:0;visibility:hidden}}

/* Accounts, keys and local candidates share one hairline list. */
.dockyard-dsh-list{display:flex;flex-direction:column;min-width:0;border:.5px solid var(--dockyard-line);border-radius:var(--dockyard-radius-md)}
.dockyard-dsh-list>*+*{border-top:.5px solid var(--dockyard-line)}
.dockyard-dsh-account{display:flex;flex-direction:column;gap:8px;min-width:0;padding:10px 12px}
.dockyard-dsh-account-head{display:flex;align-items:center;gap:8px;min-width:0;min-height:28px}
.dockyard-dsh-account-identity{display:flex;flex-direction:column;min-width:0;flex:1}
.dockyard-dsh-account-name{overflow:hidden;font-weight:500;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-account-id{overflow:hidden;color:var(--dockyard-ink-3);font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-account-id>span+span{margin-left:10px}
.dockyard-dsh-account-actions{display:flex;align-items:center;gap:4px;flex:none}
.dockyard-dsh-dot{flex:none;width:6px;height:6px;border-radius:50%;corner-shape:round;background:var(--dockyard-idle)}
.dockyard-dsh-dot[data-state=ok]{background:var(--dockyard-ok)}
.dockyard-dsh-dot[data-state=warn]{background:var(--dockyard-warn)}
.dockyard-dsh-dot[data-state=error]{background:var(--dockyard-danger)}
.dockyard-dsh-tag{display:inline-flex;align-items:center;flex:none;padding:1px 8px;border-radius:999px;corner-shape:round;background:var(--dsw-alias-bg-module-platform,var(--dockyard-fill));color:var(--dockyard-ink-2);font-size:11px;font-weight:500;line-height:17px;white-space:nowrap}
.dockyard-dsh-tag[data-tone=info]{background:color-mix(in srgb,var(--dockyard-accent) 10%,transparent);color:var(--dockyard-accent-ink)}
.dockyard-dsh-tag[data-plan]{text-transform:capitalize}

/* Quota: the remaining share and its reset are the loudest things in a row. */
.dockyard-dsh-quota{display:flex;flex-direction:column;gap:8px;min-width:0}
.dockyard-dsh-quota-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:baseline;gap:3px 10px}
.dockyard-dsh-quota-label{grid-column:1;min-width:0;overflow:hidden;color:var(--dockyard-ink-2);font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-quota-reset{grid-column:2;color:var(--dockyard-ink-3);font-size:12px;line-height:18px;white-space:nowrap}
.dockyard-dsh-quota-value{grid-column:3;min-width:34px;font-size:12px;font-weight:600;line-height:18px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.dockyard-dsh-quota-row>.dockyard-dsh-meter{grid-column:1/-1}
.dockyard-dsh-meter{display:block;height:4px;overflow:hidden;border-radius:999px;corner-shape:round;background:var(--dockyard-track)}
.dockyard-dsh-meter-fill{display:block;height:100%;border-radius:inherit;corner-shape:round;background:var(--dockyard-accent);transition:width 220ms var(--dockyard-ease)}
.dockyard-dsh-meter[data-level=warning] .dockyard-dsh-meter-fill{background:var(--dockyard-warn)}
.dockyard-dsh-meter[data-level=critical] .dockyard-dsh-meter-fill{background:var(--dockyard-danger)}
.dockyard-dsh-meter[data-loading=true]{opacity:.5}

/* Provider overview: menu rows, like the host's own menus. */
.dockyard-dsh-provider-list{display:flex;flex-direction:column;gap:1px;margin:0 -6px}
.dockyard-dsh-provider-row{display:flex;align-items:center;gap:8px;box-sizing:border-box;width:100%;min-height:38px;padding:6px 6px 6px 8px;border:0;border-radius:var(--dockyard-radius-md);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}
.dockyard-dsh-provider-row:hover:not(:disabled),.dockyard-dsh-provider-row[data-current=true]{background:var(--dockyard-fill)}
.dockyard-dsh-provider-row:disabled{cursor:not-allowed;opacity:.5}
.dockyard-dsh-provider-row-name{flex:none;max-width:50%;overflow:hidden;font-weight:500;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-provider-row-meta{min-width:0;flex:1;overflow:hidden;color:var(--dockyard-ink-2);font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-provider-row-status{flex:none;color:var(--dockyard-ink-2);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.dockyard-dsh-provider-row-status[data-state=error]{color:var(--dockyard-danger-ink)}
.dockyard-dsh-provider-row-status[data-state=idle]{color:var(--dockyard-ink-3)}
.dockyard-dsh-provider-row .dockyard-dsh-meter{flex:none;width:36px}
.dockyard-dsh-provider-row>.dockyard-dsh-icon{color:var(--dockyard-ink-3)}

/* Sign-in guide and folded settings. */
.dockyard-dsh-login-guide{display:flex;flex-direction:column;gap:8px;min-width:0;padding:12px;border:.5px solid var(--dockyard-line);border-radius:var(--dockyard-radius-md)}
.dockyard-dsh-login-guide-title{display:flex;align-items:center;gap:8px;font-weight:500}
.dockyard-dsh-login-guide-steps{display:flex;flex-direction:column;gap:2px;margin:0;padding-left:18px;color:var(--dockyard-ink-2);font-size:12px;line-height:18px}
.dockyard-dsh-login-guide-code{display:flex;gap:6px;min-width:0}
.dockyard-dsh-login-guide-code .dockyard-dsh-input{flex:1}
.dockyard-dsh-disclosure{min-width:0;border-top:.5px solid var(--dockyard-line)}
.dockyard-dsh-disclosure>summary{display:flex;align-items:center;gap:8px;min-height:36px;margin:0 -6px;padding:0 6px;border-radius:var(--dockyard-radius-sm);color:var(--dockyard-ink-2);cursor:pointer;font-size:12px;font-weight:500;line-height:18px;list-style:none}
.dockyard-dsh-disclosure>summary::-webkit-details-marker{display:none}
.dockyard-dsh-disclosure>summary:hover{color:var(--dockyard-ink)}
.dockyard-dsh-disclosure>summary>span:first-child{min-width:0;flex:1}
.dockyard-dsh-disclosure-value{min-width:0;overflow:hidden;color:var(--dockyard-ink-3);font-weight:400;text-overflow:ellipsis;white-space:nowrap}
.dockyard-dsh-disclosure-body{display:flex;flex-direction:column;gap:10px;padding:2px 0 4px}
.dockyard-dsh-key-form{display:flex;flex-direction:column;gap:8px;min-width:0}

/* The same views rendered inline in the host's settings page. */
.dockyard-dsh-settings-section{box-sizing:border-box;width:100%;min-width:0}
.dockyard-dsh-settings-section>.dockyard-dsh-popup{position:relative;inset:auto;width:100%;max-width:none;max-height:none;overflow:visible;border-radius:0;background:none;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none;animation:none}
.dockyard-dsh-settings-section .dockyard-dsh-head{padding-inline:0}
.dockyard-dsh-settings-section .dockyard-dsh-popup-scroll{padding-inline:0;overflow:visible}
.dockyard-dsh-settings-section .dockyard-dsh-banner{margin-inline:0}
.dockyard-dsh-settings-section .dockyard-dsh-toast{position:static;width:auto;max-width:none;margin-top:10px;transform:none;animation:none}

@media (max-width:420px){.dockyard-dsh-trigger{max-width:190px}.dockyard-dsh-account-head{flex-wrap:wrap}.dockyard-dsh-account-identity{flex-basis:calc(100% - 60px)}.dockyard-dsh-fields{grid-template-columns:minmax(0,1fr)}.dockyard-dsh-field-control{flex-wrap:wrap}}
@media (prefers-reduced-motion:reduce){.dockyard-dsh-popup,.dockyard-dsh-icon[data-spin=true],.dockyard-dsh-spinner{animation:none}.dockyard-dsh-toast{animation:none}.dockyard-dsh-toast[data-done=true]{animation:dockyard-dsh-toast-out 600ms ease 4s forwards}.dockyard-dsh-chevron,.dockyard-dsh-meter-fill{transition:none}}
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

function connectedAccountSignature(snapshot) {
  if (!Array.isArray(snapshot?.providers)) return "";
  return snapshot.providers.map((provider) => [
    provider.providerId,
    provider.policy,
    provider.defaultAccountId,
    ...(Array.isArray(provider.accounts) ? provider.accounts.map((account) => account?.accountId).filter(Boolean).sort() : []),
  ].join(":")).join("|");
}

// DSH's locale service decides the UI language; the browser's own may differ.
function localeTag(t) {
  const tag = text(t, "intl.locale");
  return tag === "intl.locale" ? undefined : tag;
}

function formatDate(value, t) {
  if (!value) return text(t, "value.notReturned");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(localeTag(t));
}

function formatNumber(value, t) {
  if (value === null || value === undefined) return text(t, "value.unknown");
  return typeof value === "number" ? new Intl.NumberFormat(localeTag(t)).format(value) : String(value);
}

/** "2 小时" / "3 min": a span rounded to the unit a person would say. */
function durationLabel(milliseconds, t) {
  const minutes = Math.max(1, Math.round(Math.abs(milliseconds) / 60_000));
  if (minutes < 60) return text(t, "time.minutes", { count: minutes });
  if (minutes < 48 * 60) return text(t, "time.hours", { count: Math.round(minutes / 60) });
  return text(t, "time.days", { count: Math.round(minutes / (24 * 60)) });
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

function quotaPercent(window) {
  if (typeof window?.remaining !== "number" || typeof window?.limit !== "number" || window.limit <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((window.remaining / window.limit) * 100)));
}

function quotaResetLabel(window, t, now = Date.now()) {
  const time = window?.resetAt ? new Date(window.resetAt).getTime() : Number.NaN;
  if (Number.isNaN(time)) return null;
  // A reset time in the past means the numbers predate the reset.
  if (time <= now) return text(t, "quota.resetDue");
  if (time - now < 60_000) return text(t, "quota.resetSoon");
  return text(t, "quota.resetsIn", { time: durationLabel(time - now, t) });
}

function quotaUpdatedLabel(value, t, now = Date.now()) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  if (Number.isNaN(time)) return null;
  return now - time < 60_000 ? text(t, "quota.updatedNow") : text(t, "quota.updatedAgo", { time: durationLabel(now - time, t) });
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
    return new Intl.NumberFormat(localeTag(t), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return null;
  }
}

function providerAccount(provider) {
  if (provider?.defaultAccountId) {
    return provider.accounts?.find((account) => account.accountId === provider.defaultAccountId) ?? null;
  }
  return provider?.accounts?.length === 1 ? provider.accounts[0] : null;
}

function accountName(account, t) {
  return account?.email ?? account?.displayName ?? account?.accountId ?? text(t, "value.unknown");
}

// How the identity was established. A bare account id is left to the name's
// tooltip: under an e-mail address it only repeats what is already identified.
function accountIdentityLine(account, t) {
  const identitySource = account?.resources?.identitySource;
  if (account?.email && account?.resources?.authSource === "official_cursor_browser_oauth") return text(t, "identity.cursorBrowser");
  if (["official_cli_auth_status", "official_client_auth_status"].includes(identitySource)) return text(t, "identity.officialLogin");
  if (account?.resources?.sessionFingerprint) return text(t, "identity.sessionFingerprint", { fingerprint: account.resources.sessionFingerprint });
  return null;
}

function healthLabel(status, t) {
  return status === "healthy" ? text(t, "health.healthy")
    : status === "degraded" ? text(t, "health.degraded")
      : status === "cooldown" ? text(t, "health.cooldown")
        : status === "expired" ? text(t, "health.expired")
          : status === "exhausted" ? text(t, "health.exhausted")
            : status ?? text(t, "health.unknown");
}

function healthState(status) {
  return status === "healthy" ? "ok"
    : ["degraded", "cooldown"].includes(status) ? "warn"
      : ["expired", "exhausted"].includes(status) ? "error" : "idle";
}

/** One-line status of a subscription provider for the overview list. */
function providerOverview(provider, t) {
  const accounts = provider?.accounts ?? [];
  if (accounts.length === 0) return { state: "idle", label: text(t, "summary.notConnected") };
  const selected = providerAccount(provider);
  if (!selected) {
    // A pooled provider has no single current account: it is in trouble only
    // when no account can serve, and worth a look when some cannot.
    const states = accounts.map((account) => healthState(account?.health?.status));
    const state = states.every((entry) => entry === "error") ? "error"
      : states.some((entry) => entry === "error" || entry === "warn") ? "warn" : "ok";
    return { state, label: text(t, "summary.accountCount", { count: accounts.length }) };
  }
  const state = healthState(selected.health?.status);
  if (state === "error" || state === "warn") return { state, label: healthLabel(selected.health.status, t) };
  const indicator = selectQuotaIndicator(quotaWindowRows(selected.quota, t));
  if (indicator?.type === "quota") return { state, label: `${indicator.percent}%`, percent: indicator.percent };
  return { state, label: (indicator?.type === "balance" ? formatBalance(indicator.window, t) : null) ?? text(t, "summary.connected") };
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
    let pollFailed = false;
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
        // A poll that is still waiting carries no news: it must not wipe the
        // outcome of what the user did meanwhile (a rejected authorization
        // code, a failed refresh). It only clears an error this loop raised.
        const waiting = ["pending", "processing"].includes(value?.result?.status) && !pollFailed;
        pollFailed = false;
        // Keep the Host's terminal result even when a foreground operation
        // owns the status message.
        const result = this.applyValue(latest.snapshot !== before.snapshot
          ? { ...value, snapshot: latest.snapshot } : value, providerId,
        { preserveControl: Boolean(latest.action) || waiting });
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
        pollFailed = true;
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

// 16px line icons, drawn with the host's 1.5px rounded stroke.
const ICONS = Object.freeze({
  close: "M4 4l8 8M12 4l-8 8",
  back: "M10 3.5 5.5 8l4.5 4.5",
  forward: "M6 3.5 10.5 8 6 12.5",
  refresh: "M12.2 5.2A5 5 0 1 0 13 8M12.6 2.5v2.9H9.7",
  add: "M8 3.5v9M3.5 8h9",
});

function Icon({ name, spin = false }) {
  return h("svg", {
    className: "dockyard-dsh-icon", viewBox: "0 0 16 16", focusable: "false",
    "aria-hidden": true, "data-spin": spin || undefined,
  }, h("path", { d: ICONS[name] }));
}

function IconButton({ icon, label, spin = false, ...props }) {
  return h("button", {
    type: "button", className: "dockyard-dsh-icon-button", "aria-label": label, title: label, ...props,
  }, h(Icon, { name: icon, spin }));
}

function button(variant, props, ...children) {
  return h("button", {
    type: "button", className: "dockyard-dsh-button", "data-variant": variant ?? undefined, ...props,
  }, ...children);
}

function problem(message, tone = undefined) {
  return h("div", { className: "dockyard-dsh-problem", role: "alert", "data-tone": tone }, h("span", null, message));
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

/** Remaining share of a quota. `label` names it; without one it is decorative. */
function Meter({ percent, level = quotaLevel(percent), label = null, loading = false }) {
  return h("span", {
    className: "dockyard-dsh-meter", "data-level": level, "data-loading": loading || undefined,
    ...(label ? {
      role: "meter", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": percent,
    } : { "aria-hidden": true }),
  }, h("span", { className: "dockyard-dsh-meter-fill", style: { width: `${percent}%` } }));
}

/** Native <details>; the body stays unmounted while folded, so it issues no requests. */
function Disclosure({ title, value = null, open, onToggle, children }) {
  return h("details", {
    className: "dockyard-dsh-disclosure", open, onToggle: (event) => onToggle(event.currentTarget.open),
  },
    h("summary", null,
      h("span", null, title),
      value ? h("span", { className: "dockyard-dsh-disclosure-value" }, value) : null,
      h(ChevronIcon, { open })),
    open ? h("div", { className: "dockyard-dsh-disclosure-body" }, children) : null);
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
  const pending = mode === "custom" ? normalizeDraftContextWindow(draft) : null;
  const invalid = mode === "custom" && draft.trim() !== "" && pending === null;
  // Offer Save only for a change that can be stored.
  const dirty = mode === "custom" ? pending !== null && pending !== state.override : state.override !== null;
  const tokens = (value) => (value === null ? text(t, "contextWindow.noDetected") : `${formatNumber(value, t)} tokens`);
  const save = async () => {
    if (!dirty || busy) return;
    if (typeof remote?.setContextWindowOverride !== "function") {
      setMessage({ error: true, text: text(t, "error.remoteNotMounted", { method: "setContextWindowOverride" }) });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const saved = unwrapRemote(await remote.setContextWindowOverride({ ...scope, value: pending }), t);
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

  // Rows of the caller's label/control grid, so they line up with its other fields.
  return h(React.Fragment, null,
    h("span", { className: "dockyard-dsh-field-label" },
      text(t, "contextWindow.title"),
      h("small", null, contextWindowScopeLabel(scope, t))),
    h("div", { className: "dockyard-dsh-field-control" },
      h("select", {
        className: "dockyard-dsh-select",
        "aria-label": text(t, "contextWindow.title"),
        value: mode,
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
        className: "dockyard-dsh-input",
        type: "number",
        min: "1",
        step: "1",
        value: draft,
        placeholder: text(t, "contextWindow.placeholder"),
        "aria-label": text(t, "contextWindow.placeholder"),
        "aria-invalid": invalid || undefined,
        disabled: busy,
        onChange: (event) => setDraft(event.target.value),
        onKeyDown: (event) => { if (event.key === "Enter") void save(); },
      }) : null,
      dirty || busy ? button("primary", { disabled: busy, onClick: save }, text(t, busy ? "contextWindow.saving" : "contextWindow.save")) : null),
    h("div", { className: "dockyard-dsh-note dockyard-dsh-facts" },
      h("span", null, text(t, "contextWindow.effective", { value: tokens(effective) })),
      h("span", null, text(t, "contextWindow.detected", { value: tokens(detected) }))),
    invalid ? h("div", { className: "dockyard-dsh-note", role: "alert" }, text(t, "contextWindow.invalid"))
      : mode === "custom" ? h("div", { className: "dockyard-dsh-note" }, text(t, "contextWindow.warning")) : null,
    message?.error ? problem(message.text)
      : message ? h("div", { className: "dockyard-dsh-note", role: "status" }, message.text) : null);
}

function QuotaList({ quota, fallback = null, t }) {
  const rows = quotaWindowRows(quota, t);
  if (rows.length === 0) return fallback;
  // One freshness line for the account, not one per window.
  const updatedAt = quota?.updatedAt ?? rows.map((window) => window.updatedAt).filter(Boolean).sort().at(-1);
  const updated = quotaUpdatedLabel(updatedAt, t);
  return h("div", { className: "dockyard-dsh-quota" },
    rows.map((window, index) => {
      const label = quotaWindowLabel(window, t);
      const money = window.kind === "balance" ? formatBalance(window, t) : null;
      const percent = window.kind === "balance" ? null : quotaPercent(window);
      const hasLimit = window.limit !== null && window.limit !== undefined;
      const value = money !== null
        ? `${money}${hasLimit ? ` / ${formatBalance(window, t, window.limit) ?? formatNumber(window.limit, t)}` : ""}`
        : percent !== null ? `${percent}%`
          : `${formatNumber(window.remaining, t)}${hasLimit ? ` / ${formatNumber(window.limit, t)}` : ""}${window.unit ? ` ${window.unit}` : ""}`;
      const reset = quotaResetLabel(window, t);
      return h("div", { className: "dockyard-dsh-quota-row", key: `${window.id ?? "quota"}-${index}` },
        h("span", { className: "dockyard-dsh-quota-label", title: window.id ?? undefined }, label),
        reset ? h("span", { className: "dockyard-dsh-quota-reset", title: formatDate(window.resetAt, t) }, reset) : null,
        h("span", { className: "dockyard-dsh-quota-value" }, value),
        percent === null ? null : h(Meter, { percent, label }));
    }),
    updated ? h("div", { className: "dockyard-dsh-note", title: formatDate(updatedAt, t) }, updated) : null);
}

function usageLink(url, t) {
  return url ? [" ", h("a", { key: "usage", href: url, target: "_blank", rel: "noreferrer noopener" }, text(t, "quota.openUsage"))] : null;
}

function AccountRow({ account, current, providerId, controller, busy, canAuthorize, t }) {
  const [confirming, setConfirming] = useState(false);
  const status = account?.health?.status;
  const state = healthState(status);
  const name = accountName(account, t);
  const identity = accountIdentityLine(account, t);
  const detail = account.health?.lastError;
  // Every row repeats the same actions; the accessible name says which account.
  const named = (key) => `${text(t, key)} ${name}`;
  return h("div", { className: "dockyard-dsh-account" },
    h("div", { className: "dockyard-dsh-account-head" },
      h("span", { className: "dockyard-dsh-dot", "data-state": state, role: "img", "aria-label": healthLabel(status, t), title: healthLabel(status, t) }),
      h("div", { className: "dockyard-dsh-account-identity" },
        h("div", { className: "dockyard-dsh-account-name", title: account.accountId }, name),
        identity ? h("div", { className: "dockyard-dsh-account-id" }, identity) : null),
      account.subscription?.plan ? h("span", { className: "dockyard-dsh-tag", "data-plan": "" }, account.subscription.plan) : null,
      // Confirm in place. Cancel takes the spot Remove had, so a double click cannot confirm.
      h("div", { className: "dockyard-dsh-account-actions" }, confirming ? [
        button("danger-solid", {
          key: "confirm", disabled: busy, "aria-label": named("account.confirmRemove"),
          onClick: () => { setConfirming(false); controller.removeAccount(providerId, account.accountId); },
        }, text(t, "account.confirmRemove")),
        button(null, { key: "cancel", autoFocus: true, onClick: () => setConfirming(false) }, text(t, "ui.cancel")),
      ] : [
        current
          ? h("span", { key: "current", className: "dockyard-dsh-tag", "data-tone": "info" }, text(t, "account.current"))
          // An account that must sign in again cannot serve; it offers Reauthorize below instead.
          : status === "expired" ? null : button("ghost", {
            key: "use", disabled: busy, title: text(t, "account.useHint"), "aria-label": named("account.use"),
            onClick: () => controller.selectAccount(providerId, account.accountId),
          }, text(t, "account.use")),
        button("danger", {
          key: "remove", disabled: busy, "aria-label": named("account.remove"), onClick: () => setConfirming(true),
        }, text(t, "account.remove")),
      ])),
    confirming ? h("div", { className: "dockyard-dsh-note" }, text(t, "account.removeHint")) : null,
    state === "warn" || state === "error" || detail ? h("div", { className: "dockyard-dsh-problem", "data-tone": state === "error" ? undefined : "warning" },
      h("span", null, detail ? text(t, "account.problem", { status: healthLabel(status, t), detail }) : healthLabel(status, t)),
      status === "expired" && canAuthorize
        ? button(null, { disabled: busy, "aria-label": named("auth.reauthorize"), onClick: () => controller.login(providerId) }, text(t, "auth.reauthorize")) : null) : null,
    account.resources?.identityNote ? h("div", { className: "dockyard-dsh-note" }, account.resources.identityNote) : null,
    h(QuotaList, {
      quota: account.quota, t,
      // An account that must sign in again has no quota worth explaining.
      fallback: status === "expired" ? null : h("div", { className: "dockyard-dsh-note" },
        account.resources?.quotaDiagnostic ?? text(t, "quota.noWindow"), usageLink(account.resources?.quotaUrl, t)),
    }));
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
  const candidates = (provider?.candidates ?? []).filter((candidate) => (
    !candidate.imported && !accounts.some((account) => candidateMatchesAccount(candidate, account))
  ));
  if (candidates.length === 0) {
    return h("div", { className: "dockyard-dsh-note" },
      provider?.diagnostics?.length ? provider.diagnostics.join("；") : text(t, "candidate.noNew"));
  }
  return h("div", { className: "dockyard-dsh-list" }, candidates.map((candidate) => h("div", {
    className: "dockyard-dsh-account",
    key: candidate.candidateId,
  }, h("div", { className: "dockyard-dsh-account-head" },
    h("div", { className: "dockyard-dsh-account-identity" },
      h("div", { className: "dockyard-dsh-account-name" }, candidate.email ?? candidate.displayName ?? candidate.candidateId)),
    button(null, { disabled: busy, onClick: () => controller.add(providerId, candidate.candidateId) }, text(t, "candidate.add"))))));
}

function AuthorizationLoginGuide({ auth, providerId, providerName, controller, busy, canceling, t }) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const active = ["pending", "processing"].includes(auth?.status);
  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim() || busy || !auth?.sessionId) return;
    const result = await controller.submitAuthorizationCode(providerId, auth.sessionId, code);
    if (result) setCode("");
  };
  // A second account usually has to sign in from another browser profile.
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(auth.authorizationUrl);
      setCopied(true);
    } catch {
      // The link below can still be opened or copied by hand.
    }
  };
  if (!active) return h("div", { className: "dockyard-dsh-login-guide" },
    problem(auth.diagnostic ?? auth.instructions ?? text(t, "status.oauthEnded")),
    h("div", { className: "dockyard-dsh-toolbar" },
      button("primary", { disabled: busy, onClick: () => controller.login(providerId) }, text(t, "auth.restart"))));
  return h("div", { className: "dockyard-dsh-login-guide" },
    h("div", { className: "dockyard-dsh-login-guide-title" },
      h("span", { className: "dockyard-dsh-spinner", "aria-hidden": true }),
      text(t, auth.terminalOpened ? "auth.terminalTitle" : "auth.browserTitle", { provider: providerName })),
    h("div", { className: "dockyard-dsh-note" }, auth.browserOpenFailed ? text(t, "auth.popupBlocked") : auth.instructions ?? text(t, "auth.intro")),
    auth.terminalOpened ? null : h("ol", { className: "dockyard-dsh-login-guide-steps" },
      h("li", null, text(t, "auth.step1")),
      h("li", null, text(t, "auth.step2")),
      auth.authorizationCodeRequired ? h("li", null, text(t, "auth.step3")) : null),
    auth.authorizationCodeRequired ? h("form", { className: "dockyard-dsh-login-guide-code", onSubmit: submit },
      h("input", {
        className: "dockyard-dsh-input",
        value: code,
        disabled: busy,
        onChange: (event) => setCode(event.target.value),
        placeholder: text(t, "auth.callbackPlaceholder"),
        "aria-label": text(t, "auth.callbackAria"),
        autoComplete: "off",
        spellCheck: false,
      }),
      button("primary", { type: "submit", disabled: busy || !code.trim() }, text(t, "auth.submit"))) : null,
    auth.diagnostic ? problem(auth.diagnostic, "warning") : null,
    h("div", { className: "dockyard-dsh-toolbar" },
      auth.authorizationUrl ? h("a", {
        className: "dockyard-dsh-button", "data-variant": auth.browserOpenFailed ? "primary" : undefined,
        href: auth.authorizationUrl, target: "_blank", rel: "noopener noreferrer",
      }, text(t, "auth.reopen")) : null,
      auth.authorizationUrl && globalThis.navigator?.clipboard?.writeText
        ? button(null, { onClick: copyLink }, text(t, copied ? "auth.linkCopied" : "auth.copyLink")) : null,
      auth.sessionId ? button("danger", {
        disabled: busy,
        onClick: () => controller.cancelAuthorization(providerId, auth.sessionId),
      }, text(t, canceling ? "status.canceling" : "auth.cancel")) : null));
}

function nativeQuotaView(native, t) {
  const usage = native?.usage ?? native?.entry?.usage ?? null;
  const note = (...children) => h("div", { className: "dockyard-dsh-note" }, ...children);
  if (usage?.status === "unsupported") return note(text(t, "native.quotaUnsupported"), usageLink(usage.helpUrl, t));
  if (usage?.status === "error") return problem(text(t, "quota.readFailed", { error: usage.message ?? text(t, "error.unknown") }), "warning");
  if (usage?.status === "unconfigured") return note(usage.message ?? text(t, "quota.keyUnconfigured"));
  return h(QuotaList, { quota: native?.quota ?? native?.entry?.quota ?? null, t, fallback: note(text(t, "quota.currentNoWindow")) });
}

function NativeKeyRow({ entry, providerId, controller, busy, t }) {
  const [confirming, setConfirming] = useState(false);
  const configured = entry?.configured === true;
  const current = entry?.active === true;
  const writable = entry?.credential?.writable !== false;
  const label = entry?.label ?? entry?.ref ?? text(t, "title.key");
  const stateLabel = text(t, configured ? "native.configured" : "native.unconfigured");
  const named = (key) => `${text(t, key)} ${label}`;
  const facts = [
    configured ? null : stateLabel,
    entry?.implicit ? text(t, "native.fromProviderConfig") : null,
    entry?.credential?.source ? text(t, "native.source", { source: entry.credential.source }) : null,
  ].filter(Boolean);
  return h("div", { className: "dockyard-dsh-account" },
    h("div", { className: "dockyard-dsh-account-head" },
      h("span", { className: "dockyard-dsh-dot", "data-state": configured ? "ok" : "warn", role: "img", "aria-label": stateLabel, title: stateLabel }),
      h("div", { className: "dockyard-dsh-account-identity" },
        h("div", { className: "dockyard-dsh-account-name", title: entry?.ref }, label),
        facts.length ? h("div", { className: "dockyard-dsh-account-id" }, facts.map((fact) => h("span", { key: fact }, fact))) : null),
      h("div", { className: "dockyard-dsh-account-actions" }, confirming ? [
        button("danger-solid", {
          key: "confirm", disabled: busy, "aria-label": named(writable ? "native.confirmRemove" : "native.confirmUnlink"),
          onClick: () => { setConfirming(false); controller.removeKey(providerId, entry.ref); },
        }, text(t, writable ? "native.confirmRemove" : "native.confirmUnlink")),
        button(null, { key: "cancel", autoFocus: true, onClick: () => setConfirming(false) }, text(t, "ui.cancel")),
      ] : [
        current
          ? h("span", { key: "current", className: "dockyard-dsh-tag", "data-tone": "info" }, text(t, "native.currentKey"))
          : button("ghost", {
            key: "use", disabled: busy || !configured, "aria-label": named("native.use"),
            onClick: () => controller.selectKey(providerId, entry.ref),
          }, text(t, "native.use")),
        button("danger", {
          key: "remove", disabled: busy, "aria-label": named(writable ? "native.remove" : "native.unlinkReference"),
          onClick: () => setConfirming(true),
        }, text(t, writable ? "native.remove" : "native.unlinkReference")),
      ])),
    confirming ? h("div", { className: "dockyard-dsh-note" }, text(t, writable ? "native.removeTitle" : "native.unlinkTitle")) : null,
    entry?.usage && entry.usage.status !== "unsupported" ? nativeQuotaView(entry, t) : null);
}

function ModelEffortField({ current, model, efforts, directory, modelSelector, disabled = false, t }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (efforts.length === 0) return null;
  const tier = current?.reasoningEffort ?? model?.reasoning?.defaultEffort;
  const select = async (reasoningEffort) => {
    if (!current || !directory || busy || disabled || reasoningEffort === tier) return;
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
  return h(React.Fragment, null,
    h("span", { className: "dockyard-dsh-field-label" }, text(t, "ui.reasoningEffort")),
    h("div", { className: "dockyard-dsh-segments", role: "group", "aria-label": text(t, "ui.reasoningEffort") },
      efforts.map((effort) => h("button", {
        type: "button", className: "dockyard-dsh-segment", key: effort.id,
        "aria-pressed": tier === effort.id,
        disabled: busy || disabled, title: effort.description ?? effort.id, onClick: () => select(effort.id),
      }, effort.name ?? effort.id))),
    error ? problem(error) : null);
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
      value: providerId,
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
    className: state.error ? "dockyard-dsh-problem" : "dockyard-dsh-note",
  }, h("span", null, state.error ?? text(t, "ui.switching")),
  state.error && onRetry ? button(null, { onClick: onRetry }, text(t, "ui.retry")) : null);
}

function ModelSelectionSection({ providerId, directory, directoryState, remote, modelSelector, modelSelectionState, busy, t }) {
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
      // The scheduled refresh stays quiet; only a requested one reports back.
      setCatalogStatus({
        busy: false,
        message: force ? text(t, "ui.modelsUpdated", { count: entry?.count ?? 0 }) : null,
        error: entry?.diagnostic ?? null,
      });
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
  return h("div", { className: "dockyard-dsh-fields" },
    h("span", { className: "dockyard-dsh-field-label" }, text(t, "ui.model")),
    h("div", { className: "dockyard-dsh-field-control" },
      h("select", {
        className: "dockyard-dsh-select", "aria-label": text(t, "ui.sessionModel"), value: current?.model ?? "",
        disabled: busy || pending || providerSelectionPending || directoryState?.status === "selecting" || models.length === 0,
        onChange: (event) => { void select(event.target.value); },
      },
        !current ? h("option", { value: "", disabled: true }, text(t, models.length ? "ui.chooseModel" : selectionStatus?.error || directoryState?.status === "ready" ? "title.noModel" : "subscription.modelPending")) : null,
        current && !models.some((entry) => entry.id === current.model) ? h("option", { value: current.model }, current.model) : null,
        models.map((entry) => h("option", { key: entry.id, value: entry.id }, entry.name ?? entry.id))),
      liveCatalog ? h(IconButton, {
        icon: "refresh", spin: catalogStatus.busy,
        label: text(t, catalogStatus.busy ? "ui.refreshingModels" : "ui.refreshModels"),
        disabled: busy || catalogStatus.busy, onClick: () => { void refreshCatalog(true); },
      }) : null),
    h(ModelEffortField, { key: current?.model, current, model, efforts, directory, modelSelector, disabled: providerSelectionPending, t }),
    catalogStatus.error ? problem(catalogStatus.error)
      : catalogStatus.message ? h("div", { className: "dockyard-dsh-note", role: "status" }, catalogStatus.message) : null,
    h(ModelSelectionStatus, { state: selectionStatus, onRetry: modelSelector ? () => { void modelSelector.retry(); } : null, t }),
    error ? problem(error) : null);
}

/**
 * Errors stay in the flow until the next action. Progress and results float
 * as a toast over the popup, so a routine refresh never shifts the content.
 */
function OperationStatus({ state, providerId, t, children }) {
  if (providerId && state.providerId && state.providerId !== providerId) return null;
  if (state.error) {
    return h("div", { className: "dockyard-dsh-problem dockyard-dsh-banner", role: "alert" }, h("span", null, state.error), children);
  }
  // A refresh shows its progress on the button that started it.
  const progress = state.action && state.action !== "refresh" ? text(t, `ui.action.${state.action}`) : null;
  const message = progress ?? (state.action ? null : state.message);
  if (!message) return null;
  return h("div", {
    className: "dockyard-dsh-toast", role: "status", "aria-atomic": true, "data-done": !progress, key: message,
  },
    progress ? h("span", { className: "dockyard-dsh-spinner", "aria-hidden": true }) : null,
    h("span", null, message));
}

function PopupHeader({ onBack, onClose, caption = null, t, children }) {
  return h("div", { className: "dockyard-dsh-head" },
    onBack ? h(IconButton, { icon: "back", label: text(t, "ui.allProviders"), onClick: onBack }) : null,
    children,
    caption ? h("span", { className: "dockyard-dsh-head-caption" }, caption) : null,
    onClose ? h(IconButton, { icon: "close", label: text(t, "ui.close"), onClick: onClose }) : null);
}

function NativeKeyPopup({ providerId, native, providers, directory, directoryState, modelSelector, modelSelectionState, nativeController, remote, onSelectProvider, onBack, onClose, t }) {
  const [keyDraft, setKeyDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const { current, group, model } = modelDetails(directoryState, providerId);
  const busy = native.action !== null;
  const blocked = busy && native.action !== "refresh";
  const loadingConfig = ["idle", "loading"].includes(native.status) && !native.native;
  const canManage = native.native && Boolean(native.namespace);
  const keys = native.keys ?? [];
  const activeKeyRef = native.apiKeyRef ?? keys.find((entry) => entry.active)?.ref ?? null;
  const title = native.entry?.displayName ?? group?.name ?? providerId;
  const accountProvider = native.entry?.settingsNs === "llm-deepseek";
  const pooled = native.runtimeMode === "request-key-pool";
  let endpointHost = null;
  try { endpointHost = new URL(native.profile?.baseURL).host; } catch { /* Optional connection detail. */ }
  const addKey = async (event) => {
    event.preventDefault();
    if (!keyDraft.trim() || busy) return;
    const added = await nativeController.addKey(providerId, keyDraft, labelDraft);
    if (added) { setKeyDraft(""); setLabelDraft(""); setAdding(false); }
  };
  return h("div", {
    className: "dockyard-dsh-popup", role: "dialog", tabIndex: -1,
    "aria-label": text(t, "native.keyAria", { title }),
    onMouseDown: (event) => event.stopPropagation(),
  },
    h(PopupHeader, {
      onBack, onClose, t,
      caption: accountProvider ? text(t, "native.dshAccount") : endpointHost ?? text(t, "ui.apiProviderSubtitle"),
    }, h(ProviderNavigation, { providerId, providers, directoryState, onSelect: onSelectProvider, busy: blocked, t })),
    h(OperationStatus, { state: native, providerId, t }),
    h("div", { className: "dockyard-dsh-popup-scroll" },
      h(ModelSelectionSection, { key: providerId, providerId, directory, directoryState, modelSelector, modelSelectionState, remote, busy: blocked, t }),
      accountProvider ? h("div", { className: "dockyard-dsh-empty" }, text(t, "native.dshAccountHint")) : h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" }, "API Key", canManage ? h("span", { className: "dockyard-dsh-count" }, keys.length) : null),
          button("ghost", { disabled: busy, onClick: () => nativeController.refresh(providerId) },
            h(Icon, { name: "refresh", spin: native.action === "refresh" || native.quotaRefreshing === true }), text(t, "native.reload"))),
        loadingConfig
          ? h("div", { className: "dockyard-dsh-note", role: "status" }, text(t, "native.readingConfig"))
          : !canManage
            ? (!native.error ? h("div", { className: "dockyard-dsh-note" }, text(t, "native.configUnavailable")) : null)
            : keys.length === 0
              ? h("div", { className: "dockyard-dsh-empty" }, text(t, "native.noKeys"))
              : h("div", { className: "dockyard-dsh-list" }, keys.map((entry) => h(NativeKeyRow, { key: entry.ref, entry, providerId, controller: nativeController, busy, t }))),
        canManage && !busy && keys.length > 0 && !keys.some((entry) => entry.active && entry.usage && entry.usage.status !== "unsupported")
          ? nativeQuotaView(keys.find((entry) => entry.active && entry.usage) ?? native, t) : null),
      canManage ? h(Disclosure, { title: text(t, "native.addKeyTitle"), open: adding, onToggle: setAdding },
        h("form", { className: "dockyard-dsh-key-form", onSubmit: addKey },
          h("input", {
            className: "dockyard-dsh-input", type: "password", value: keyDraft,
            placeholder: text(t, "native.pasteApiKey"), "aria-label": text(t, "native.pasteApiKey"),
            autoCapitalize: "none", spellCheck: false, disabled: busy, autoComplete: "off",
            onChange: (event) => setKeyDraft(event.target.value),
          }),
          h("input", {
            className: "dockyard-dsh-input", type: "text", value: labelDraft,
            placeholder: text(t, "native.optionalName"), "aria-label": text(t, "native.optionalName"), disabled: busy,
            onChange: (event) => setLabelDraft(event.target.value),
          }),
          h("div", { className: "dockyard-dsh-toolbar" },
            button("primary", { type: "submit", disabled: busy || !keyDraft.trim() }, text(t, native.action === "add" ? "native.saving" : "native.save"))),
          h("div", { className: "dockyard-dsh-note" }, text(t, "native.keyStorage")))) : null,
      canManage ? h(Disclosure, {
        title: text(t, "ui.advanced"), value: text(t, `nativePolicy.${native.policy ?? "manual"}`), open: advanced, onToggle: setAdvanced,
      },
        h("div", { className: "dockyard-dsh-fields" },
          h("span", { className: "dockyard-dsh-field-label" }, text(t, "native.keyStrategy")),
          h("div", { className: "dockyard-dsh-field-control" },
            h("select", {
              className: "dockyard-dsh-select", "aria-label": text(t, "native.keyStrategy"), value: native.policy ?? "manual", disabled: busy,
              onChange: (event) => { void nativeController.setPolicy(providerId, event.target.value); },
            },
              h("option", { value: "manual" }, text(t, "nativePolicy.manual")),
              h("option", { value: "round_robin", disabled: !pooled }, text(t, "nativePolicy.round_robin")),
              h("option", { value: "failover", disabled: !pooled }, text(t, "nativePolicy.failover")))),
          pooled ? null : h("div", { className: "dockyard-dsh-note" }, text(t, "native.notice.manual")),
          h(ContextWindowSection, { key: `${providerId}:${current?.model}:${activeKeyRef}`, providerId, current, model, keyRef: activeKeyRef, remote, t }))) : null));
}

function SubscriptionOverviewPopup({ providers, directoryState, modelSelectionState, controlState, controller, selectedProviderId, onSelect, onClose, t }) {
  const busy = controlState.action !== null;
  const blocked = busy && controlState.action !== "refresh";
  const connected = providers.some((provider) => provider.accounts?.length);
  const custom = (directoryState?.groups ?? []).filter((group) => !providers.some((provider) => provider.providerId === group.id));
  const row = (id, name, meta, overview) => h("button", {
    type: "button", className: "dockyard-dsh-provider-row", key: id,
    "data-current": id === selectedProviderId, "aria-current": id === selectedProviderId || undefined,
    disabled: blocked, onClick: () => onSelect(id),
  },
    // The dot column stays reserved so both groups share one left edge.
    h("span", { className: "dockyard-dsh-dot", "data-state": overview?.state, style: overview ? undefined : { visibility: "hidden" } }),
    h("span", { className: "dockyard-dsh-provider-row-name" }, name),
    h("span", { className: "dockyard-dsh-provider-row-meta" }, meta),
    overview?.percent === undefined ? null : h(Meter, { percent: overview.percent }),
    overview ? h("span", { className: "dockyard-dsh-provider-row-status", "data-state": overview.state }, overview.label) : null,
    h(Icon, { name: "forward" }));
  return h("div", {
    className: "dockyard-dsh-popup",
    role: "dialog",
    tabIndex: -1,
    "aria-label": text(t, "subscription.aria"),
    onMouseDown: (event) => event.stopPropagation(),
  },
    h(PopupHeader, { onClose, t }, h("div", { className: "dockyard-dsh-title" }, text(t, "title.subscriptionManagement"))),
    h(OperationStatus, { state: controlState, t },
      controlState.snapshot ? null : button(null, { onClick: () => controller.ensureSnapshot().catch(() => {}) }, text(t, "ui.retry"))),
    // Until the snapshot arrives nothing is known: a failed load is the banner's
    // to explain, and model groups cannot yet be told apart from API providers.
    h("div", { className: "dockyard-dsh-popup-scroll" }, !controlState.snapshot
      ? (controlState.status === "loading" ? h("div", { className: "dockyard-dsh-note", role: "status" }, text(t, "status.reading")) : null)
      : h(React.Fragment, null,
      h(ModelSelectionStatus, { state: modelSelectionState, t }),
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" }, text(t, "ui.subscriptionProviders")),
          connected ? button("ghost", { disabled: busy, onClick: () => controller.refresh() },
            h(Icon, { name: "refresh", spin: controlState.action === "refresh" }), text(t, "subscription.refreshAll")) : null),
        providers.length > 0 && !connected ? h("div", { className: "dockyard-dsh-note" }, text(t, "subscription.connectHint")) : null,
        providers.length === 0
          ? h("div", { className: "dockyard-dsh-note" }, text(t, "subscription.none"))
          : h("div", { className: "dockyard-dsh-provider-list" }, providers.map((provider) => {
            const selected = providerAccount(provider);
            return row(
              provider.providerId,
              providerDisplayName(provider.providerId, provider.manifest, t),
              // Whose quota the row shows, or how a pool without a current account is shared.
              selected ? selected.email ?? selected.displayName ?? "" : provider.accounts?.length ? policyLabel(t, provider.policy) : "",
              providerOverview(provider, t),
            );
          }))),
      custom.length ? h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" }, text(t, "ui.apiProviders"))),
        h("div", { className: "dockyard-dsh-provider-list" }, custom.map((group) => row(
          group.id, group.name ?? group.id, text(t, "subscription.modelCount", { count: group.models?.length ?? 0 }), null,
        )))) : null)));
}

function SubscriptionSettingsSection({ controller, remote, t }) {
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

  // The settings page has its own close control; these views only navigate.
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
        onBack: () => setSelectedProviderId(null),
        t,
      })
      : h(SubscriptionOverviewPopup, {
        providers,
        directoryState: null,
        controlState,
        controller,
        selectedProviderId: null,
        onSelect: setSelectedProviderId,
        t,
      }));
}

function DockyardPopup({ providerId, provider, directory, directoryState, modelSelector, modelSelectionState, controlState, controller, remote, onSelectProvider, onBack, onClose, t }) {
  const [advanced, setAdvanced] = useState(false);
  const { current, group, model } = modelDetails(directoryState, providerId);
  const accounts = provider?.accounts ?? [];
  const activeId = provider?.defaultAccountId ?? null;
  const contextAccountId = activeId ?? (accounts.length === 1 ? accounts[0]?.accountId ?? null : null);
  const busy = controlState.action !== null;
  const here = controlState.providerId === providerId;
  const authInProgress = controlState.auth?.providerId === providerId
    && ["pending", "processing"].includes(controlState.auth?.status)
    && Boolean(controlState.auth?.sessionId);
  const supportsOAuthLogin = provider?.manifest?.capabilities?.includes("oauth_authorization");
  const providerName = providerDisplayName(providerId, provider?.manifest, t);
  const scan = controlState.scan?.providers?.some((entry) => entry.providerId === providerId) ? controlState.scan : null;
  const auth = controlState.auth?.providerId === providerId ? controlState.auth : null;
  // An ended sign-in explains itself in its guide; the banner would repeat it.
  const authError = auth && !authInProgress ? auth.diagnostic ?? auth.instructions ?? text(t, "status.oauthFailed") : null;
  return h("div", {
    className: "dockyard-dsh-popup", role: "dialog", tabIndex: -1,
    "aria-label": `${providerName} ${text(t, "trigger.accountQuota")}`,
    onMouseDown: (event) => event.stopPropagation(),
  },
    h(PopupHeader, { onBack, onClose, t },
      h(ProviderNavigation, { providerId, providers: controlState.snapshot?.providers, directoryState, onSelect: onSelectProvider, busy: busy && controlState.action !== "refresh", t })),
    h(OperationStatus, { state: authError && controlState.error === authError ? { ...controlState, error: null } : controlState, providerId, t }),
    h("div", { className: "dockyard-dsh-popup-scroll" },
      // Without an account there is no model to pick; the empty state below says what to do.
      accounts.length > 0 || group?.models?.length
        ? h(ModelSelectionSection, { key: connectedAccountSignature({ providers: [provider] }), providerId, directory, directoryState, modelSelector, modelSelectionState, remote, busy, t })
        : null,
      auth ? h(AuthorizationLoginGuide, {
        key: auth.sessionId, auth, providerId, providerName, controller, busy,
        canceling: controlState.action === "cancel", t,
      }) : null,
      h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" },
            text(t, "subscription.connectedAccounts"), h("span", { className: "dockyard-dsh-count" }, accounts.length)),
          accounts.length > 0 ? button("ghost", { disabled: busy, onClick: () => controller.refresh(providerId) },
            h(Icon, { name: "refresh", spin: controlState.action === "refresh" && here }), text(t, "native.refresh")) : null),
        accounts.length === 0
          ? h("div", { className: "dockyard-dsh-empty" }, text(t, supportsOAuthLogin ? "subscription.noAccountsOAuth" : "subscription.noAccountsScan"))
          : h("div", { className: "dockyard-dsh-list" }, accounts.map((account) => h(AccountRow, {
            key: account.accountId, account, current: account.accountId === activeId, providerId, controller, busy,
            canAuthorize: supportsOAuthLogin && !authInProgress, t,
          }))),
        h("div", { className: "dockyard-dsh-toolbar" },
          button("primary", { disabled: busy || authInProgress, onClick: () => controller.login(providerId) },
            h(Icon, { name: "add" }),
            authInProgress ? text(t, "status.verificationInProgress") : text(t, supportsOAuthLogin ? "auth.loginAdd" : "auth.officialInstructions")),
          button(null, { disabled: busy, onClick: () => controller.scan(providerId) },
            controlState.action === "scan" && here ? text(t, "status.scanning") : text(t, "auth.scanLocal")))),
      scan ? h("div", { className: "dockyard-dsh-section" },
        h("div", { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" }, text(t, "subscription.localCandidates"))),
        h(CandidateList, { scan, providerId, controller, busy, accounts, t })) : null,
      h(Disclosure, { title: text(t, "ui.advanced"), value: policyLabel(t, provider?.policy ?? "round_robin"), open: advanced, onToggle: setAdvanced },
        h("div", { className: "dockyard-dsh-fields" },
          h("span", { className: "dockyard-dsh-field-label" }, text(t, "subscription.accountStrategy")),
          h("div", { className: "dockyard-dsh-field-control" },
            h("select", {
              className: "dockyard-dsh-select", "aria-label": text(t, "subscription.accountStrategy"),
              value: provider?.policy ?? "round_robin", disabled: busy,
              onChange: (event) => controller.setPolicy(providerId, event.target.value),
            }, Object.keys(POLICY_KEYS).map((value) => h("option", { value, key: value }, policyLabel(t, value))))),
          h(ContextWindowSection, { key: `${providerId}:${current?.model}:${contextAccountId}`, providerId, current, model, accountId: contextAccountId, remote, t })))));
}

function DockyardAccountControl({ sessionId, directory, modelDirectory, loadModelCatalog, controller, nativeController, remote, t }) {
  const directoryState = useSnapshot(directory);
  // The error copy is read once: recreating the controller would cancel a pending selection.
  const modelSelector = useMemo(() => new ProviderModelSelectionController(modelDirectory, {
    loadCatalog: loadModelCatalog,
    noModels: text(t, "ui.noModels"),
    timedOut: text(t, "ui.selectTimedOut"),
    effortUnavailable: text(t, "ui.effortUnavailable"),
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
  const focusNavigationRef = useRef(false);
  const compactIndicatorCacheRef = useRef({ providerId: null, indicator: null });
  const accountSignatureRef = useRef(undefined);
  const modelSelectionSignatureRef = useRef(undefined);
  const { current, model } = modelDetails(directoryState);
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
    // Switching provider remounts the popup. Hand focus back to the switcher
    // so a keyboard user can keep stepping through providers.
    const navigation = focusNavigationRef.current ? popup?.querySelector(".dockyard-dsh-navigation select") : null;
    focusNavigationRef.current = false;
    (navigation ?? popup)?.focus({ preventScroll: true });
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
      const gap = 9;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupWidth = Math.min(POPUP_WIDTH, Math.max(0, viewportWidth - POPUP_MARGIN * 2));
      const left = Math.min(
        Math.max(POPUP_MARGIN, rect.left),
        Math.max(POPUP_MARGIN, viewportWidth - popupWidth - POPUP_MARGIN),
      );
      const availableAbove = Math.max(0, rect.top - gap - POPUP_MARGIN);
      const availableBelow = Math.max(0, viewportHeight - rect.bottom - POPUP_MARGIN);
      const openAbove = availableAbove >= 280 || availableAbove >= availableBelow;

      anchor.style.setProperty("--dockyard-dsh-popup-left", `${left}px`);
      if (openAbove) {
        anchor.style.setProperty("--dockyard-dsh-popup-top", "auto");
        anchor.style.setProperty("--dockyard-dsh-popup-bottom", `${Math.max(POPUP_MARGIN, viewportHeight - rect.top + gap)}px`);
        anchor.style.setProperty("--dockyard-dsh-popup-max-height", `${Math.min(POPUP_MAX_HEIGHT, availableAbove)}px`);
      } else {
        anchor.style.setProperty("--dockyard-dsh-popup-top", `${POPUP_MARGIN}px`);
        anchor.style.setProperty("--dockyard-dsh-popup-bottom", "auto");
        anchor.style.setProperty("--dockyard-dsh-popup-max-height", `${Math.max(0, viewportHeight - POPUP_MARGIN * 2)}px`);
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
  const compactLabel = compactIndicator?.type === "balance"
    ? formatBalance(compactIndicator.window, t)
    : compactIndicator?.type === "quota" ? `${compactIndicator.percent}%` : null;
  // The trigger turns red only for something the user has to act on.
  const attention = ["expired", "exhausted", "degraded"].includes(currentSelectedAccount?.health?.status)
    || (compactIndicator?.type === "balance" && compactIndicator.remaining <= 0);
  const compactLevel = attention ? "critical" : compactIndicator?.type === "quota" ? quotaLevel(compactIndicator.percent) : undefined;
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
    focusNavigationRef.current = !showOverview;
    setShowOverview(false);
    setDetailProviderId(selectedProviderId);
    // Opening a provider uses it for this conversation. One without an account
    // has no model to switch to, and the current one is already in use.
    const target = providerFromSnapshot(controlState.snapshot, selectedProviderId);
    if (selectedProviderId === currentProviderId || (target && !target.accounts?.length)) return;
    void modelSelector.selectProvider(selectedProviderId);
  };
  const close = () => setOpen(false);
  const showProviders = () => setShowOverview(true);
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
      attention && compactIndicator?.type !== "quota" ? h("span", { className: "dockyard-dsh-dot", "data-state": "error" }) : null,
      h("span", { className: "dockyard-dsh-label" }, providerLabel),
      compactIndicator?.type === "quota"
        ? h(Meter, { percent: compactIndicator.percent, level: compactLevel, label: text(t, "value.quota"), loading }) : null,
      compactLabel ? h("span", { className: "dockyard-dsh-trigger-value", "data-level": compactLevel }, compactLabel) : null,
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
      onBack: showProviders,
      onClose: close,
    }) : open && native ? h(NativeKeyPopup, {
      t,
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
      onBack: showProviders,
      onClose: close,
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
