import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFile, rename, writeFile } from "node:fs/promises";

const [piAiFile, conversationFile] = process.argv.slice(2);

function replaceOnce(source, oldText, newText, label) {
  const occurrences = source.split(oldText).length - 1;
  if (occurrences !== 1) {
    throw new Error(`cannot patch ${label}: expected one match, found ${occurrences}`);
  }
  return source.replace(oldText, newText);
}

/**
 * Start credential resolution and request-context conversion together. The
 * generic third-party adapter is shared by API-key, OAuth, and OpenAI-shaped
 * routes, so this is the one safe place to remove the avoidable waterfall.
 */
export function patchPiAiSource(source) {
  if (source.includes("const apiKeyPromise = Promise.resolve().then(() => this.config.resolveApiKey")) {
    return source;
  }

  source = replaceOnce(
    source,
    "const apiKey = await this.config.resolveApiKey(options.provider, profile);",
    "const apiKeyPromise = Promise.resolve().then(() => this.config.resolveApiKey(options.provider, profile));",
    "parallel API-key resolution",
  );
  source = replaceOnce(
    source,
    `const context = attachments === void 0 ? toPiContext(options, void 0, onReplayDegrade) : await toPiContext({
					...options,
					signal: watchdog.signal
				}, attachments, onReplayDegrade, profile.maxRequestImageBytes, {
					maxPixels: profile.requestImagePixelBudget,
					maxBytes: profile.requestImageMaxBytes
				});`,
    `const contextPromise = Promise.resolve().then(() => attachments === void 0 ? toPiContext(options, void 0, onReplayDegrade) : toPiContext({
					...options,
					signal: watchdog.signal
				}, attachments, onReplayDegrade, profile.maxRequestImageBytes, {
					maxPixels: profile.requestImagePixelBudget,
					maxBytes: profile.requestImageMaxBytes
				}));
				const [apiKey, context] = await Promise.all([apiKeyPromise, contextPromise]);`,
    "parallel request-context conversion",
  );
  return source;
}

/**
 * The turn clock is useful while waiting for the first provider event. The
 * upstream UI hid it for 15 seconds, which made the pre-first-token phase look
 * like an unstarted protocol conversion.
 */
export function patchConversationSource(source) {
  if (source.includes("const showClock = true;")) return source;
  return replaceOnce(
    source,
    "const showClock = elapsedMs >= 15e3;",
    "const showClock = true;",
    "immediate turn clock",
  );
}

async function patchFile(file, patcher) {
  if (!file) throw new Error("missing patch target");
  const source = await readFile(file, "utf8");
  const patched = patcher(source);
  if (patched === source) return false;
  const tempPath = `${file}.${randomUUID()}.tmp`;
  await writeFile(tempPath, patched, "utf8");
  await rename(tempPath, file);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!piAiFile || !conversationFile) {
    throw new Error("usage: patch-dsh-latency.mjs <dsh-llm-pi-ai/lib/index.js> <dsh-client-ui-conversation/lib/client.js>");
  }
  await patchFile(piAiFile, patchPiAiSource);
  await patchFile(conversationFile, patchConversationSource);
}
