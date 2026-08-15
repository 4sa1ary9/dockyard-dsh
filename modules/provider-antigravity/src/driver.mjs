import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { createCredentialRef } from "../../../packages/vault/src/index.mjs";
import {
  contentHasImageInCurrentTurn,
  unsupportedContentError,
} from "../../../packages/providers/src/cli-agent-transport.mjs";
import {
  finiteNumber,
  isoFromEpoch,
  recursiveQuotaWindows,
  redactError,
  selectPrimaryQuotaWindow,
  stringValue,
} from "../../../packages/providers/src/provider-utils.mjs";
import {
  createAntigravityNativeQuotaReader,
  readAntigravityTokenFile,
  resolveAntigravityAccessToken,
} from "./native-transport.mjs";

const PROVIDER_ID = "antigravity";
const DEFAULT_CLI = "agy";
const DEFAULT_CATALOG_TTL_MS = 60_000;
const DEFAULT_AUTH_TIMEOUT_MS = 10 * 60 * 1000;
const CREDENTIAL_SLOT = Symbol("dockyard-antigravity-session");

// agy checks for a real TTY before it starts its first-party OAuth bootstrap.
// This tiny hidden helper gives agy a PTY and keeps DSH's pipe on the outside;
// it does not open Terminal or expose a command window to the user.
const ANTIGRAVITY_PTY_SCRIPT = String.raw`
import os
import pty
import select
import signal
import sys

command = sys.argv[1]
command_args = sys.argv[1:]
child_pid, pty_fd = pty.fork()
if child_pid == 0:
    os.execvpe(command, command_args, os.environ)

def terminate(_signum, _frame):
    try:
        os.kill(child_pid, signal.SIGTERM)
    except OSError:
        pass
    os._exit(143)

signal.signal(signal.SIGTERM, terminate)
signal.signal(signal.SIGINT, terminate)
stdin_open = True
exit_code = 1
try:
    while True:
        inputs = [pty_fd]
        if stdin_open:
            inputs.append(0)
        ready, _, _ = select.select(inputs, [], [], 0.25)
        if pty_fd in ready:
            try:
                data = os.read(pty_fd, 8192)
            except OSError:
                data = b""
            if not data:
                break
            os.write(1, data)
        if stdin_open and 0 in ready:
            data = os.read(0, 8192)
            if data:
                os.write(pty_fd, data)
            else:
                stdin_open = False
        waited_pid, status = os.waitpid(child_pid, os.WNOHANG)
        if waited_pid:
            exit_code = os.waitstatus_to_exitcode(status)
            break
finally:
    try:
        os.close(pty_fd)
    except OSError:
        pass
    try:
        os.kill(child_pid, signal.SIGTERM)
    except OSError:
        pass
sys.exit(exit_code)
`;

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function normalizeEmail(value) {
  const email = String(value ?? "").trim();
  return EMAIL_PATTERN.test(email) ? email : null;
}

/**
 * Antigravity's local token file has no account profile. The official CLI may
 * still return the authenticated email in its structured/status output or
 * stderr. Read only that identity field; never scrape or expose token text.
 */
export function extractAntigravityAccountEmail(...values) {
  for (const value of values) {
    const direct = normalizeEmail(
      value?.email
        ?? value?.account?.email
        ?? value?.user?.email
        ?? value?.identity?.email
        ?? value?.command?.data?.email,
    );
    if (direct) return direct;
    const text = typeof value === "string" ? value : "";
    const explicit = text.match(
      /(?:applyAuthResult:\s*)?email\s*=\s*([^\s,;]+)|authenticated\s+successfully\s+as\s+([^\s,;]+)/i,
    );
    const matched = normalizeEmail(explicit?.[1] ?? explicit?.[2]);
    if (matched) return matched;
  }
  return null;
}

function sessionFingerprint(session) {
  const token = typeof session?.token === "string" && session.token.length > 0
    ? session.token
    : null;
  return token ? hash(`antigravity-session:${token}`).slice(0, 10).toUpperCase() : null;
}

function sameEmail(left, right) {
  const a = normalizeEmail(left)?.toLowerCase();
  const b = normalizeEmail(right)?.toLowerCase();
  return Boolean(a && b && a === b);
}

function cliFailure(code, signal, output, errorOutput) {
  const error = new Error(`Antigravity CLI failed (${signal ?? code})`);
  error.code = code;
  const structured = parseJsonOutput(output);
  const structuredDetail = structured?.error
    ?? structured?.response
    ?? structured?.result?.error
    ?? structured?.result?.response;
  error.detail = String(errorOutput || structuredDetail || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  return error;
}

function runCommand(command, args, { env = process.env, timeoutMs = 30_000, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...env, AGY_CLI_HIDE_ACCOUNT_INFO: env.AGY_CLI_HIDE_ACCOUNT_INFO ?? "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...(signal ? { signal } : {}),
    });
    const stdout = [];
    const stderr = [];
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const output = Buffer.concat(stdout).toString("utf8");
      const errorOutput = Buffer.concat(stderr).toString("utf8");
      if (code === 0) {
        resolve({ output, errorOutput });
        return;
      }
      reject(cliFailure(code, signal, output, errorOutput));
    });
  });
}

function parseJsonOutput(output) {
  try {
    return JSON.parse(output);
  } catch {
    // The official CLI normally emits one JSON document. If a launcher adds
    // an informational line, accept the last complete JSON line without
    // weakening the structured response contract.
    for (const line of String(output).split(/\r?\n/).reverse()) {
      if (!line.trim()) continue;
      try {
        return JSON.parse(line);
      } catch {
        // Keep looking for the structured document.
      }
    }
    return null;
  }
}

function runStreamingCommand(command, args, { env = process.env, timeoutMs = 300_000, signal } = {}) {
  return (async function* lines() {
    const child = spawn(command, args, {
      env: { ...env, AGY_CLI_HIDE_ACCOUNT_INFO: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...(signal ? { signal } : {}),
    });
    const stdout = [];
    const stderr = [];
    let spawnError = null;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", (error) => {
      spawnError = error;
    });
    const closed = new Promise((resolve) => {
      child.once("close", (code, closeSignal) => resolve({ code, signal: closeSignal }));
    });
    const reader = createInterface({ input: child.stdout });
    try {
      for await (const line of reader) {
        stdout.push(line);
        yield line;
      }
    } finally {
      reader.close();
    }
    clearTimeout(timer);
    const result = await closed;
    const output = stdout.join("\n");
    const errorOutput = Buffer.concat(stderr).toString("utf8");
    if (spawnError) throw spawnError;
    if (result.code !== 0) {
      throw cliFailure(result.code, timedOut ? "SIGTERM" : result.signal, output, errorOutput);
    }
  })();
}

function normalizeToken(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function modelTier(model) {
  const labelMatch = /\(([^()]+)\)\s*$/.exec(model.name ?? "");
  if (!labelMatch) return null;
  const idParts = model.id.split("-");
  const id = idParts.at(-1);
  const label = labelMatch[1].trim();
  if (!id || !label || normalizeToken(id) !== normalizeToken(label)) return null;
  return { id, name: label };
}

/**
 * Convert the provider's exact model rows into DSH model metadata. A reasoning
 * selector is added only when the provider actually returned multiple rows in
 * one dynamically discovered family; no model names or tier vocabulary are
 * embedded in Dockyard.
 */
export function parseAntigravityModelCatalog(output) {
  const rows = String(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^fetching available models/i.test(line))
    .map((line) => {
      const [id, ...nameParts] = line.split("\t");
      return { id, name: nameParts.join("\t") || id };
    })
    .filter((model) => model.id);

  const families = new Map();
  for (const model of rows) {
    const tier = modelTier(model);
    if (!tier) continue;
    const familyId = model.id.slice(0, -(tier.id.length + 1));
    const family = families.get(familyId) ?? new Map();
    family.set(tier.id, tier);
    families.set(familyId, family);
  }

  return rows.map((model) => {
    const tier = modelTier(model);
    if (!tier) return model;
    const familyId = model.id.slice(0, -(tier.id.length + 1));
    const family = families.get(familyId);
    if (!family || family.size < 2) return model;
    const efforts = [...family.values()];
    return {
      ...model,
      reasoning: {
        efforts: efforts.map((effort) => ({ id: effort.id, name: effort.name })),
        defaultEffort: tier.id,
      },
    };
  });
}

function registryModels(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.models)) return value.models;
  return [];
}

function registryMatch(model, registry) {
  const candidates = registryModels(registry)
    .filter((candidate) => candidate && typeof candidate.id === "string" && candidate.id.length > 0)
    .filter((candidate) => model.id === candidate.id || model.id.startsWith(`${candidate.id}-`))
    .sort((left, right) => right.id.length - left.id.length);
  const exact = candidates.find((candidate) => candidate.id === model.id);
  if (exact) return exact;

  // A live provider row may encode a returned reasoning tier in its model id
  // (for example, a family row ending in the provider-returned effort id).
  // Only use a registry family match when that suffix is itself present in
  // the live catalog's effort set; this avoids guessing across unrelated ids.
  const family = candidates[0];
  if (!family || !model.reasoning?.efforts?.length) return null;
  const suffix = model.id.slice(family.id.length + 1);
  return model.reasoning.efforts.some((effort) => normalizeToken(effort.id) === normalizeToken(suffix))
    ? family
    : null;
}

/**
 * Fill only metadata absent from the provider's live model rows. The live
 * Antigravity catalog remains authoritative for ids, names, and reasoning
 * tiers; a registry is used solely as a second, inspectable source for
 * capacities/modalities when the CLI omits them.
 */
export function enrichAntigravityModelCatalog(models, registry) {
  return (Array.isArray(models) ? models : []).map((model) => {
    const match = registryMatch(model, registry);
    if (!match) return model;
    const contextWindow = finiteNumber(model.contextWindow ?? match.contextWindow ?? match.context_window ?? match.context_length);
    const maxTokens = finiteNumber(model.maxTokens ?? match.maxTokens ?? match.max_tokens ?? match.max_output_tokens);
    const inputModalities = Array.isArray(model.inputModalities)
      ? model.inputModalities
      : Array.isArray(match.input) ? match.input : undefined;
    return {
      ...model,
      ...(Number.isInteger(contextWindow) ? { contextWindow } : {}),
      ...(Number.isInteger(maxTokens) ? { maxTokens } : {}),
      ...(inputModalities?.length ? { inputModalities: [...inputModalities] } : {}),
    };
  });
}

/** Cache live provider output and collapse concurrent model-directory reads. */
export function createAntigravityCatalogLoader({
  cliPath = process.env.DOCKYARD_ANTIGRAVITY_CLI || DEFAULT_CLI,
  env = process.env,
  timeoutMs = 30_000,
  cacheTtlMs = Number(process.env.DOCKYARD_ANTIGRAVITY_CATALOG_TTL_MS) || DEFAULT_CATALOG_TTL_MS,
  commandRunner = runCommand,
  registryLoader = null,
} = {}) {
  let cached = null;
  let cachedAt = 0;
  let pending = null;
  return async function loadCatalog({ force = false } = {}) {
    const now = Date.now();
    if (!force && cached && now - cachedAt < cacheTtlMs) return cached;
    const refresh = () => Promise.resolve(commandRunner(cliPath, ["models"], {
      env,
      timeoutMs,
    })).then(async (result) => {
      let registry = [];
      if (typeof registryLoader === "function") {
        try {
          registry = await registryLoader();
        } catch {
          // The optional registry must never prevent the official CLI catalog
          // from loading. The provider's own rows remain usable without it.
        }
      }
      const liveModels = parseAntigravityModelCatalog(result.output);
      const models = enrichAntigravityModelCatalog(liveModels, registry);
      const enriched = models.some((model, index) => {
        const original = liveModels[index];
        return model.contextWindow !== original?.contextWindow || model.maxTokens !== original?.maxTokens;
      });
      const value = {
        models,
        source: enriched ? "official_antigravity_cli+model_registry" : "official_antigravity_cli",
      };
      cached = value;
      cachedAt = Date.now();
      return value;
    }).catch((error) => {
      // A missing or unavailable optional CLI must not reject DSH's global
      // model directory. Keep the provider mounted with an empty live
      // catalog; invocation and account scanning can report the actionable
      // CLI error when the user actually selects Antigravity.
      const unavailable = {
        models: [],
        source: error?.code === "ENOENT"
          ? "antigravity_cli_not_found"
          : "antigravity_cli_unavailable",
        diagnostics: [redactError(error)],
      };
      cached = unavailable;
      cachedAt = Date.now();
      return unavailable;
    }).finally(() => {
      pending = null;
    });

    // The native DSH model directory can ask for the same provider more than
    // once during page boot. Once a live catalog exists, serve it immediately
    // and refresh in the background after TTL expiry. A forced refresh still
    // waits for the provider so the popup's explicit refresh remains live.
    if (!force && cached) {
      if (!pending) pending = refresh();
      return cached;
    }
    if (pending) return pending;
    pending = refresh();
    return pending;
  };
}

function familyPrefixForModel(model) {
  const defaultEffort = model?.reasoning?.defaultEffort;
  if (typeof defaultEffort !== "string" || defaultEffort.length === 0) return null;
  const suffix = `-${defaultEffort}`;
  return model.id.endsWith(suffix) ? model.id.slice(0, -suffix.length) : null;
}

/**
 * Antigravity exposes tiered Gemini rows as exact model IDs. Resolve a DSH
 * model+effort pair to the exact returned row and omit --effort; the CLI
 * rejects passing an encoded tier together with a different effort flag.
 */
export async function resolveAntigravityInvocationModel({ catalogLoader, model, reasoningEffort } = {}) {
  if (typeof model !== "string" || typeof reasoningEffort !== "string" || !catalogLoader) {
    return { model, reasoningEffort };
  }
  try {
    const catalog = await catalogLoader();
    const selected = catalog?.models?.find((candidate) => candidate?.id === model);
    const prefix = familyPrefixForModel(selected);
    if (!selected || !prefix) return { model, reasoningEffort };
    const target = catalog.models.find((candidate) => {
      return candidate?.id?.startsWith(`${prefix}-`)
        && candidate.reasoning?.defaultEffort === reasoningEffort;
    });
    if (!target) return { model, reasoningEffort };
    return { model: target.id, reasoningEffort: undefined };
  } catch {
    // Catalog discovery is advisory for invocation. Keep the exact caller
    // values if the live model directory is temporarily unavailable.
    return { model, reasoningEffort };
  }
}

/**
 * Keep the native invocation model exactly as discovered. CodexSplit sends
 * Antigravity's tier-suffixed model id unchanged to streamGenerateContent;
 * the transport must not invent a family-id/thinkingLevel translation.
 *
 * The helper remains exported for compatibility with callers that used the
 * earlier experimental mapping, but it is intentionally a no-op now.
 */
export async function resolveAntigravityNativeInvocationModel({ catalogLoader, model, reasoningEffort } = {}) {
  return { model, reasoningEffort };
}

function contentText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(contentText).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (typeof value.content === "string" || Array.isArray(value.content)) return contentText(value.content);
  if (value.type === "image") return "[previous image attachment omitted by Antigravity CLI]";
  if (value.type === "tool-call") return `[tool call: ${value.name ?? "unknown"}] ${value.arguments ?? ""}`;
  if (value.type === "tool-result") return contentText(value.content);
  return "";
}

function estimatedTokens(value) {
  const text = String(value ?? "");
  if (!text) return 0;
  // This is a safety estimate used only to avoid sending an obviously
  // oversized transcript. The actual capacity always comes from provider or
  // registry metadata; this is not a model-specific context constant.
  return Math.ceil(Buffer.byteLength(text, "utf8") / 4);
}

function messageText(message) {
  return contentText(message?.content ?? message?.text);
}

function messagesWithinContext(request) {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  const contextWindow = finiteNumber(request.modelContext?.contextWindow);
  if (!Number.isInteger(contextWindow) || contextWindow <= 0) return messages;
  const outputBudget = finiteNumber(request.maxTokens ?? request.modelContext?.maxTokens);
  const inputBudget = contextWindow - (Number.isInteger(outputBudget) ? outputBudget : 0);
  if (inputBudget <= 0) return messages.slice(-1);

  const systemMessages = messages.filter((message) => message?.role === "system");
  const otherMessages = messages.filter((message) => message?.role !== "system");
  let used = estimatedTokens(request.system);
  for (const message of systemMessages) used += estimatedTokens(messageText(message));
  if (used + otherMessages.reduce((sum, message) => sum + estimatedTokens(messageText(message)), 0) <= inputBudget) {
    return messages;
  }

  const selected = [];
  for (let index = otherMessages.length - 1; index >= 0; index -= 1) {
    const message = otherMessages[index];
    const cost = estimatedTokens(messageText(message));
    if (selected.length === 0 || used + cost <= inputBudget) {
      selected.unshift(message);
      used += cost;
    }
  }
  return [...systemMessages, ...selected];
}

export function antigravityRequestPrompt(request = {}) {
  const sections = [];
  if (typeof request.system === "string" && request.system.length > 0) {
    sections.push(`system:\n${request.system}`);
  }
  for (const message of messagesWithinContext(request)) {
    const text = messageText(message);
    if (!text) continue;
    sections.push(`${message?.role ?? "message"}:\n${text}`);
  }
  return sections.join("\n\n") || "Continue the conversation.";
}

function usageFromResponse(usage) {
  if (!usage || typeof usage !== "object") return null;
  const inputTokens = Number(usage.input_tokens ?? usage.inputTokens);
  const outputTokens = Number(usage.output_tokens ?? usage.outputTokens);
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) return null;
  return {
    inputTokens,
    outputTokens,
    ...(Number.isFinite(Number(usage.reasoning_tokens ?? usage.reasoningTokens))
      ? { reasoningTokens: Number(usage.reasoning_tokens ?? usage.reasoningTokens) }
      : {}),
  };
}

function streamEventTexts(payload) {
  if (!payload || typeof payload !== "object") return [];
  const eventName = String(payload.event ?? payload.type ?? "").toLowerCase();
  const allowText = /delta|message|text|content/.test(eventName)
    && !/command_result|result/.test(eventName);
  const texts = [];

  function visit(value, allowNestedText = false, key = "") {
    if (typeof value === "string") {
      if (allowNestedText && key !== "event" && key !== "type") texts.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, allowNestedText, key);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [childKey, child] of Object.entries(value)) {
      const normalizedKey = childKey.toLowerCase().replace(/[-_]/g, "");
      if (normalizedKey === "textdelta" || normalizedKey === "contentdelta") {
        if (typeof child === "string") texts.push(child);
        else visit(child, true, childKey);
        continue;
      }
      if (normalizedKey === "delta") {
        if (typeof child === "string") texts.push(child);
        else visit(child, true, childKey);
        continue;
      }
      if (normalizedKey === "response" || normalizedKey === "error" || normalizedKey === "usage") continue;
      if (normalizedKey === "text" && (allowNestedText || allowText)) {
        if (typeof child === "string") texts.push(child);
        continue;
      }
      if (child && typeof child === "object") {
        visit(child, allowNestedText || normalizedKey.includes("content") || normalizedKey.includes("message"), childKey);
      }
    }
  }

  visit(payload, allowText);
  return texts;
}

function streamEventResult(payload) {
  if (!payload || typeof payload !== "object") return null;
  const result = payload.result ?? payload.response;
  if (typeof result === "string") return { text: result, usage: payload.usage };
  if (!result || typeof result !== "object") return null;
  return {
    text: typeof result.response === "string" ? result.response : contentText(result.response),
    usage: result.usage ?? payload.usage,
    status: result.status,
    error: result.error,
  };
}

function requestTool(request, providerToolName) {
  const tools = Array.isArray(request?.tools) ? request.tools : [];
  const exact = tools.find((tool) => tool?.name === providerToolName);
  if (exact) return { name: exact.name, definition: exact };
  // Antigravity calls its command tool `run_command`; DSH presents the same
  // capability as `bash`. Keep this translation at the protocol boundary so
  // the actual DSH tool registry remains the source of truth.
  if (providerToolName === "run_command") {
    const bash = tools.find((tool) => tool?.name === "bash");
    if (bash) return { name: bash.name, definition: bash };
  }
  return null;
}

function toolCallFromEvent(payload, request) {
  const update = payload?.step_update;
  if (!update || String(update.state ?? "").toUpperCase() !== "ACTIVE" || update.step_type !== "tool") return null;
  const providerName = String(update.tool_name ?? update.tool_info?.name ?? "");
  if (!providerName) return null;
  const target = requestTool(request, providerName);
  if (!target) return null;
  const raw = update.tool_info?.parameters;
  const parameters = raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
  if (providerName === "run_command" && target.name === "bash") {
    const command = parameters.command ?? parameters.CommandLine;
    if (typeof command === "string" && command.length > 0) {
      return {
        name: target.name,
        arguments: {
          command,
          description: parameters.description ?? parameters.Description ?? "Run the requested command",
          ...(parameters.workdir ?? parameters.Cwd ? { workdir: parameters.workdir ?? parameters.Cwd } : {}),
          ...(parameters.timeoutMs ?? parameters.TimeoutMs ? { timeoutMs: parameters.timeoutMs ?? parameters.TimeoutMs } : {}),
        },
        id: String(update.tool_info?.call_id ?? update.call_id ?? `agy-${hash(JSON.stringify({ update, requestId: request.requestId ?? "" })).slice(0, 20)}`),
      };
    }
  }
  return {
    name: target.name,
    arguments: parameters,
    id: String(update.tool_info?.call_id ?? update.call_id ?? `agy-${hash(JSON.stringify({ update, requestId: request.requestId ?? "" })).slice(0, 20)}`),
  };
}

function appendDelta(current, next) {
  if (!next) return "";
  if (!current) return next;
  if (next.startsWith(current)) return next.slice(current.length);
  if (current.endsWith(next)) return "";
  return next;
}

/** Execute text turns through the installed official Antigravity CLI. */
export function createAntigravityCliExecutor({
  cliPath = process.env.DOCKYARD_ANTIGRAVITY_CLI || DEFAULT_CLI,
  env = process.env,
  timeoutMs = 300_000,
  commandRunner = runCommand,
  catalogLoader = null,
  streamCommandRunner = runStreamingCommand,
} = {}) {
  return async function executeAntigravity({ request = {} } = {}) {
    if (contentHasImageInCurrentTurn(request)) {
      throw unsupportedContentError(
        PROVIDER_ID,
        "Antigravity CLI 当前没有暴露可接收 DSH 图片附件的原生输入通道",
      );
    }
    const resolved = await resolveAntigravityInvocationModel({
      catalogLoader,
      model: request.model,
      reasoningEffort: request.reasoningEffort,
    });
    return (async function* responseStream() {
      const args = ["-p", antigravityRequestPrompt(request)];
      if (typeof resolved.model === "string" && resolved.model.length > 0) {
        args.push("--model", resolved.model);
      }
      if (typeof resolved.reasoningEffort === "string" && resolved.reasoningEffort.length > 0) {
        args.push("--effort", resolved.reasoningEffort);
      }
      // Print mode cannot open an interactive permission prompt. The sandbox
      // makes a native tool request deterministic; we translate its intent
      // into DSH's own tool loop before the CLI reaches its denial boundary.
      args.push("--sandbox", "--output-format", "stream-json");
      yield { type: "block-start", index: 0, blockType: "text" };
      let text = "";
      let usage = null;
      const handledTools = new Set();
      for await (const line of streamCommandRunner(cliPath, args, {
        env,
        timeoutMs,
        signal: request.signal,
      })) {
        const parsed = parseJsonOutput(line);
        if (!parsed) continue;
        const tool = toolCallFromEvent(parsed, request);
        if (tool) {
          const key = `${tool.id}:${tool.name}:${JSON.stringify(tool.arguments)}`;
          if (handledTools.has(key)) continue;
          handledTools.add(key);
          yield { type: "block-end", index: 0, block: { type: "text", text } };
          yield { type: "block-start", index: 1, blockType: "tool-call" };
          yield {
            type: "block-end",
            index: 1,
            block: {
              type: "tool-call",
              id: tool.id,
              name: tool.name,
              arguments: JSON.stringify(tool.arguments),
            },
          };
          yield { type: "finish", reason: { kind: "tool-calls" } };
          return;
        }
        for (const delta of streamEventTexts(parsed)) {
          const next = appendDelta(text, delta);
          if (!next) continue;
          text += next;
          yield { type: "text-delta", index: 0, text: next };
        }
        const final = streamEventResult(parsed);
        if (final) {
          if (final.status && final.status !== "SUCCESS") {
            const error = new Error("Antigravity CLI request did not complete");
            error.detail = final.error ?? final.text ?? null;
            throw error;
          }
          const next = appendDelta(text, final.text);
          if (next) {
            text += next;
            yield { type: "text-delta", index: 0, text: next };
          }
          usage = usageFromResponse(final.usage) ?? usage;
        }
        usage = usageFromResponse(parsed.usage) ?? usage;
      }
      yield { type: "block-end", index: 0, block: { type: "text", text } };
      if (usage) yield { type: "usage", usage };
      yield { type: "finish", reason: { kind: "stop" } };
    })();
  };
}

function quotaGroups(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.groups)) return data.groups;
  if (Array.isArray(data.quota_groups)) return data.quota_groups;
  if (Array.isArray(data.quotaGroups)) return data.quotaGroups;
  return [];
}

function findQuotaData(value, depth = 0, seen = new Set()) {
  if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) return null;
  seen.add(value);
  if (quotaGroups(value).length > 0) return value;
  for (const key of ["command", "data", "response", "quota_summary", "quotaSummary", "result"]) {
    const found = findQuotaData(value[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function findCreditsData(value, depth = 0, seen = new Set()) {
  if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) return null;
  seen.add(value);
  if (Object.hasOwn(value, "remaining_credits") || Object.hasOwn(value, "remainingCredits")) return value;
  for (const child of Object.values(value)) {
    const found = findCreditsData(child, depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function parseQuotaData(data, now = new Date(), source = "antigravity_cli") {
  const windows = [];
  for (const group of quotaGroups(data)) {
    for (const bucket of group?.buckets ?? []) {
      const fraction = finiteNumber(bucket.remaining_fraction ?? bucket.remainingFraction);
      const percent = finiteNumber(bucket.remaining_percent ?? bucket.remainingPercent);
      const remaining = fraction ?? (percent === null ? null : percent / 100);
      windows.push({
        id: stringValue(bucket.id) ?? `${group.name ?? "group"}:${bucket.name ?? "window"}`,
        name: [group.name, bucket.name].filter(Boolean).join(" / ") || null,
        remaining,
        limit: remaining === null ? null : 1,
        unit: remaining === null ? null : "fraction",
        resetAt: isoFromEpoch(bucket.reset_time ?? bucket.resetTime),
        updatedAt: now.toISOString(),
        source,
      });
    }
  }
  return windows;
}

function parseQuotaText(text, now = new Date(), source = "antigravity_cli") {
  const windows = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split("\t");
    if (parts.length < 3 || !/%$/.test(parts[2])) continue;
    const remaining = finiteNumber(parts[2].replace(/%$/, ""));
    if (remaining === null) continue;
    windows.push({
      id: `${parts[0]}:${parts[1]}`,
      name: `${parts[0]} / ${parts[1]}`,
      remaining,
      limit: 100,
      unit: "percent",
      resetAt: isoFromEpoch(parts[3]),
      updatedAt: now.toISOString(),
      source,
    });
  }
  return windows;
}

/** Normalize the live first-party quota summary without embedding its rows. */
export function parseAntigravityNativeQuota(value, now = new Date()) {
  const data = findQuotaData(value);
  let windows = parseQuotaData(data, now, "antigravity_native");
  if (windows.length === 0) {
    windows = recursiveQuotaWindows(value, { source: "antigravity_native", now, prefix: "antigravity" });
  }
  const credits = findCreditsData(value);
  return {
    windows,
    credits: credits
      ? {
        remaining: finiteNumber(credits.remaining_credits ?? credits.remainingCredits),
        upgradeUri: stringValue(credits.upgrade_uri ?? credits.upgradeUri),
      }
      : null,
  };
}

function candidate(now, { email = null, session = null, existingAccounts = [] } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const fingerprint = sessionFingerprint(session);
  const stableAccountId = normalizedEmail
    ? `antigravity:google:${hash(`email:${normalizedEmail.toLowerCase()}`).slice(0, 20)}`
    : fingerprint
      ? `antigravity:session:${hash(`fingerprint:${fingerprint}`).slice(0, 20)}`
      : "antigravity:active";
  const known = existingAccounts.find((account) => (
    (fingerprint && account?.resources?.sessionFingerprint === fingerprint)
      || sameEmail(account?.email, normalizedEmail)
  ));
  const legacy = existingAccounts.find((account) => account?.accountId === "antigravity:active");
  // Migrate the account record created by the old single-session driver in
  // place. Once its fingerprint is recorded, the next switched session gets
  // a separate accountId and can be added to the pool independently.
  const accountId = known?.accountId
    ?? (legacy && !legacy.resources?.sessionFingerprint && stableAccountId !== "antigravity:active"
      ? legacy.accountId
      : stableAccountId);
  const identityLabel = normalizedEmail
    ?? (fingerprint ? `Antigravity 官方会话 · ${fingerprint}` : "Antigravity 官方当前会话");
  const identitySource = normalizedEmail
    ? "official_cli_auth_status"
    : fingerprint
      ? "local_oauth_session_fingerprint"
      : "official_active_session";
  const credentialRef = createCredentialRef(PROVIDER_ID, accountId);
  const value = {
    candidateId: `antigravity:${hash(accountId).slice(0, 20)}`,
    providerId: PROVIDER_ID,
    source: "official_antigravity_cli",
    accountId,
    displayName: identityLabel,
    email: normalizedEmail,
    subscription: { plan: null, status: null, expiresAt: null },
    refresh: {
      accessTokenExpiresAt: null,
      nextRefreshAt: null,
      lastRefreshedAt: null,
      refreshable: null,
    },
    imported: false,
    status: "available",
    diagnostic: null,
    credentialRef,
    resources: {
      identitySource,
      identityLabel,
      ...(fingerprint ? { sessionFingerprint: fingerprint } : {}),
      identityNote: normalizedEmail
        ? "账号邮箱来自官方 Antigravity 登录态"
        : fingerprint
          ? "官方登录态未返回邮箱；使用会话指纹区分账号"
          : "官方只返回当前会话；切换账号后请重新扫描",
      sessionPersistence: session?.token ? "captured" : "active",
    },
  };
  Object.defineProperty(value, CREDENTIAL_SLOT, {
    value: {
      type: "official_cli_session",
      providerId: PROVIDER_ID,
      ...(session?.token ? { access: session.token } : {}),
    },
    enumerable: false,
  });
  return value;
}

export function summarizeAntigravityCandidate(value) {
  return {
    providerId: PROVIDER_ID,
    candidateId: value.candidateId,
    source: value.source,
    accountId: value.accountId,
    displayName: value.displayName,
    email: value.email,
    subscription: { ...value.subscription },
    refresh: { ...value.refresh },
    resources: { ...value.resources },
    imported: Boolean(value.imported),
    status: value.status ?? "available",
    diagnostic: value.diagnostic ?? null,
  };
}

const ANTIGRAVITY_AUTH_URL_PATTERN = /https:\/\/accounts\.google\.com\/o\/oauth2\/auth\?[^\s"'<>]+/i;

function cleanAntigravityAuthUrl(value) {
  return String(value ?? "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[),.;]+$/, "");
}

function publicAntigravityAuthSession(session) {
  return {
    sessionId: session.sessionId,
    providerId: PROVIDER_ID,
    status: session.status ?? (session.exitCode === null ? "pending" : "processing"),
    authorizationUrl: session.authorizationUrl,
    instructions: session.instructions,
    startedAt: session.startedAt,
    ...(session.browserOpened ? { browserOpened: true } : {}),
    ...(session.inputRequired ? { inputRequired: true } : {}),
    diagnostic: session.diagnostic ?? null,
  };
}

/**
 * Start agy's own Google OAuth flow in a temporary profile.
 *
 * agy has no separate login subcommand: its normal `agy -p` command starts
 * the official OAuth flow when that profile is unauthenticated. Running it
 * with an isolated HOME lets DSH add another Google account without touching
 * the user's active CLI session. The child is never attached to a terminal;
 * only the authorization URL and the resulting token are used.
 */
export function createAntigravityOAuthAuthorizer({
  cliPath = process.env.DOCKYARD_ANTIGRAVITY_CLI || DEFAULT_CLI,
  environment = process.env,
  timeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
  prompt = "Reply with OK",
  spawnImpl = spawn,
  tokenReader = readAntigravityTokenFile,
  usePty = process.platform === "darwin",
  ptyPythonPath = process.env.DOCKYARD_ANTIGRAVITY_PTY_PYTHON || "python3",
  instructions = "已打开 Google 官方验证页；选择账号并完成验证后，DSH 会自动接入。",
} = {}) {
  if (!cliPath) throw new Error("Antigravity OAuth authorizer requires an agy CLI path");
  if (typeof spawnImpl !== "function") throw new Error("Antigravity OAuth authorizer requires a process spawner");
  if (typeof tokenReader !== "function") throw new Error("Antigravity OAuth authorizer requires a token reader");

  const sessions = new Map();

  async function cleanup(session) {
    if (!session.profileDir) return;
    await rm(session.profileDir, { recursive: true, force: true }).catch(() => {});
    session.profileDir = null;
  }

  function capture(session, chunk) {
    session.output = `${session.output}${String(chunk ?? "")}`.slice(-32_000);
    if (!session.authorizationUrl) {
      const match = session.output.match(ANTIGRAVITY_AUTH_URL_PATTERN);
      if (match?.[0]) session.authorizationUrl = cleanAntigravityAuthUrl(match[0]);
    }
    if (/authorization code|redirect URL/i.test(session.output)) session.inputRequired = true;
  }

  function readToken(session) {
    try {
      return tokenReader({ env: session.childEnv, home: session.profileDir });
    } catch {
      return null;
    }
  }

  async function finalize(session, context, credential = null) {
    if (session.result) return session.result;
    if (session.finalizing) return session.finalizing;
    session.finalizing = (async () => {
      try {
        const auth = credential ?? readToken(session);
        if (!auth?.token) {
          if (session.exitCode === null) return publicAntigravityAuthSession(session);
          session.status = "failed";
          session.diagnostic = session.timedOut
            ? "Google 验证超时，请重新点击登录添加账号。"
            : session.launchError
              ? `无法启动 agy 官方验证：${session.launchError}`
              : `agy 官方验证未完成（退出码 ${session.exitCode ?? "unknown"}）。`;
          return publicAntigravityAuthSession(session);
        }

        // The prompt only bootstraps agy's official auth flow. Stop it as soon
        // as the OAuth token is persisted so DSH never spends a model request.
        if (session.child && session.exitCode === null) session.child.kill("SIGTERM");
        const account = candidate(context?.now instanceof Date ? context.now : new Date(), {
          email: extractAntigravityAccountEmail(session.output),
          session: auth,
          existingAccounts: context?.accounts ?? [],
        });
        session.status = "completed";
        session.result = {
          ...publicAntigravityAuthSession(session),
          status: "completed",
          accounts: [account],
          diagnostic: null,
        };
        return session.result;
      } catch (error) {
        session.status = "failed";
        session.diagnostic = redactError(error);
        return publicAntigravityAuthSession(session);
      } finally {
        if (session.status === "completed" || session.status === "failed") {
          if (session.timer) clearTimeout(session.timer);
          await cleanup(session);
        }
      }
    })();
    return session.finalizing;
  }

  async function begin() {
    const profileDir = await mkdtemp(join(tmpdir(), "dockyard-antigravity-oauth-"));
    const tokenPath = join(profileDir, ".gemini", "antigravity-cli", "antigravity-oauth-token");
    const childEnv = {
      ...environment,
      HOME: profileDir,
      XDG_CONFIG_HOME: join(profileDir, ".config"),
      DOCKYARD_ANTIGRAVITY_TOKEN_FILE: tokenPath,
    };
    // Do not force AGY_CLI_HIDE_ACCOUNT_INFO here. In agy, the presence of
    // the variable is itself treated as enabled even when its value is "0";
    // that mode skips the browser OAuth bootstrap and only asks the user to
    // run agy manually. The official default is the desired browser flow.
    delete childEnv.AGY_CLI_HIDE_ACCOUNT_INFO;
    const session = {
      sessionId: `${PROVIDER_ID}:${randomUUID()}`,
      providerId: PROVIDER_ID,
      profileDir,
      childEnv,
      status: "pending",
      authorizationUrl: null,
      instructions,
      startedAt: new Date().toISOString(),
      // agy owns the official browser OAuth flow and opens this URL itself.
      // The DSH host must not open the captured URL a second time.
      browserOpened: true,
      exitCode: null,
      launchError: null,
      output: "",
      inputRequired: false,
      timedOut: false,
      child: null,
      timer: null,
      finalizing: null,
      result: null,
      diagnostic: null,
    };
    sessions.set(session.sessionId, session);

    try {
      // agy refuses to bootstrap OAuth when stdin is a plain pipe. macOS's
      // built-in `script` gives it a hidden pseudo-terminal while DSH still
      // owns the pipe, so the user only sees the browser verification page.
      const command = usePty ? ptyPythonPath : cliPath;
      const args = usePty
        ? ["-u", "-c", ANTIGRAVITY_PTY_SCRIPT, cliPath, "-p", prompt, "--output-format", "json"]
        : ["-p", prompt, "--output-format", "json"];
      const child = spawnImpl(command, args, {
        env: childEnv,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      session.child = child;
      child.stdout?.on("data", (chunk) => capture(session, chunk));
      child.stderr?.on("data", (chunk) => capture(session, chunk));
      child.once("error", (error) => {
        session.launchError = redactError(error);
        session.exitCode = -1;
      });
      child.once("close", (code) => {
        session.exitCode = typeof code === "number" ? code : -1;
      });
      session.timer = setTimeout(() => {
        if (session.exitCode !== null) return;
        session.timedOut = true;
        child.kill("SIGTERM");
      }, timeoutMs);
      session.timer.unref?.();
    } catch (error) {
      session.launchError = redactError(error);
      session.exitCode = -1;
    }
    return publicAntigravityAuthSession(session);
  }

  async function poll(sessionId, context = {}) {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        providerId: PROVIDER_ID,
        status: "missing",
        instructions,
        diagnostic: "验证会话不存在或已结束，请重新点击登录添加账号。",
      };
    }
    if (session.result) return session.result;
    const credential = readToken(session);
    if (!credential?.token && session.exitCode === null) return publicAntigravityAuthSession(session);
    const result = await finalize(session, context, credential);
    if (!["pending", "processing"].includes(result.status)) sessions.delete(sessionId);
    return result;
  }

  async function submitAuthorizationCode(sessionId, value) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error("验证会话不存在或已结束，请重新点击登录添加账号");
    const code = String(value ?? "").trim();
    if (!code) throw new Error("请输入 Google 验证码或回调地址");
    if (!session.child || session.exitCode !== null || !session.child.stdin?.writable) {
      throw new Error("agy 验证进程已结束，请重新点击登录添加账号");
    }
    session.child.stdin.write(`${code}\n`);
    session.inputRequired = false;
    session.status = "processing";
    session.instructions = "授权码已提交，正在等待官方登录完成。";
    return publicAntigravityAuthSession(session);
  }

  async function cancel(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return { sessionId, providerId: PROVIDER_ID, status: "missing" };
    if (session.timer) clearTimeout(session.timer);
    if (session.child && session.exitCode === null) session.child.kill("SIGTERM");
    await cleanup(session);
    sessions.delete(sessionId);
    return { sessionId, providerId: PROVIDER_ID, status: "cancelled" };
  }

  return Object.freeze({ begin, poll, cancel, submitAuthorizationCode });
}

export class AntigravityOfficialCliDriver {
  constructor({
    cliPath = process.env.DOCKYARD_ANTIGRAVITY_CLI || DEFAULT_CLI,
    env = process.env,
    timeoutMs = 30_000,
    commandRunner = runCommand,
    requestExecutor = null,
    catalogLoader = null,
    quotaReader = null,
    tokenResolver = resolveAntigravityAccessToken,
    identityFromOfficialCli = true,
    oauthAuthorizer = null,
    authorizationTimeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
  } = {}) {
    this.cliPath = cliPath;
    this.env = env;
    this.timeoutMs = timeoutMs;
    this.commandRunner = commandRunner;
    this.requestExecutor = requestExecutor;
    this.quotaReader = quotaReader;
    this.tokenResolver = tokenResolver;
    this.identityFromOfficialCli = identityFromOfficialCli;
    this.oauthAuthorizer = oauthAuthorizer ?? createAntigravityOAuthAuthorizer({
      cliPath,
      environment: env,
      timeoutMs: authorizationTimeoutMs,
    });
    this.catalogLoader = catalogLoader ?? createAntigravityCatalogLoader({
      cliPath,
      env,
      timeoutMs,
      commandRunner,
    });
  }

  async #slash(command, signal) {
    const result = await this.commandRunner(this.cliPath, ["-p", command, "--output-format", "json"], {
      env: this.env,
      timeoutMs: this.timeoutMs,
      ...(signal ? { signal } : {}),
    });
    const parsed = parseJsonOutput(result.output);
    return { ...result, parsed };
  }

  async #nativeQuota(account, context, now) {
    if (typeof this.quotaReader !== "function") return null;
    let credential = null;
    const credentialRef = account?.auth?.credentialRef;
    if (credentialRef && context.secretStore && typeof context.secretStore.read === "function") {
      credential = await context.secretStore.read(credentialRef);
    }
    const value = await this.quotaReader({ account, credential, context });
    const parsed = parseAntigravityNativeQuota(value, now);
    if (parsed.windows.length === 0 && !parsed.credits) return null;
    return parsed;
  }

  async discover(context = {}) {
    const now = context.now instanceof Date ? context.now : new Date();
    try {
      let session = null;
      try {
        session = typeof this.tokenResolver === "function"
          ? await this.tokenResolver({ env: this.env })
          : null;
      } catch {
        // The official CLI can still be authenticated through a daemon or
        // another local source even when the token file is unavailable.
      }
      let windows = [];
      let source = "official_antigravity_cli";
      try {
        const native = await this.#nativeQuota(null, context, now);
        windows = native?.windows ?? [];
        if (windows.length > 0) source = "antigravity_native";
      } catch {
        // Discovery still falls back to the official CLI when the native
        // endpoint is unavailable or the local token needs reauthorization.
      }
      let result = null;
      let cliIdentityError = null;
      if (windows.length === 0 || this.identityFromOfficialCli) {
        try {
          result = await this.#slash("/quota", context.signal);
          const data = result.parsed?.command?.data;
          if (windows.length === 0) {
            windows = parseQuotaData(data, now);
            if (windows.length === 0) windows = parseQuotaText(result.parsed?.response ?? "", now);
          }
        } catch (error) {
          cliIdentityError = error;
          if (windows.length === 0) throw error;
        }
      }
      const email = extractAntigravityAccountEmail(
        result?.parsed,
        result?.output,
        result?.errorOutput,
      );
      const found = candidate(now, {
        email,
        session,
        existingAccounts: context.accounts ?? [],
      });
      found.status = windows.length ? "available" : "degraded";
      found.diagnostic = windows.length ? null : "官方 CLI 已启动，但没有返回结构化 quota 窗口";
      return {
        candidates: [found],
        source,
        diagnostics: [
          ...(result?.parsed?.status === "SUCCESS" || !result ? [] : ["Antigravity CLI 返回了非成功状态"]),
          ...(cliIdentityError && windows.length ? ["官方 CLI 账号身份暂未返回；已使用本地会话标识"] : []),
        ],
      };
    } catch (error) {
      return {
        candidates: [],
        source: "official_antigravity_cli",
        diagnostics: [`无法读取 Antigravity 官方会话：${redactError(error)}`],
      };
    }
  }

  async importAccount(value, context = {}) {
    const session = value?.[CREDENTIAL_SLOT];
    if (!session) throw new Error("Antigravity candidate is no longer available; scan again");
    if (!context.secretStore) throw new Error("A secure credential store is required");
    await context.secretStore.write(value.credentialRef, session);
    return {
      providerId: PROVIDER_ID,
      accountId: value.accountId,
      credentialRef: value.credentialRef,
      displayName: value.displayName,
      email: value.email ?? null,
      auth: { kind: "official_cli_session", scopes: [] },
      subscription: { plan: null, status: null, expiresAt: null },
      refresh: {
        accessTokenExpiresAt: null,
        nextRefreshAt: null,
        lastRefreshedAt: null,
        refreshable: null,
      },
      resources: {
        transport: "gemini_stream_generate_content_sse",
        authSource: "official_antigravity_cli_session",
        quotaSource: "antigravity_cli_status",
        ...(value.resources ?? {}),
      },
    };
  }

  async startAuthorization(context = {}) {
    return this.oauthAuthorizer.begin(context);
  }

  async pollAuthorization(sessionId, context = {}) {
    return this.oauthAuthorizer.poll(sessionId, context);
  }

  async submitAuthorizationCode(sessionId, code, context = {}) {
    return this.oauthAuthorizer.submitAuthorizationCode(sessionId, code, context);
  }

  async cancelAuthorization(sessionId, context = {}) {
    return this.oauthAuthorizer.cancel(sessionId, context);
  }

  async refreshAccount(account, context = {}) {
    const now = context.now instanceof Date ? context.now : new Date();
    let nativeError = null;
    try {
      const native = await this.#nativeQuota(account, context, now);
      if (native) {
        const primary = selectPrimaryQuotaWindow(native.windows);
        return {
          quota: {
            ...primary,
            windows: native.windows,
            updatedAt: now.toISOString(),
            source: "antigravity_native",
          },
          credits: native.credits,
          resources: { quotaSource: "antigravity_native" },
          refresh: {
            accessTokenExpiresAt: null,
            nextRefreshAt: null,
            lastRefreshedAt: now.toISOString(),
            refreshable: null,
          },
        };
      }
    } catch (error) {
      nativeError = error;
    }
    // Never use the process-wide `agy` session to refresh an imported
    // account. That makes separate Google accounts look identical.
    if (typeof this.quotaReader === "function" && account?.auth?.credentialRef) {
      throw nativeError ?? new Error("Antigravity native quota did not return data for the selected account");
    }
    const [result, creditsResult] = await Promise.all([
      this.#slash("/quota", context.signal),
      this.#slash("/credits", context.signal).catch(() => null),
    ]);
    if (result.parsed?.status && result.parsed.status !== "SUCCESS") {
      throw new Error("Antigravity official quota command did not complete");
    }
    const windows = parseQuotaData(result.parsed?.command?.data, now);
    const fallbackWindows = windows.length ? windows : parseQuotaText(result.parsed?.response ?? "", now);
    const primary = selectPrimaryQuotaWindow(fallbackWindows);
    return {
      quota: {
        ...primary,
        windows: fallbackWindows,
        updatedAt: now.toISOString(),
        source: "antigravity_cli",
      },
      credits: creditsResult?.parsed?.command?.data
        ? {
          remaining: finiteNumber(creditsResult.parsed.command.data.remaining_credits),
          upgradeUri: stringValue(creditsResult.parsed.command.data.upgrade_uri),
        }
        : null,
      refresh: {
        accessTokenExpiresAt: null,
        nextRefreshAt: null,
        lastRefreshedAt: now.toISOString(),
        refreshable: null,
      },
    };
  }

  async getQuota(account, context = {}) {
    const now = context.now instanceof Date ? context.now : new Date();
    let nativeError = null;
    try {
      const native = await this.#nativeQuota(account, context, now);
      if (native) {
        const primary = selectPrimaryQuotaWindow(native.windows);
        return {
          quota: {
            ...primary,
            windows: native.windows,
            updatedAt: now.toISOString(),
            source: "antigravity_native",
          },
          credits: native.credits,
          resources: { quotaSource: "antigravity_native" },
          refresh: {
            accessTokenExpiresAt: null,
            nextRefreshAt: null,
            lastRefreshedAt: now.toISOString(),
            refreshable: null,
          },
        };
      }
    } catch (error) {
      nativeError = error;
    }
    if (typeof this.quotaReader === "function" && account?.auth?.credentialRef) {
      throw nativeError ?? new Error("Antigravity native quota did not return data for the selected account");
    }
    const [quotaResult, creditsResult] = await Promise.all([
      this.#slash("/quota", context.signal),
      this.#slash("/credits", context.signal).catch(() => null),
    ]);
    const data = quotaResult.parsed?.command?.data;
    const windows = parseQuotaData(data, now);
    const fallbackWindows = windows.length ? windows : parseQuotaText(quotaResult.parsed?.response ?? "", now);
    const credits = creditsResult?.parsed?.command?.data ?? null;
    const primary = selectPrimaryQuotaWindow(fallbackWindows);
    return {
      quota: {
        ...primary,
        windows: fallbackWindows,
        updatedAt: now.toISOString(),
        source: "antigravity_cli",
      },
      credits: credits
        ? { remaining: finiteNumber(credits.remaining_credits), upgradeUri: stringValue(credits.upgrade_uri) }
        : null,
      refresh: {
        accessTokenExpiresAt: null,
        nextRefreshAt: null,
        lastRefreshedAt: now.toISOString(),
        refreshable: null,
      },
    };
  }

  async getCatalog(context = {}) {
    return this.catalogLoader({ force: Boolean(context.force) });
  }

  async invoke(request, invocation, context = {}) {
    const executor = context.requestExecutor ?? this.requestExecutor;
    if (typeof executor !== "function") {
      throw new Error("Antigravity native invocation transport is not mounted");
    }
    return executor({ request, invocation, context });
  }

  async stream(request, invocation, context = {}) {
    return this.invoke(request, invocation, context);
  }
}

export function createAntigravityDriver(options = {}) {
  return new AntigravityOfficialCliDriver(options);
}

export const antigravityDriverConstants = Object.freeze({ providerId: PROVIDER_ID });
