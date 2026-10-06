import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createCodexPiAiExecutor } from "../../../modules/provider-codex/src/index.mjs";
import { commonAccountModels, fetchJson, readJsonFile, redactError } from "../../providers/src/provider-utils.mjs";

const DSH_LLM_PI_AI = "@deepseek-ai/dsh-llm-pi-ai";
const PI_AI = "@earendil-works/pi-ai";
const PI_AI_CODEX_API = "@earendil-works/pi-ai/api/openai-codex-responses.lazy";
const PI_AI_CODEX_PROVIDER = "@earendil-works/pi-ai/providers/openai-codex";
const PI_AI_BUILTIN_PROVIDERS = "@earendil-works/pi-ai/providers/all";

async function importBareDependencies() {
  const [{ PiAiAdapter }, { createProvider }, { openAICodexResponsesApi }, { openaiCodexProvider }, builtinProviders] = await Promise.all([
    import(DSH_LLM_PI_AI),
    import(PI_AI),
    import(PI_AI_CODEX_API),
    import(PI_AI_CODEX_PROVIDER),
    import(PI_AI_BUILTIN_PROVIDERS),
  ]);
  return { PiAiAdapter, createProvider, openAICodexResponsesApi, openaiCodexProvider, builtinProviders };
}

function exportTarget(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  for (const condition of ["import", "node", "default"]) {
    const target = exportTarget(value[condition]);
    if (target) return target;
  }
  return null;
}

async function isFile(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findPackageRoot(startDirectory, packageName) {
  const packageParts = packageName.split("/");
  let current = resolve(startDirectory);
  while (true) {
    const candidate = join(current, "node_modules", ...packageParts);
    if (await isFile(join(candidate, "package.json"))) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function packageImportUrl(packageRoot, subpath = null) {
  const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  const exports = packageJson.exports;
  let target = null;
  if (!subpath) {
    target = exportTarget(exports?.["."] ?? exports) ?? packageJson.module ?? packageJson.main;
  } else {
    const key = `./${subpath}`;
    target = exportTarget(exports?.[key]);
    if (!target && exports && typeof exports === "object") {
      for (const [pattern, value] of Object.entries(exports)) {
        if (!pattern.includes("*")) continue;
        const prefix = pattern.slice(0, pattern.indexOf("*"));
        const suffix = pattern.slice(pattern.indexOf("*") + 1);
        if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue;
        target = exportTarget(value)?.replace("*", key.slice(prefix.length, key.length - suffix.length));
        break;
      }
    }
  }
  if (typeof target !== "string") {
    throw new Error(`Cannot resolve ${subpath ?? "."} from ${packageRoot}`);
  }
  return pathToFileURL(join(packageRoot, target)).href;
}

async function importFromDshInstall(moduleAnchor) {
  const anchor = moduleAnchor
    ?? process.env.DOCKYARD_DSH_CLI_PATH
    ?? process.argv[1]
    ?? import.meta.url;
  const dshRequire = createRequire(anchor);
  const dshLlmPath = dshRequire.resolve(DSH_LLM_PI_AI);
  const dshPackageRoot = dirname(dirname(dshLlmPath));
  const piRoot = await findPackageRoot(dshPackageRoot, PI_AI);
  if (!piRoot) throw new Error(`Cannot find ${PI_AI} beside ${DSH_LLM_PI_AI}`);

  const [{ PiAiAdapter }, { createProvider }, { openAICodexResponsesApi }, { openaiCodexProvider }, builtinProviders] = await Promise.all([
    import(pathToFileURL(dshLlmPath).href),
    import(await packageImportUrl(piRoot)),
    import(await packageImportUrl(piRoot, "api/openai-codex-responses.lazy")),
    import(await packageImportUrl(piRoot, "providers/openai-codex")),
    import(await packageImportUrl(piRoot, "providers/all")),
  ]);
  return { PiAiAdapter, createProvider, openAICodexResponsesApi, openaiCodexProvider, builtinProviders };
}

async function loadExecutor(moduleAnchor) {
  let dependencies;
  try {
    dependencies = await importBareDependencies();
  } catch {
    // A local DSH plugin is commonly linked into the profile, so its source
    // file is outside the profile node_modules tree. Resolve the same
    // dependencies from the DSH executable's installation in that case.
    dependencies = await importFromDshInstall(moduleAnchor);
  }
  const { PiAiAdapter, createProvider, openAICodexResponsesApi, openaiCodexProvider } = dependencies;
  const models = openaiCodexProvider().getModels();
  const modelById = new Map(models.map((model) => [model.id, model]));
  return createCodexPiAiExecutor({
    PiAiAdapter,
    createProvider,
    openAICodexResponsesApi,
    modelResolver: (modelId) => modelById.get(modelId),
  });
}

async function loadDependencies(moduleAnchor) {
  try {
    return await importBareDependencies();
  } catch {
    return importFromDshInstall(moduleAnchor);
  }
}

/** Resolve DSH's installed pi-ai dependencies from the plugin package. */
export function createCodexDshRequestExecutor({ moduleAnchor = null } = {}) {
  let executorPromise;
  return (envelope) => {
    executorPromise ??= loadExecutor(moduleAnchor);
    return executorPromise.then((executor) => executor(envelope));
  };
}

/**
 * Read the active pi-ai built-in registry without embedding provider model
 * ids or capacities in Dockyard. Providers such as Antigravity expose a live
 * model id list but may omit context metadata; this registry is an optional
 * second source for exact/family metadata enrichment.
 */
export function createPiAiModelRegistryLoader({ moduleAnchor = null } = {}) {
  let registryPromise;
  return async () => {
    registryPromise ??= loadDependencies(moduleAnchor).then(({ builtinProviders }) => {
      if (typeof builtinProviders?.getBuiltinModels !== "function"
        || typeof builtinProviders?.getBuiltinProviders !== "function") return [];
      return builtinProviders.getBuiltinProviders().flatMap((provider) => builtinProviders.getBuiltinModels(provider));
    });
    return registryPromise;
  };
}

function reasoningFromThinkingLevelMap(thinkingLevelMap) {
  if (!thinkingLevelMap || typeof thinkingLevelMap !== "object") return undefined;
  const efforts = Object.entries(thinkingLevelMap)
    .filter(([id, providerValue]) => id !== "off" && typeof providerValue === "string" && providerValue.length > 0)
    .map(([id, providerValue]) => ({
      id,
      name: id.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
      ...(providerValue === id ? {} : { description: `provider value: ${providerValue}` }),
    }));
  return efforts.length > 0 ? { efforts } : undefined;
}

export function codexModelToDshCatalog(model) {
  const reasoning = reasoningFromThinkingLevelMap(model?.thinkingLevelMap);
  return {
    id: model.id,
    name: model.name,
    ...(Array.isArray(model.input) ? { inputModalities: [...model.input] } : {}),
    ...(Number.isInteger(model.contextWindow) ? { contextWindow: model.contextWindow } : {}),
    ...(Number.isInteger(model.maxTokens) ? { maxTokens: model.maxTokens } : {}),
    ...(reasoning ? { reasoning } : {}),
  };
}

/** The subscription directory is account-scoped; the bundled registry is not. */
export function createCodexDshCatalogLoader({
  fetchImpl = fetch,
  home = homedir(),
  env = process.env,
  clientVersion = null,
} = {}) {
  const cache = new Map();
  const inflight = new Map();
  let publishedVersion;
  let publishedVersionAt = 0;
  return async (context = {}) => {
    let accounts = context.accounts ?? [];
    const accountKey = (account) => JSON.stringify([account.accountId, account.auth?.credentialRef ?? account.credentialRef]);
    const connected = new Set(accounts.map(accountKey));
    if (!context.accountId) for (const key of cache.keys()) if (!connected.has(key)) cache.delete(key);
    if (context.policy === "manual") accounts = accounts.filter((account) => account.accountId === context.defaultAccountId);
    const catalogs = await Promise.all(accounts.map(async (account) => {
      const ref = account.auth?.credentialRef ?? account.credentialRef;
      const key = accountKey(account);
      const cached = cache.get(key);
      const now = context.now instanceof Date ? context.now.getTime() : Date.now();
      if (!context.force && cached && now - cached.fetchedAt < 300_000) return cached;
      if (inflight.has(key)) return inflight.get(key);
      const operation = (async () => {
        try {
          const credential = context.readCredential
            ? await context.readCredential(account)
            : await context.secretStore?.read(ref);
          if (!credential?.access || credential.accountId !== account.accountId) throw new Error("Codex account credential is unavailable");
          // Read only the official client's version, never another account's cached models.
          const metadata = clientVersion ? null : await readJsonFile(join(env.CODEX_HOME || join(home, ".codex"), "models_cache.json")).catch(() => null);
          let version = clientVersion ?? metadata?.client_version;
          if (!version) {
            // Browser OAuth does not require a local Codex install. The endpoint
            // requires a client version and suppresses newer models for 0.0.0.
            if (Date.now() - publishedVersionAt >= 300_000) publishedVersion = null;
            publishedVersionAt = Date.now();
            publishedVersion ??= fetchJson("https://registry.npmjs.org/@openai/codex/latest", { redirect: "error" }, { fetchImpl })
              .then(({ body }) => body?.version).catch((error) => { publishedVersion = null; throw error; });
            version = await publishedVersion;
          }
          if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version)) throw new Error("Codex client version is unavailable");
          const url = new URL("https://chatgpt.com/backend-api/codex/models");
          url.searchParams.set("client_version", version);
          const { body } = await fetchJson(url.toString(), {
            redirect: "error",
            headers: { authorization: `Bearer ${credential.access}`, "chatgpt-account-id": credential.accountId },
            ...(context.signal ? { signal: context.signal } : {}),
          }, { fetchImpl });
          if (!Array.isArray(body?.models)) throw new Error("Codex returned an invalid model directory");
          const models = body.models.filter((model) => typeof model?.slug === "string" && model.slug.length > 0
            && model.visibility === "list" && model.supported_in_api !== false).map((model) => ({
            id: model.slug,
            name: model.display_name || model.slug,
            ...(Array.isArray(model.input_modalities) ? { inputModalities: model.input_modalities.filter((value) => value === "text" || value === "image") } : {}),
            ...(Number.isInteger(model.context_window) && model.context_window > 0 ? { contextWindow: model.context_window } : {}),
            ...(Array.isArray(model.supported_reasoning_levels) && model.supported_reasoning_levels.length ? {
              reasoning: {
                efforts: model.supported_reasoning_levels.filter((level) => typeof level?.effort === "string").map((level) => ({ id: level.effort, name: level.effort, description: level.description })),
                ...(typeof model.default_reasoning_level === "string" ? { defaultEffort: model.default_reasoning_level } : {}),
              },
            } : {}),
          }));
          const result = { models, fetchedAt: now };
          cache.set(key, result);
          return result;
        } catch (error) {
          return { models: cached?.models ?? [], diagnostic: `Codex model directory: ${redactError(error)}${cached ? " (using this account's last successful directory)" : ""}` };
        }
      })().finally(() => inflight.delete(key));
      inflight.set(key, operation);
      return operation;
    }));
    // Automatic rotation can select any account, so advertise only their common models.
    const models = commonAccountModels(catalogs.map((catalog) => catalog.models));
    const diagnostics = catalogs.map((catalog) => catalog.diagnostic).filter(Boolean);
    return { models, source: "codex_account_models", ...(diagnostics.length ? { diagnostic: diagnostics.join("; ") } : {}) };
  };
}
