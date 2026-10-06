import { createSnapshotStore } from "@deepseek-ai/dsh-client-store";

// Directory identity is session-scoped. Do not share model preferences across
// sessions or retain a disposed directory through a process-wide strong map.
const sessionSelections = new WeakMap();
const CANCELLED = Symbol("superseded model selection");

/** Pick only provider-owned advertised IDs; never carry another route's effort. */
export function chooseProviderModel({ providerId, groups, current, lastModel, defaultSelection }) {
  const models = groups?.find((group) => group.id === providerId)?.models ?? [];
  const ids = models.map((model) => model?.id).filter((id) => typeof id === "string" && id.trim());
  const model = [current?.model, lastModel, defaultSelection?.provider === providerId ? defaultSelection.model : null]
    .find((id) => ids.includes(id)) ?? ids[0];
  return model ? { provider: providerId, model } : null;
}

function unwrap(response) {
  if (response?.ok === false) throw new Error(response.error?.message ?? response.error?.code ?? "Model selection failed");
  return response?.ok === true ? response.value : response;
}

/**
 * Provider changes submit one complete selection, not a provider-only write.
 * Preparation is latest-intent-wins; writes are serialized because the remote
 * selectModel contract has no cancellation and can mutate the Host before its
 * response arrives. A timed-out write remains the barrier for subsequent writes.
 */
export class ProviderModelSelectionController {
  store = createSnapshotStore({ providerId: null, pending: false, error: null });
  active = null;

  constructor(directory, { loadCatalog, timeoutMs = 15_000, noModels, timedOut } = {}) {
    this.directory = directory;
    this.loadCatalog = loadCatalog;
    this.timeoutMs = timeoutMs;
    this.noModels = noModels ?? "No available models. Connect an account or refresh the model catalog.";
    this.timedOut = timedOut ?? "Model selection timed out. Retry after the connection recovers.";
    if (!sessionSelections.has(directory)) {
      sessionSelections.set(directory, { lastModels: new Map(), submitted: Promise.resolve() });
    }
    this.session = sessionSelections.get(directory);
    this.lastModels = this.session.lastModels;
  }

  remember(selection) {
    if (!selection?.provider || !selection?.model) return;
    const signature = JSON.stringify([selection.provider, selection.model]);
    // A successful RPC can precede its durable projection. Re-reading the
    // unchanged old current must not erase a just-confirmed manual choice.
    if (this.session.observedSignature === signature) return;
    this.session.observedSignature = signature;
    this.lastModels.set(selection.provider, selection.model);
  }

  cancel() {
    if (!this.active) return;
    const request = this.active;
    this.active = null;
    request.cancel();
    this.store.set({ ...this.store.getSnapshot(), pending: false });
  }

  selectProvider(providerId) {
    return this.select(providerId, null);
  }

  selectModel(selection) {
    return this.select(selection?.provider, selection);
  }

  retry() {
    return this.intent ? this.select(this.intent.providerId, this.intent.selection) : Promise.resolve(null);
  }

  async select(providerId, explicitSelection) {
    if (typeof providerId !== "string" || !providerId.trim()) return null;
    this.intent = { providerId, selection: explicitSelection ? { ...explicitSelection } : null };
    this.cancel();
    let rejectGate;
    const gate = new Promise((_, reject) => { rejectGate = reject; });
    const request = { cancel: () => rejectGate(CANCELLED) };
    this.active = request;
    const timer = setTimeout(() => rejectGate(new Error(this.timedOut)), this.timeoutMs);
    const wait = (operation) => Promise.race([Promise.resolve(operation), gate]);
    // Also handle a synchronous load/select throw before the first wait.
    gate.catch(() => {});
    this.store.set({ providerId, pending: true, error: null });
    this.remember(this.directory.store.getSnapshot().current);
    try {
      let state = await wait(this.directory.load());
      if (this.active !== request) return null;
      state = this.directory.store.getSnapshot() ?? state;
      let groups = state.groups;
      let failures = state.failures;
      let defaultSelection = null;
      const choose = (current) => {
        if (!explicitSelection) return chooseProviderModel({
          providerId, groups, current,
          lastModel: this.lastModels.get(providerId), defaultSelection,
        });
        const model = groups?.find((group) => group.id === providerId)?.models
          .find((entry) => entry.id === explicitSelection.model && entry.id.trim());
        if (!model) return null;
        const selection = { provider: providerId, model: model.id };
        if (explicitSelection.reasoningEffort !== undefined) {
          if (!model.reasoning?.efforts?.some((effort) => effort.id === explicitSelection.reasoningEffort)) {
            throw new Error("The selected reasoning effort is no longer available.");
          }
          selection.reasoningEffort = explicitSelection.reasoningEffort;
        }
        return selection;
      };
      // ModelDirectory intentionally exposes only the effective current route.
      // Read the public catalog for its real `default`, rather than inventing a
      // defaultModel property on ModelProviderGroup. Current/last remain first.
      const known = choose(state.current);
      const hasPreferred = known && (explicitSelection || [state.current?.model, this.lastModels.get(providerId)].includes(known.model));
      if (!hasPreferred && this.loadCatalog) {
        const catalog = unwrap(await wait(this.loadCatalog()));
        if (this.active !== request) return null;
        groups = catalog.groups;
        failures = catalog.failures;
        defaultSelection = catalog.default;
        state = this.directory.store.getSnapshot();
      }
      if (!choose(state.current)) {
        const failure = failures?.find((entry) => entry.id === providerId);
        throw new Error(failure?.message ?? state.error ?? `${providerId}: ${this.noModels}`);
      }
      const groupsAtRead = state.groups;
      await wait(this.session.submitted);
      if (this.active !== request) return null;
      const latest = this.directory.store.getSnapshot();
      // A catalog event while a previous write was settling may remove a model.
      // Revalidate against that newer snapshot, never the captured stale list.
      if (latest.groups !== groupsAtRead) groups = latest.groups;
      const selection = choose(latest.current);
      if (!selection) throw new Error(`${providerId}: ${this.noModels}`);
      const submitted = Promise.resolve(this.directory.select(selection));
      this.session.submitted = submitted.catch(() => {});
      unwrap(await wait(submitted));
      if (this.active !== request) return null;
      this.lastModels.set(selection.provider, selection.model);
      this.store.set({ providerId, pending: false, error: null });
      return selection;
    } catch (error) {
      if (this.active === request && error !== CANCELLED) {
        this.store.set({ providerId, pending: false, error: error instanceof Error ? error.message : String(error) });
      }
      return null;
    } finally {
      clearTimeout(timer);
      if (this.active === request) this.active = null;
    }
  }
}
