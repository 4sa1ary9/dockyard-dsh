import { defineProviderModule } from "../../../packages/core/src/provider-module.mjs";

export function createKiroModule({ driver = {} } = {}) {
  return defineProviderModule({
    id: "kiro",
    displayName: "Kiro",
    capabilities: [
      "oauth_discovery",
      "oauth_import",
      "oauth_authorization",
      "oauth_refresh",
      "quota",
      "catalog",
      "invoke",
      "stream",
    ],
    driver,
  });
}

export {
  KiroSubscriptionDriver,
  createKiroAcpExecutor,
  createKiroCatalogLoader,
  createKiroDriver,
  kiroRequestPromptBlocks,
  parseKiroModelCatalog,
  parseKiroWhoami,
  resolveKiroCliPath,
  summarizeKiroCandidate,
} from "./driver.mjs";
