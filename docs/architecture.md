# Dockyard DSH architecture

## Non-negotiable rule

Dockyard DSH is a module runtime. Provider-specific logic must live in provider modules, and host applications must consume stable contracts rather than branching on provider names.

The core only owns:

- module lifecycle and service registration;
- typed event boundaries;
- account and quota data contracts;
- account-pool selection;
- DSH route injection contracts.

The core does not own provider versions, model catalogs, plan names, quota amounts, reset times, account identities, OAuth token values, or provider endpoints.

## Live data flow

```text
Provider OAuth / native app state
        |
        v
Provider module discovery
        |
        v
Official OAuth authorization -> secure credential reference
        |
        v
Live account metadata, quota, refresh state, catalog
        |
        v
AccountPool -> DSH provider route -> native provider invocation
```

Every provider response is allowed to be partial. Missing values stay `null` or `unknown`; the runtime never invents a quota, refresh time, model, or version.

## Module boundaries

### `dockyard-core`

Defines `ModuleRuntime`, `EventBus`, provider contracts, account contracts, and DSH route contracts.

### `dockyard-account-pool`

Stores account metadata without raw credentials, resolves `credentialRef` values through a secure provider-owned resolver, and applies manual, sticky-session, round-robin, or failover selection.

Selection happens in the runtime, not in the menu bar, so concurrent DSH sessions follow the same policy.

### Provider modules

`provider-codex`, `provider-antigravity`, `provider-grok`, `provider-claude`, and `provider-cursor` are the current modules. Each module receives a provider driver for:

- OAuth discovery and provider-native official authorization;
- refresh and re-authentication;
- live quota and reset-time retrieval;
- live model/catalog retrieval;
- native request invocation.

The module manifest contains only stable technical identity and capabilities. It contains no provider version or account data.

### Host modules

The macOS menu bar is a host. It presents live state and sends commands, but it does not implement provider OAuth or account selection. A future CLI or web host can consume the same runtime services.

## First implementation slice

1. Connect the Codex driver to the local secure OAuth source.
2. Connect the Antigravity driver to its local secure OAuth source.
3. Import accounts into `AccountPool` with live subscription, quota, and refresh metadata.
4. Mount both provider routes into the DSH adapter.
5. Add the menu bar host after the runtime path is observable and testable.
