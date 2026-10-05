window.__ModuleLoader__.load({
  id: "@dockyard-dsh/plugin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// packages/dsh-plugin/src/dockyard-client.mjs
var dockyard_client_exports = {};
__export(dockyard_client_exports, {
  DockyardClientController: () => DockyardClientController,
  apply: () => apply,
  inject: () => inject,
  modelGroupFoldState: () => modelGroupFoldState,
  syncModelMenuGroups: () => syncModelMenuGroups
});
module.exports = __toCommonJS(dockyard_client_exports);
var React = __toESM(require("react"), 1);

// packages/dsh-plugin/node_modules/.pnpm/zustand@4.4.7_immer@10.2.0_react@18.3.1/node_modules/zustand/esm/vanilla.mjs
var import_meta = {};
var createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial2, replace) => {
    const nextState = typeof partial2 === "function" ? partial2(state) : partial2;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const destroy = () => {
    if ((import_meta.env ? import_meta.env.MODE : void 0) !== "production") {
      console.warn(
        "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
      );
    }
    listeners.clear();
  };
  const api = { setState, getState, subscribe, destroy };
  state = createState(setState, getState, api);
  return api;
};
var createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;

// packages/dsh-plugin/node_modules/.pnpm/zustand@4.4.7_immer@10.2.0_react@18.3.1/node_modules/zustand/esm/middleware.mjs
var subscribeWithSelectorImpl = (fn) => (set2, get, api) => {
  const origSubscribe = api.subscribe;
  api.subscribe = (selector, optListener, options) => {
    let listener = selector;
    if (optListener) {
      const equalityFn = (options == null ? void 0 : options.equalityFn) || Object.is;
      let currentSlice = selector(api.getState());
      listener = (state) => {
        const nextSlice = selector(state);
        if (!equalityFn(currentSlice, nextSlice)) {
          const previousSlice = currentSlice;
          optListener(currentSlice = nextSlice, previousSlice);
        }
      };
      if (options == null ? void 0 : options.fireImmediately) {
        optListener(currentSlice, currentSlice);
      }
    }
    return origSubscribe(listener);
  };
  const initialState = fn(set2, get, api);
  return initialState;
};
var subscribeWithSelector = subscribeWithSelectorImpl;

// packages/dsh-plugin/node_modules/.pnpm/immer@10.2.0/node_modules/immer/dist/immer.mjs
var NOTHING = Symbol.for("immer-nothing");
var DRAFTABLE = Symbol.for("immer-draftable");
var DRAFT_STATE = Symbol.for("immer-state");
var errors = true ? [
  // All error codes, starting by 0:
  function(plugin) {
    return `The plugin for '${plugin}' has not been loaded into Immer. To enable the plugin, import and call \`enable${plugin}()\` when initializing your application.`;
  },
  function(thing) {
    return `produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '${thing}'`;
  },
  "This object has been frozen and should not be mutated",
  function(data) {
    return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + data;
  },
  "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
  "Immer forbids circular references",
  "The first or second argument to `produce` must be a function",
  "The third argument to `produce` must be a function or undefined",
  "First argument to `createDraft` must be a plain object, an array, or an immerable object",
  "First argument to `finishDraft` must be a draft returned by `createDraft`",
  function(thing) {
    return `'current' expects a draft, got: ${thing}`;
  },
  "Object.defineProperty() cannot be used on an Immer draft",
  "Object.setPrototypeOf() cannot be used on an Immer draft",
  "Immer only supports deleting array indices",
  "Immer only supports setting array indices and the 'length' property",
  function(thing) {
    return `'original' expects a draft, got: ${thing}`;
  }
  // Note: if more errors are added, the errorOffset in Patches.ts should be increased
  // See Patches.ts for additional errors
] : [];
function die(error2, ...args) {
  if (true) {
    const e = errors[error2];
    const msg = typeof e === "function" ? e.apply(null, args) : e;
    throw new Error(`[Immer] ${msg}`);
  }
  throw new Error(
    `[Immer] minified error nr: ${error2}. Full error at: https://bit.ly/3cXEKWf`
  );
}
var getPrototypeOf = Object.getPrototypeOf;
function isDraft(value) {
  return !!value && !!value[DRAFT_STATE];
}
function isDraftable(value) {
  if (!value)
    return false;
  return isPlainObject(value) || Array.isArray(value) || !!value[DRAFTABLE] || !!value.constructor?.[DRAFTABLE] || isMap(value) || isSet(value);
}
var objectCtorString = Object.prototype.constructor.toString();
var cachedCtorStrings = /* @__PURE__ */ new WeakMap();
function isPlainObject(value) {
  if (!value || typeof value !== "object")
    return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null || proto === Object.prototype)
    return true;
  const Ctor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  if (Ctor === Object)
    return true;
  if (typeof Ctor !== "function")
    return false;
  let ctorString = cachedCtorStrings.get(Ctor);
  if (ctorString === void 0) {
    ctorString = Function.toString.call(Ctor);
    cachedCtorStrings.set(Ctor, ctorString);
  }
  return ctorString === objectCtorString;
}
function each(obj, iter, strict = true) {
  if (getArchtype(obj) === 0) {
    const keys = strict ? Reflect.ownKeys(obj) : Object.keys(obj);
    keys.forEach((key) => {
      iter(key, obj[key], obj);
    });
  } else {
    obj.forEach((entry, index) => iter(index, entry, obj));
  }
}
function getArchtype(thing) {
  const state = thing[DRAFT_STATE];
  return state ? state.type_ : Array.isArray(thing) ? 1 : isMap(thing) ? 2 : isSet(thing) ? 3 : 0;
}
function has(thing, prop) {
  return getArchtype(thing) === 2 ? thing.has(prop) : Object.prototype.hasOwnProperty.call(thing, prop);
}
function set(thing, propOrOldValue, value) {
  const t = getArchtype(thing);
  if (t === 2)
    thing.set(propOrOldValue, value);
  else if (t === 3) {
    thing.add(value);
  } else
    thing[propOrOldValue] = value;
}
function is(x, y) {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
function isMap(target) {
  return target instanceof Map;
}
function isSet(target) {
  return target instanceof Set;
}
function latest(state) {
  return state.copy_ || state.base_;
}
function shallowCopy(base, strict) {
  if (isMap(base)) {
    return new Map(base);
  }
  if (isSet(base)) {
    return new Set(base);
  }
  if (Array.isArray(base))
    return Array.prototype.slice.call(base);
  const isPlain = isPlainObject(base);
  if (strict === true || strict === "class_only" && !isPlain) {
    const descriptors = Object.getOwnPropertyDescriptors(base);
    delete descriptors[DRAFT_STATE];
    let keys = Reflect.ownKeys(descriptors);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const desc = descriptors[key];
      if (desc.writable === false) {
        desc.writable = true;
        desc.configurable = true;
      }
      if (desc.get || desc.set)
        descriptors[key] = {
          configurable: true,
          writable: true,
          // could live with !!desc.set as well here...
          enumerable: desc.enumerable,
          value: base[key]
        };
    }
    return Object.create(getPrototypeOf(base), descriptors);
  } else {
    const proto = getPrototypeOf(base);
    if (proto !== null && isPlain) {
      return { ...base };
    }
    const obj = Object.create(proto);
    return Object.assign(obj, base);
  }
}
function freeze(obj, deep = false) {
  if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj))
    return obj;
  if (getArchtype(obj) > 1) {
    Object.defineProperties(obj, {
      set: dontMutateMethodOverride,
      add: dontMutateMethodOverride,
      clear: dontMutateMethodOverride,
      delete: dontMutateMethodOverride
    });
  }
  Object.freeze(obj);
  if (deep)
    Object.values(obj).forEach((value) => freeze(value, true));
  return obj;
}
function dontMutateFrozenCollections() {
  die(2);
}
var dontMutateMethodOverride = {
  value: dontMutateFrozenCollections
};
function isFrozen(obj) {
  if (obj === null || typeof obj !== "object")
    return true;
  return Object.isFrozen(obj);
}
var plugins = {};
function getPlugin(pluginKey) {
  const plugin = plugins[pluginKey];
  if (!plugin) {
    die(0, pluginKey);
  }
  return plugin;
}
var currentScope;
function getCurrentScope() {
  return currentScope;
}
function createScope(parent_, immer_) {
  return {
    drafts_: [],
    parent_,
    immer_,
    // Whenever the modified draft contains a draft from another scope, we
    // need to prevent auto-freezing so the unowned draft can be finalized.
    canAutoFreeze_: true,
    unfinalizedDrafts_: 0
  };
}
function usePatchesInScope(scope, patchListener) {
  if (patchListener) {
    getPlugin("Patches");
    scope.patches_ = [];
    scope.inversePatches_ = [];
    scope.patchListener_ = patchListener;
  }
}
function revokeScope(scope) {
  leaveScope(scope);
  scope.drafts_.forEach(revokeDraft);
  scope.drafts_ = null;
}
function leaveScope(scope) {
  if (scope === currentScope) {
    currentScope = scope.parent_;
  }
}
function enterScope(immer2) {
  return currentScope = createScope(currentScope, immer2);
}
function revokeDraft(draft) {
  const state = draft[DRAFT_STATE];
  if (state.type_ === 0 || state.type_ === 1)
    state.revoke_();
  else
    state.revoked_ = true;
}
function processResult(result, scope) {
  scope.unfinalizedDrafts_ = scope.drafts_.length;
  const baseDraft = scope.drafts_[0];
  const isReplaced = result !== void 0 && result !== baseDraft;
  if (isReplaced) {
    if (baseDraft[DRAFT_STATE].modified_) {
      revokeScope(scope);
      die(4);
    }
    if (isDraftable(result)) {
      result = finalize(scope, result);
      if (!scope.parent_)
        maybeFreeze(scope, result);
    }
    if (scope.patches_) {
      getPlugin("Patches").generateReplacementPatches_(
        baseDraft[DRAFT_STATE].base_,
        result,
        scope.patches_,
        scope.inversePatches_
      );
    }
  } else {
    result = finalize(scope, baseDraft, []);
  }
  revokeScope(scope);
  if (scope.patches_) {
    scope.patchListener_(scope.patches_, scope.inversePatches_);
  }
  return result !== NOTHING ? result : void 0;
}
function finalize(rootScope, value, path) {
  if (isFrozen(value))
    return value;
  const useStrictIteration = rootScope.immer_.shouldUseStrictIteration();
  const state = value[DRAFT_STATE];
  if (!state) {
    each(
      value,
      (key, childValue) => finalizeProperty(rootScope, state, value, key, childValue, path),
      useStrictIteration
    );
    return value;
  }
  if (state.scope_ !== rootScope)
    return value;
  if (!state.modified_) {
    maybeFreeze(rootScope, state.base_, true);
    return state.base_;
  }
  if (!state.finalized_) {
    state.finalized_ = true;
    state.scope_.unfinalizedDrafts_--;
    const result = state.copy_;
    let resultEach = result;
    let isSet2 = false;
    if (state.type_ === 3) {
      resultEach = new Set(result);
      result.clear();
      isSet2 = true;
    }
    each(
      resultEach,
      (key, childValue) => finalizeProperty(
        rootScope,
        state,
        result,
        key,
        childValue,
        path,
        isSet2
      ),
      useStrictIteration
    );
    maybeFreeze(rootScope, result, false);
    if (path && rootScope.patches_) {
      getPlugin("Patches").generatePatches_(
        state,
        path,
        rootScope.patches_,
        rootScope.inversePatches_
      );
    }
  }
  return state.copy_;
}
function finalizeProperty(rootScope, parentState, targetObject, prop, childValue, rootPath, targetIsSet) {
  if (childValue == null) {
    return;
  }
  if (typeof childValue !== "object" && !targetIsSet) {
    return;
  }
  const childIsFrozen = isFrozen(childValue);
  if (childIsFrozen && !targetIsSet) {
    return;
  }
  if (childValue === targetObject)
    die(5);
  if (isDraft(childValue)) {
    const path = rootPath && parentState && parentState.type_ !== 3 && // Set objects are atomic since they have no keys.
    !has(parentState.assigned_, prop) ? rootPath.concat(prop) : void 0;
    const res = finalize(rootScope, childValue, path);
    set(targetObject, prop, res);
    if (isDraft(res)) {
      rootScope.canAutoFreeze_ = false;
    } else
      return;
  } else if (targetIsSet) {
    targetObject.add(childValue);
  }
  if (isDraftable(childValue) && !childIsFrozen) {
    if (!rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1) {
      return;
    }
    if (parentState && parentState.base_ && parentState.base_[prop] === childValue && childIsFrozen) {
      return;
    }
    finalize(rootScope, childValue);
    if ((!parentState || !parentState.scope_.parent_) && typeof prop !== "symbol" && (isMap(targetObject) ? targetObject.has(prop) : Object.prototype.propertyIsEnumerable.call(targetObject, prop)))
      maybeFreeze(rootScope, childValue);
  }
}
function maybeFreeze(scope, value, deep = false) {
  if (!scope.parent_ && scope.immer_.autoFreeze_ && scope.canAutoFreeze_) {
    freeze(value, deep);
  }
}
function createProxyProxy(base, parent) {
  const isArray = Array.isArray(base);
  const state = {
    type_: isArray ? 1 : 0,
    // Track which produce call this is associated with.
    scope_: parent ? parent.scope_ : getCurrentScope(),
    // True for both shallow and deep changes.
    modified_: false,
    // Used during finalization.
    finalized_: false,
    // Track which properties have been assigned (true) or deleted (false).
    assigned_: {},
    // The parent draft state.
    parent_: parent,
    // The base state.
    base_: base,
    // The base proxy.
    draft_: null,
    // set below
    // The base copy with any updated values.
    copy_: null,
    // Called by the `produce` function.
    revoke_: null,
    isManual_: false
  };
  let target = state;
  let traps = objectTraps;
  if (isArray) {
    target = [state];
    traps = arrayTraps;
  }
  const { revoke, proxy } = Proxy.revocable(target, traps);
  state.draft_ = proxy;
  state.revoke_ = revoke;
  return proxy;
}
var objectTraps = {
  get(state, prop) {
    if (prop === DRAFT_STATE)
      return state;
    const source = latest(state);
    if (!has(source, prop)) {
      return readPropFromProto(state, source, prop);
    }
    const value = source[prop];
    if (state.finalized_ || !isDraftable(value)) {
      return value;
    }
    if (value === peek(state.base_, prop)) {
      prepareCopy(state);
      return state.copy_[prop] = createProxy(value, state);
    }
    return value;
  },
  has(state, prop) {
    return prop in latest(state);
  },
  ownKeys(state) {
    return Reflect.ownKeys(latest(state));
  },
  set(state, prop, value) {
    const desc = getDescriptorFromProto(latest(state), prop);
    if (desc?.set) {
      desc.set.call(state.draft_, value);
      return true;
    }
    if (!state.modified_) {
      const current2 = peek(latest(state), prop);
      const currentState = current2?.[DRAFT_STATE];
      if (currentState && currentState.base_ === value) {
        state.copy_[prop] = value;
        state.assigned_[prop] = false;
        return true;
      }
      if (is(value, current2) && (value !== void 0 || has(state.base_, prop)))
        return true;
      prepareCopy(state);
      markChanged(state);
    }
    if (state.copy_[prop] === value && // special case: handle new props with value 'undefined'
    (value !== void 0 || prop in state.copy_) || // special case: NaN
    Number.isNaN(value) && Number.isNaN(state.copy_[prop]))
      return true;
    state.copy_[prop] = value;
    state.assigned_[prop] = true;
    return true;
  },
  deleteProperty(state, prop) {
    if (peek(state.base_, prop) !== void 0 || prop in state.base_) {
      state.assigned_[prop] = false;
      prepareCopy(state);
      markChanged(state);
    } else {
      delete state.assigned_[prop];
    }
    if (state.copy_) {
      delete state.copy_[prop];
    }
    return true;
  },
  // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.
  getOwnPropertyDescriptor(state, prop) {
    const owner = latest(state);
    const desc = Reflect.getOwnPropertyDescriptor(owner, prop);
    if (!desc)
      return desc;
    return {
      writable: true,
      configurable: state.type_ !== 1 || prop !== "length",
      enumerable: desc.enumerable,
      value: owner[prop]
    };
  },
  defineProperty() {
    die(11);
  },
  getPrototypeOf(state) {
    return getPrototypeOf(state.base_);
  },
  setPrototypeOf() {
    die(12);
  }
};
var arrayTraps = {};
each(objectTraps, (key, fn) => {
  arrayTraps[key] = function() {
    arguments[0] = arguments[0][0];
    return fn.apply(this, arguments);
  };
});
arrayTraps.deleteProperty = function(state, prop) {
  if (isNaN(parseInt(prop)))
    die(13);
  return arrayTraps.set.call(this, state, prop, void 0);
};
arrayTraps.set = function(state, prop, value) {
  if (prop !== "length" && isNaN(parseInt(prop)))
    die(14);
  return objectTraps.set.call(this, state[0], prop, value, state[0]);
};
function peek(draft, prop) {
  const state = draft[DRAFT_STATE];
  const source = state ? latest(state) : draft;
  return source[prop];
}
function readPropFromProto(state, source, prop) {
  const desc = getDescriptorFromProto(source, prop);
  return desc ? `value` in desc ? desc.value : (
    // This is a very special case, if the prop is a getter defined by the
    // prototype, we should invoke it with the draft as context!
    desc.get?.call(state.draft_)
  ) : void 0;
}
function getDescriptorFromProto(source, prop) {
  if (!(prop in source))
    return void 0;
  let proto = getPrototypeOf(source);
  while (proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (desc)
      return desc;
    proto = getPrototypeOf(proto);
  }
  return void 0;
}
function markChanged(state) {
  if (!state.modified_) {
    state.modified_ = true;
    if (state.parent_) {
      markChanged(state.parent_);
    }
  }
}
function prepareCopy(state) {
  if (!state.copy_) {
    state.copy_ = shallowCopy(
      state.base_,
      state.scope_.immer_.useStrictShallowCopy_
    );
  }
}
var Immer2 = class {
  constructor(config2) {
    this.autoFreeze_ = true;
    this.useStrictShallowCopy_ = false;
    this.useStrictIteration_ = true;
    this.produce = (base, recipe, patchListener) => {
      if (typeof base === "function" && typeof recipe !== "function") {
        const defaultBase = recipe;
        recipe = base;
        const self = this;
        return function curriedProduce(base2 = defaultBase, ...args) {
          return self.produce(base2, (draft) => recipe.call(this, draft, ...args));
        };
      }
      if (typeof recipe !== "function")
        die(6);
      if (patchListener !== void 0 && typeof patchListener !== "function")
        die(7);
      let result;
      if (isDraftable(base)) {
        const scope = enterScope(this);
        const proxy = createProxy(base, void 0);
        let hasError = true;
        try {
          result = recipe(proxy);
          hasError = false;
        } finally {
          if (hasError)
            revokeScope(scope);
          else
            leaveScope(scope);
        }
        usePatchesInScope(scope, patchListener);
        return processResult(result, scope);
      } else if (!base || typeof base !== "object") {
        result = recipe(base);
        if (result === void 0)
          result = base;
        if (result === NOTHING)
          result = void 0;
        if (this.autoFreeze_)
          freeze(result, true);
        if (patchListener) {
          const p = [];
          const ip = [];
          getPlugin("Patches").generateReplacementPatches_(base, result, p, ip);
          patchListener(p, ip);
        }
        return result;
      } else
        die(1, base);
    };
    this.produceWithPatches = (base, recipe) => {
      if (typeof base === "function") {
        return (state, ...args) => this.produceWithPatches(state, (draft) => base(draft, ...args));
      }
      let patches, inversePatches;
      const result = this.produce(base, recipe, (p, ip) => {
        patches = p;
        inversePatches = ip;
      });
      return [result, patches, inversePatches];
    };
    if (typeof config2?.autoFreeze === "boolean")
      this.setAutoFreeze(config2.autoFreeze);
    if (typeof config2?.useStrictShallowCopy === "boolean")
      this.setUseStrictShallowCopy(config2.useStrictShallowCopy);
    if (typeof config2?.useStrictIteration === "boolean")
      this.setUseStrictIteration(config2.useStrictIteration);
  }
  createDraft(base) {
    if (!isDraftable(base))
      die(8);
    if (isDraft(base))
      base = current(base);
    const scope = enterScope(this);
    const proxy = createProxy(base, void 0);
    proxy[DRAFT_STATE].isManual_ = true;
    leaveScope(scope);
    return proxy;
  }
  finishDraft(draft, patchListener) {
    const state = draft && draft[DRAFT_STATE];
    if (!state || !state.isManual_)
      die(9);
    const { scope_: scope } = state;
    usePatchesInScope(scope, patchListener);
    return processResult(void 0, scope);
  }
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is enabled.
   */
  setAutoFreeze(value) {
    this.autoFreeze_ = value;
  }
  /**
   * Pass true to enable strict shallow copy.
   *
   * By default, immer does not copy the object descriptors such as getter, setter and non-enumrable properties.
   */
  setUseStrictShallowCopy(value) {
    this.useStrictShallowCopy_ = value;
  }
  /**
   * Pass false to use faster iteration that skips non-enumerable properties
   * but still handles symbols for compatibility.
   *
   * By default, strict iteration is enabled (includes all own properties).
   */
  setUseStrictIteration(value) {
    this.useStrictIteration_ = value;
  }
  shouldUseStrictIteration() {
    return this.useStrictIteration_;
  }
  applyPatches(base, patches) {
    let i;
    for (i = patches.length - 1; i >= 0; i--) {
      const patch = patches[i];
      if (patch.path.length === 0 && patch.op === "replace") {
        base = patch.value;
        break;
      }
    }
    if (i > -1) {
      patches = patches.slice(i + 1);
    }
    const applyPatchesImpl = getPlugin("Patches").applyPatches_;
    if (isDraft(base)) {
      return applyPatchesImpl(base, patches);
    }
    return this.produce(
      base,
      (draft) => applyPatchesImpl(draft, patches)
    );
  }
};
function createProxy(value, parent) {
  const draft = isMap(value) ? getPlugin("MapSet").proxyMap_(value, parent) : isSet(value) ? getPlugin("MapSet").proxySet_(value, parent) : createProxyProxy(value, parent);
  const scope = parent ? parent.scope_ : getCurrentScope();
  scope.drafts_.push(draft);
  return draft;
}
function current(value) {
  if (!isDraft(value))
    die(10, value);
  return currentImpl(value);
}
function currentImpl(value) {
  if (!isDraftable(value) || isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  let copy;
  let strict = true;
  if (state) {
    if (!state.modified_)
      return state.base_;
    state.finalized_ = true;
    copy = shallowCopy(value, state.scope_.immer_.useStrictShallowCopy_);
    strict = state.scope_.immer_.shouldUseStrictIteration();
  } else {
    copy = shallowCopy(value, true);
  }
  each(
    copy,
    (key, childValue) => {
      set(copy, key, currentImpl(childValue));
    },
    strict
  );
  if (state) {
    state.finalized_ = false;
  }
  return copy;
}
var immer = new Immer2();
var produce = immer.produce;

// packages/dsh-plugin/node_modules/.pnpm/@deepseek-ai+dsh-client-sto_46a6f23576888960afa65170afd9af65/node_modules/@deepseek-ai/dsh-client-store/lib/index.js
function notifySubscribers(listeners, label, ...args) {
  for (const listener of [...listeners]) try {
    listener(...args);
  } catch (error2) {
    console.error(`${label} subscriber failed:`, error2);
  }
}
function rafBatch(notify) {
  const schedule = typeof requestAnimationFrame === "function" ? (fn) => {
    requestAnimationFrame(() => {
      fn();
    });
  } : (fn) => {
    queueMicrotask(fn);
  };
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      notify();
    });
  };
}
function createSnapshotStore(init, opts) {
  const withSelector = subscribeWithSelector(() => init);
  const api = createStore()(withSelector);
  if (opts?.persist) attachPersistence(api, opts.persist.name);
  let subscribe = (fn) => api.subscribe(() => {
    notifySubscribers([fn], "[client-store]");
  });
  if (opts?.flush === "raf") {
    const listeners = /* @__PURE__ */ new Set();
    const flush = rafBatch(() => {
      notifySubscribers(listeners, "[client-store]");
    });
    api.subscribe(flush);
    subscribe = (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    };
  }
  return {
    getSnapshot: () => api.getState(),
    subscribe: (fn) => subscribe(fn),
    update: (mutator) => {
      api.setState(produce(api.getState(), (draft) => {
        mutator(draft);
      }), true);
    },
    set: (next) => {
      api.setState(devFreeze(next), true);
    }
  };
}
function attachPersistence(api, name) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(name);
    if (raw !== null) api.setState(devFreeze(JSON.parse(raw)), true);
  } catch (error2) {
    console.error(`snapshot store '${name}' rehydration failed:`, error2);
  }
  api.subscribe((state) => {
    try {
      localStorage.setItem(name, JSON.stringify(state));
    } catch (error2) {
      console.error(`snapshot store '${name}' persistence failed:`, error2);
    }
  });
}
function devFreeze(value) {
  return freeze(value, true);
}

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
var _a;
// @__NO_SIDE_EFFECTS__
function $constructor(name, initializer3, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer3(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a3;
    const inst = params?.Parent ? new Definition() : this;
    init(inst, def);
    (_a3 = inst._zod).deferred ?? (_a3.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $brand = Symbol("zod_brand");
var $ZodAsyncError = class extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
};
var $ZodEncodeError = class extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
};
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
var util_exports = {};
__export(util_exports, {
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
  Class: () => Class,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  aborted: () => aborted,
  allowsEval: () => allowsEval,
  assert: () => assert,
  assertEqual: () => assertEqual,
  assertIs: () => assertIs,
  assertNever: () => assertNever,
  assertNotEqual: () => assertNotEqual,
  assignProp: () => assignProp,
  base64ToUint8Array: () => base64ToUint8Array,
  base64urlToUint8Array: () => base64urlToUint8Array,
  cached: () => cached,
  captureStackTrace: () => captureStackTrace,
  cleanEnum: () => cleanEnum,
  cleanRegex: () => cleanRegex,
  clone: () => clone,
  cloneDef: () => cloneDef,
  createTransparentProxy: () => createTransparentProxy,
  defineLazy: () => defineLazy,
  esc: () => esc,
  escapeRegex: () => escapeRegex,
  explicitlyAborted: () => explicitlyAborted,
  extend: () => extend,
  finalizeIssue: () => finalizeIssue,
  floatSafeRemainder: () => floatSafeRemainder,
  getElementAtPath: () => getElementAtPath,
  getEnumValues: () => getEnumValues,
  getLengthableOrigin: () => getLengthableOrigin,
  getParsedType: () => getParsedType,
  getSizableOrigin: () => getSizableOrigin,
  hexToUint8Array: () => hexToUint8Array,
  isObject: () => isObject,
  isPlainObject: () => isPlainObject2,
  issue: () => issue,
  joinValues: () => joinValues,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  merge: () => merge,
  mergeDefs: () => mergeDefs,
  normalizeParams: () => normalizeParams,
  nullish: () => nullish,
  numKeys: () => numKeys,
  objectClone: () => objectClone,
  omit: () => omit,
  optionalKeys: () => optionalKeys,
  parsedType: () => parsedType,
  partial: () => partial,
  pick: () => pick,
  prefixIssues: () => prefixIssues,
  primitiveTypes: () => primitiveTypes,
  promiseAllObject: () => promiseAllObject,
  propertyKeyTypes: () => propertyKeyTypes,
  randomString: () => randomString,
  required: () => required,
  safeExtend: () => safeExtend,
  shallowClone: () => shallowClone,
  slugify: () => slugify,
  stringifyPrimitive: () => stringifyPrimitive,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToHex: () => uint8ArrayToHex,
  unwrapMessage: () => unwrapMessage
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {
}
function assertNever(_x) {
  throw new Error("Unexpected value in exhaustive check");
}
function assert(_) {
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array2, separator = "|") {
  return array2.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set2 = false;
  return {
    get value() {
      if (!set2) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
var EVALUATING = /* @__PURE__ */ Symbol("evaluating");
function defineLazy(object2, key, getter) {
  let value = void 0;
  Object.defineProperty(object2, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
  if (!path)
    return obj;
  return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0; i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = /* @__PURE__ */ cached(() => {
  if (globalConfig.jitless) {
    return false;
  }
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject2(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject2(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t}`);
  }
};
var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
var primitiveTypes = /* @__PURE__ */ new Set([
  "string",
  "number",
  "bigint",
  "boolean",
  "symbol",
  "undefined"
]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor2) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor2);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
var BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject2(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject2(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class2, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class2 ? new Class2({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class2 ? new Class2({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class2, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class2({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class2({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a3;
    (_a3 = iss).path ?? (_a3.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  rest.path ?? (rest.path = []);
  rest.message = message;
  if (ctx?.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base642) {
  const binaryString = atob(base642);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url2) {
  const base642 = base64url2.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base642.length % 4) % 4);
  return base64ToUint8Array(base642 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var Class = class {
  constructor(..._args) {
  }
};

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error2.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error3, path = []) => {
    for (const issue2 of error3.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }
  };
  processError(error2);
  return fieldErrors;
}

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
var _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
var _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
var _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
var _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
var cuid = /^[cC][0-9a-z]{6,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var uuid = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^[A-Za-z0-9_-]*$/;
var httpProtocol = /^https?$/;
var e164 = /^\+[1-9]\d{6,14}$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time3 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time3}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?$/;
var boolean = /^(?:true|false)$/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a3;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a3 = inst._zod).onattach ?? (_a3.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a3;
    (_a3 = inst2._zod.bag).multipleOf ?? (_a3.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a3;
  $ZodCheck.init(inst, def);
  (_a3 = inst._zod.def).when ?? (_a3.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a3;
  $ZodCheck.init(inst, def);
  (_a3 = inst._zod.def).when ?? (_a3.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a3;
  $ZodCheck.init(inst, def);
  (_a3 = inst._zod.def).when ?? (_a3.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a3, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a3 = inst._zod).check ?? (_a3.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
var Doc = class {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split("\n").filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join("\n"));
  }
};

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 4,
  patch: 3
};

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a3;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a3 = inst._zod).deferred ?? (_a3.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      if (!def.normalize && def.protocol?.source === httpProtocol.source) {
        if (!/^https?:\/\//i.test(trimmed)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid URL format",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
      }
      const url = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date);
  $ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration);
  $ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error();
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error();
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error();
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error();
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
  const isPresent = key in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (key === "__proto__")
      continue;
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalIn = el._zod.optin === "optional";
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = /* @__PURE__ */ Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      const schema = shape[key];
      const isOptionalIn = schema?._zod?.optin === "optional";
      const isOptionalOut = schema?._zod?.optout === "optional";
      doc.write(`const ${id} = ${parseStr(key)};`);
      if (isOptionalIn && isOptionalOut) {
        doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }

        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }

      `);
      } else if (!isOptionalIn) {
        doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }

        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }

      `);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval2 = allowsEval;
  const fastEnabled = jit && allowsEval2.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject2(a) && isPlainObject2(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        payload.fallback = true;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    payload.fallback = true;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (input === void 0 && (result.issues.length || result.fallback)) {
    return { issues: [], value: void 0 };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const input = payload.value;
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, input));
      return handleOptionalResult(result, input);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
          payload.fallback = true;
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
      payload.fallback = true;
    }
    return payload;
  };
});
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues, fallback: left.fallback }, ctx);
}
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
  defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/locales/en.js
var error = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    // Compatibility: "nan" -> "NaN" for display
    nan: "NaN"
    // All other type names omitted - they fall back to raw values via ?? operator
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        return `Invalid input: expected ${expected}, received ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        if (issue2.options && Array.isArray(issue2.options) && issue2.options.length > 0) {
          const opts = issue2.options.map((o) => `'${o}'`).join(" | ");
          return `Invalid discriminator value. Expected ${opts}`;
        }
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
function en_default() {
  return {
    localeError: error()
  };
}

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
var _a2;
var $output = Symbol("ZodOutput");
var $input = Symbol("ZodInput");
var $ZodRegistry = class {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema, ..._meta) {
    const meta2 = _meta[0];
    this._map.set(schema, meta2);
    if (meta2 && typeof meta2 === "object" && "id" in meta2) {
      this._idmap.set(meta2.id, schema);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema) {
    const meta2 = this._map.get(schema);
    if (meta2 && typeof meta2 === "object" && "id" in meta2) {
      this._idmap.delete(meta2.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : void 0;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
};
function registry() {
  return new $ZodRegistry();
}
(_a2 = globalThis).__zod_globalRegistry ?? (_a2.__zod_globalRegistry = registry());
var globalRegistry = globalThis.__zod_globalRegistry;

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
// @__NO_SIDE_EFFECTS__
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {
    }),
    io: params?.io ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    external: params?.external ?? void 0
  };
}
function process2(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a3;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process2(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta2 = ctx.metadataRegistry.get(schema);
  if (meta2)
    Object.assign(result.schema, meta2);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a3 = result.schema).default ?? (_a3.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize2(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {
  } else {
  }
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== void 0 && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      if (seen.def.id === seen.defId)
        delete seen.def.id;
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) {
  } else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize2(ctx, schema);
};
var createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize2(ctx, schema);
};

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
var formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
};
var stringProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  json.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minLength = minimum;
  if (typeof maximum === "number")
    json.maxLength = maximum;
  if (format) {
    json.format = formatMap[format] ?? format;
    if (json.format === "")
      delete json.format;
    if (format === "time") {
      delete json.format;
    }
  }
  if (contentEncoding)
    json.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
var numberProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json.type = "integer";
  else
    json.type = "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else {
      json.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else {
      json.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json.maximum = maximum;
  }
  if (typeof multipleOf === "number")
    json.multipleOf = multipleOf;
};
var booleanProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
};
var neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
};
var unknownProcessor = (_schema, _ctx, _json, _params) => {
};
var enumProcessor = (schema, _ctx, json, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json.type = "number";
  if (values.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values;
};
var customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
var transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
var arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = process2(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
};
var objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  json.properties = {};
  const shape = def.shape;
  for (const key in shape) {
    json.properties[key] = process2(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === void 0;
    } else {
      return v.optout === void 0;
    }
  }));
  if (requiredKeys.size > 0) {
    json.required = Array.from(requiredKeys);
  }
  if (def.catchall?._zod.def.type === "never") {
    json.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json.additionalProperties = false;
  } else if (def.catchall) {
    json.additionalProperties = process2(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
var unionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process2(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
};
var intersectionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const a = process2(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process2(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json.allOf = allOf;
};
var nullableProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const inner = process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
};
var nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var defaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
var prefaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
var catchProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json.default = catchValue;
};
var pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
var readonlyProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
};
var optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date2(params) {
  return _isoDate(ZodISODate, params);
}
var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
      // enumerable: false,
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
      // enumerable: false,
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
      // enumerable: false,
    }
  });
};
var ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer2, {
  Parent: Error
});

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js
var parse2 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode = /* @__PURE__ */ _encode(ZodRealError);
var decode = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
var _installedGroups = /* @__PURE__ */ new WeakMap();
function _installLazyMethods(inst, group, methods) {
  const proto = Object.getPrototypeOf(inst);
  let installed = _installedGroups.get(proto);
  if (!installed) {
    installed = /* @__PURE__ */ new Set();
    _installedGroups.set(proto, installed);
  }
  if (installed.has(group))
    return;
  installed.add(group);
  for (const key in methods) {
    const fn = methods[key];
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        const bound = fn.bind(this);
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: bound
        });
        return bound;
      },
      set(v) {
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: v
        });
      }
    });
  }
}
var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.parse = (data, params) => parse2(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse2(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode(inst, data, params);
  inst.decode = (data, params) => decode(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
  _installLazyMethods(inst, "ZodType", {
    check(...chks) {
      const def2 = this.def;
      return this.clone(util_exports.mergeDefs(def2, {
        checks: [
          ...def2.checks ?? [],
          ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), { parent: true });
    },
    with(...chks) {
      return this.check(...chks);
    },
    clone(def2, params) {
      return clone(this, def2, params);
    },
    brand() {
      return this;
    },
    register(reg, meta2) {
      reg.add(this, meta2);
      return this;
    },
    refine(check, params) {
      return this.check(refine(check, params));
    },
    superRefine(refinement, params) {
      return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
      return this.check(_overwrite(fn));
    },
    optional() {
      return optional(this);
    },
    exactOptional() {
      return exactOptional(this);
    },
    nullable() {
      return nullable(this);
    },
    nullish() {
      return optional(nullable(this));
    },
    nonoptional(params) {
      return nonoptional(this, params);
    },
    array() {
      return array(this);
    },
    or(arg) {
      return union([this, arg]);
    },
    and(arg) {
      return intersection(this, arg);
    },
    transform(tx) {
      return pipe(this, transform(tx));
    },
    default(d) {
      return _default(this, d);
    },
    prefault(d) {
      return prefault(this, d);
    },
    catch(params) {
      return _catch(this, params);
    },
    pipe(target) {
      return pipe(this, target);
    },
    readonly() {
      return readonly(this);
    },
    describe(description) {
      const cl = this.clone();
      globalRegistry.add(cl, { description });
      return cl;
    },
    meta(...args) {
      if (args.length === 0)
        return globalRegistry.get(this);
      const cl = this.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    },
    isOptional() {
      return this.safeParse(void 0).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(fn) {
      return fn(this);
    }
  });
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  return inst;
});
var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  _installLazyMethods(inst, "_ZodString", {
    regex(...args) {
      return this.check(_regex(...args));
    },
    includes(...args) {
      return this.check(_includes(...args));
    },
    startsWith(...args) {
      return this.check(_startsWith(...args));
    },
    endsWith(...args) {
      return this.check(_endsWith(...args));
    },
    min(...args) {
      return this.check(_minLength(...args));
    },
    max(...args) {
      return this.check(_maxLength(...args));
    },
    length(...args) {
      return this.check(_length(...args));
    },
    nonempty(...args) {
      return this.check(_minLength(1, ...args));
    },
    lowercase(params) {
      return this.check(_lowercase(params));
    },
    uppercase(params) {
      return this.check(_uppercase(params));
    },
    trim() {
      return this.check(_trim());
    },
    normalize(...args) {
      return this.check(_normalize(...args));
    },
    toLowerCase() {
      return this.check(_toLowerCase());
    },
    toUpperCase() {
      return this.check(_toUpperCase());
    },
    slugify() {
      return this.check(_slugify());
    }
  });
});
var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(_email(ZodEmail, params));
  inst.url = (params) => inst.check(_url(ZodURL, params));
  inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(_xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(_e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime2(params));
  inst.date = (params) => inst.check(date2(params));
  inst.time = (params) => inst.check(time2(params));
  inst.duration = (params) => inst.check(duration2(params));
});
function string2(params) {
  return _string(ZodString, params);
}
var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
  _installLazyMethods(inst, "ZodNumber", {
    gt(value, params) {
      return this.check(_gt(value, params));
    },
    gte(value, params) {
      return this.check(_gte(value, params));
    },
    min(value, params) {
      return this.check(_gte(value, params));
    },
    lt(value, params) {
      return this.check(_lt(value, params));
    },
    lte(value, params) {
      return this.check(_lte(value, params));
    },
    max(value, params) {
      return this.check(_lte(value, params));
    },
    int(params) {
      return this.check(int(params));
    },
    safe(params) {
      return this.check(int(params));
    },
    positive(params) {
      return this.check(_gt(0, params));
    },
    nonnegative(params) {
      return this.check(_gte(0, params));
    },
    negative(params) {
      return this.check(_lt(0, params));
    },
    nonpositive(params) {
      return this.check(_lte(0, params));
    },
    multipleOf(value, params) {
      return this.check(_multipleOf(value, params));
    },
    step(value, params) {
      return this.check(_multipleOf(value, params));
    },
    finite() {
      return this;
    }
  });
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
});
function unknown() {
  return _unknown(ZodUnknown);
}
var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
  return _never(ZodNever, params);
}
var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
  inst.element = def.element;
  _installLazyMethods(inst, "ZodArray", {
    min(n, params) {
      return this.check(_minLength(n, params));
    },
    nonempty(params) {
      return this.check(_minLength(1, params));
    },
    max(n, params) {
      return this.check(_maxLength(n, params));
    },
    length(n, params) {
      return this.check(_length(n, params));
    },
    unwrap() {
      return this.element;
    }
  });
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
  util_exports.defineLazy(inst, "shape", () => {
    return def.shape;
  });
  _installLazyMethods(inst, "ZodObject", {
    keyof() {
      return _enum(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
      return this.clone({ ...this._zod.def, catchall });
    },
    passthrough() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    loose() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    strict() {
      return this.clone({ ...this._zod.def, catchall: never() });
    },
    strip() {
      return this.clone({ ...this._zod.def, catchall: void 0 });
    },
    extend(incoming) {
      return util_exports.extend(this, incoming);
    },
    safeExtend(incoming) {
      return util_exports.safeExtend(this, incoming);
    },
    merge(other) {
      return util_exports.merge(this, other);
    },
    pick(mask) {
      return util_exports.pick(this, mask);
    },
    omit(mask) {
      return util_exports.omit(this, mask);
    },
    partial(...args) {
      return util_exports.partial(ZodOptional, this, args[0]);
    },
    required(...args) {
      return util_exports.required(ZodNonOptional, this, args[0]);
    }
  });
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...util_exports.normalizeParams(params)
  };
  return new ZodObject(def);
}
var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...util_exports.normalizeParams(params)
  });
}
var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...util_exports.normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...util_exports.normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(util_exports.issue(issue2, payload.value, def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(util_exports.issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        payload.fallback = true;
        return payload;
      });
    }
    payload.value = output;
    payload.fallback = true;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
var ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return _superRefine(fn, params);
}

// packages/dsh-plugin/node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/external.js
config(en_default());

// packages/dsh-plugin/src/dockyard-typert-shared.mjs
if (!config().localeError) config(en_default());
var z = { boolean: boolean2, enum: _enum, number: number2, object, string: string2, unknown };
var PACKAGE = "@dockyard-dsh/plugin";
var typeSymbol = (name) => `${PACKAGE}/client#${name}`;
var codec = (schema, name) => ({
  mode: "strict",
  typeSymbol: typeSymbol(name),
  schema,
  // dsh 0.1.6 requires a lazy schema factory.
  create: () => schema
});
var providerRequest = z.object({
  providerId: z.string().min(1).optional()
});
var catalogRequest = providerRequest.extend({
  force: z.boolean().optional()
});
var loginRequest = z.object({
  providerId: z.string().min(1),
  openBrowser: z.boolean().optional()
});
var pollRequest = z.object({
  providerId: z.string().min(1),
  sessionId: z.string().min(1)
});
var authorizationCodeRequest = z.object({
  providerId: z.string().min(1),
  sessionId: z.string().min(1),
  code: z.string().min(1)
});
var addRequest = z.object({
  providerId: z.string().min(1),
  candidateId: z.string().min(1).optional()
});
var policyRequest = z.object({
  providerId: z.string().min(1),
  policy: z.string().min(1),
  defaultAccountId: z.string().min(1).optional()
});
var useRequest = z.object({
  providerId: z.string().min(1),
  accountId: z.string().min(1)
});
var removeRequest = z.object({
  providerId: z.string().min(1),
  accountId: z.string().min(1)
});
var nativeKeyProviderRequest = z.object({
  providerId: z.string().min(1)
});
var nativeKeyRegisterRequest = z.object({
  providerId: z.string().min(1),
  ref: z.string().min(1),
  label: z.string().max(120).optional()
});
var nativeKeyRefRequest = z.object({
  providerId: z.string().min(1),
  ref: z.string().min(1)
});
var nativeKeyPolicyRequest = z.object({
  providerId: z.string().min(1),
  policy: z.enum(["manual", "round_robin", "failover"])
});
var contextWindowRequest = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  accountId: z.string().min(1).optional(),
  keyRef: z.string().min(1).optional()
});
var contextWindowSetRequest = contextWindowRequest.extend({
  value: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable()
});
function requestParameter(schema, name) {
  return {
    name: "request",
    wire: "request",
    source: "json",
    codec: codec(schema, name)
  };
}
function descriptor(method, schema, typeName) {
  return {
    id: `${PACKAGE}#dockyard/${method}`,
    service: "dockyardRemote",
    namespace: "dockyard",
    method,
    invocation: { kind: "direct" },
    parameters: schema === void 0 ? [] : [schema],
    result: codec(z.unknown(), typeName)
  };
}
var TYPERT_DESCRIPTORS = Object.freeze([
  descriptor("snapshot", void 0, "DockyardSnapshot"),
  descriptor("refresh", requestParameter(providerRequest, "DockyardProviderRequest"), "DockyardRefreshResult"),
  descriptor("catalog", requestParameter(catalogRequest, "DockyardCatalogRequest"), "DockyardCatalogResult"),
  descriptor("scan", requestParameter(providerRequest, "DockyardProviderRequest"), "DockyardScanResult"),
  descriptor("add", requestParameter(addRequest, "DockyardAddRequest"), "DockyardAddResult"),
  descriptor("login", requestParameter(loginRequest, "DockyardLoginRequest"), "DockyardLoginResult"),
  descriptor("poll", requestParameter(pollRequest, "DockyardPollRequest"), "DockyardPollResult"),
  descriptor("submitAuthorizationCode", requestParameter(authorizationCodeRequest, "DockyardAuthorizationCodeRequest"), "DockyardAuthorizationCodeResult"),
  descriptor("cancel", requestParameter(pollRequest, "DockyardPollRequest"), "DockyardCancelResult"),
  descriptor("setPolicy", requestParameter(policyRequest, "DockyardPolicyRequest"), "DockyardPolicyResult"),
  descriptor("use", requestParameter(useRequest, "DockyardUseRequest"), "DockyardUseResult"),
  descriptor("removeAccount", requestParameter(removeRequest, "DockyardRemoveRequest"), "DockyardRemoveResult"),
  descriptor("nativeKeyStatus", requestParameter(nativeKeyProviderRequest, "DockyardNativeKeyProviderRequest"), "DockyardNativeKeyStatus"),
  descriptor("nativeKeyRefresh", requestParameter(nativeKeyProviderRequest, "DockyardNativeKeyProviderRequest"), "DockyardNativeKeyRefresh"),
  descriptor("nativeKeyRegister", requestParameter(nativeKeyRegisterRequest, "DockyardNativeKeyRegisterRequest"), "DockyardNativeKeyRegister"),
  descriptor("nativeKeyUnregister", requestParameter(nativeKeyRefRequest, "DockyardNativeKeyRefRequest"), "DockyardNativeKeyUnregister"),
  descriptor("nativeKeySetPolicy", requestParameter(nativeKeyPolicyRequest, "DockyardNativeKeyPolicyRequest"), "DockyardNativeKeySetPolicy"),
  descriptor("getContextWindowOverride", requestParameter(contextWindowRequest, "DockyardContextWindowRequest"), "DockyardContextWindowOverride"),
  descriptor("setContextWindowOverride", requestParameter(contextWindowSetRequest, "DockyardContextWindowSetRequest"), "DockyardContextWindowOverride")
]);
var TYPERT_MODEL = Object.freeze({
  services: [
    {
      description: "Dockyard provider account, OAuth, quota, and selection management.",
      summary: "Provider-aware Dockyard account management for the native DSH composer.",
      tags: [],
      key: "dockyardRemote",
      exportName: "DockyardRemoteService",
      members: TYPERT_DESCRIPTORS.map((entry) => ({
        kind: "method",
        name: entry.method,
        signature: `${entry.method}(...): unknown`
      })),
      types: []
    }
  ],
  events: [],
  objects: []
});

// packages/dsh-plugin/src/dockyard-typert.remote.mjs
var TYPERT_REMOTE = {
  package: PACKAGE,
  descriptors: TYPERT_DESCRIPTORS
};

// packages/dsh-plugin/src/dockyard-locale.mjs
var DOCKYARD_LOCALE_NS = "dockyard";
var DOCKYARD_LOCALES = Object.freeze({
  zh: Object.freeze({
    // BCP 47 tag of this dictionary, for Intl number, currency and date formatting.
    "intl.locale": "zh-CN",
    "ui.close": "\u5173\u95ED",
    "ui.cancel": "\u53D6\u6D88",
    "ui.retry": "\u91CD\u65B0\u52A0\u8F7D",
    "ui.allProviders": "\u8FD4\u56DE\u4F9B\u5E94\u5546\u5217\u8868",
    "ui.manageProvider": "\u5207\u6362\u4F9B\u5E94\u5546",
    "ui.subscriptionProviders": "\u8BA2\u9605\u8D26\u53F7",
    "ui.apiProviders": "API \u63A5\u5165",
    "ui.apiProviderSubtitle": "\u901A\u8FC7 API \u5730\u5740\u8FDE\u63A5",
    "ui.model": "\u6A21\u578B",
    "ui.sessionModel": "\u5F53\u524D\u4F1A\u8BDD\u6A21\u578B",
    "ui.reasoningEffort": "\u63A8\u7406\u7B49\u7EA7",
    "ui.chooseModel": "\u9009\u62E9\u6A21\u578B\u5E76\u7528\u4E8E\u5F53\u524D\u4F1A\u8BDD",
    "ui.refreshModels": "\u5237\u65B0\u6A21\u578B\u5217\u8868",
    "ui.refreshingModels": "\u6B63\u5728\u8BFB\u53D6\u8D26\u53F7\u6A21\u578B\u2026",
    "ui.modelsUpdated": "\u6A21\u578B\u5217\u8868\u5DF2\u66F4\u65B0\uFF0C\u5171 {count} \u4E2A\u3002",
    "ui.switching": "\u6B63\u5728\u5207\u6362\u6A21\u578B\u2026",
    "ui.noModels": "\u6CA1\u6709\u53EF\u7528\u6A21\u578B\u3002\u8BF7\u5148\u63A5\u5165\u8D26\u53F7\uFF0C\u6216\u5237\u65B0\u6A21\u578B\u5217\u8868\u3002",
    "ui.selectTimedOut": "\u5207\u6362\u6A21\u578B\u8D85\u65F6\u3002\u8BF7\u5728\u8FDE\u63A5\u6062\u590D\u540E\u91CD\u8BD5\u3002",
    "ui.effortUnavailable": "\u6240\u9009\u63A8\u7406\u7B49\u7EA7\u5DF2\u4E0D\u53EF\u7528\u3002",
    "ui.advanced": "\u7B56\u7565\u4E0E\u4E0A\u4E0B\u6587",
    "ui.action.scan": "\u6B63\u5728\u626B\u63CF\u672C\u673A\u767B\u5F55\u6001\u2026",
    "ui.action.add": "\u6B63\u5728\u6DFB\u52A0\u2026",
    "ui.action.login": "\u6B63\u5728\u6253\u5F00\u6388\u6743\u9875\u2026",
    "ui.action.use": "\u6B63\u5728\u5207\u6362\u8D26\u53F7\u2026",
    "ui.action.select": "\u6B63\u5728\u5207\u6362 Key\u2026",
    "ui.action.remove": "\u6B63\u5728\u79FB\u9664\u2026",
    "ui.action.policy": "\u6B63\u5728\u4FDD\u5B58\u7B56\u7565\u2026",
    "ui.action.auth-code": "\u6B63\u5728\u63D0\u4EA4\u6388\u6743\u7801\u2026",
    "ui.action.cancel": "\u6B63\u5728\u53D6\u6D88\u6388\u6743\u2026",
    "policy.manual": "\u624B\u52A8\u9009\u62E9",
    "policy.sticky_session": "\u4F1A\u8BDD\u7C98\u6EDE",
    "policy.round_robin": "\u8D26\u53F7\u8F6E\u8BE2",
    "policy.failover": "\u5931\u8D25\u8F6C\u79FB",
    "nativePolicy.manual": "\u624B\u52A8\u9009\u62E9 Key",
    "nativePolicy.round_robin": "\u591A Key \u8F6E\u8BE2",
    "nativePolicy.failover": "\u5931\u8D25\u8F6C\u79FB",
    "title.subscriptionManagement": "\u4F9B\u5E94\u5546",
    "title.noModel": "\u672A\u9009\u62E9\u6A21\u578B",
    "title.key": "Key",
    "status.noConnectedAccounts": "\u6CA1\u6709\u9700\u8981\u5237\u65B0\u7684\u5DF2\u8FDE\u63A5\u8D26\u53F7\u3002",
    "status.refreshedAccounts": "\u5DF2\u5237\u65B0 {count} \u4E2A\u8D26\u53F7\u7684\u989D\u5EA6\u3002",
    "status.refreshPartial": "\u5DF2\u5237\u65B0 {success}/{total} \u4E2A\u8D26\u53F7\uFF1B{failures} \u4E2A\u8D85\u65F6\u6216\u5931\u8D25\uFF0C\u4FDD\u7559\u4E0A\u6B21\u989D\u5EA6\u3002",
    "status.oauthCompleted": "\u6388\u6743\u5B8C\u6210\uFF0C\u8D26\u53F7\u6C60\u5DF2\u66F4\u65B0\u3002",
    "status.oauthFailed": "\u6388\u6743\u9A8C\u8BC1\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u6388\u6743\u3002",
    "status.oauthEnded": "\u672C\u6B21\u6388\u6743\u5DF2\u7ED3\u675F\uFF0C\u539F\u94FE\u63A5\u4E0D\u80FD\u7EE7\u7EED\u4F7F\u7528\u3002\u8BF7\u91CD\u65B0\u5F00\u59CB\u6388\u6743\u3002",
    "status.oauthPollTimeout": "\u7B49\u5F85\u6388\u6743\u7ED3\u679C\u8D85\u65F6\u3002\u53EF\u53D6\u6D88\u672C\u6B21\u6388\u6743\u540E\u91CD\u65B0\u5F00\u59CB\u3002",
    "status.oauthInProgress": "\u5DF2\u6709\u6388\u6743\u6B63\u5728\u8FDB\u884C\uFF0C\u8BF7\u5728\u5DF2\u6253\u5F00\u7684\u5B98\u65B9\u6388\u6743\u9875\u5B8C\u6210\uFF1B\u4E0D\u4F1A\u91CD\u590D\u6253\u5F00\u3002",
    "status.oauthOtherInProgress": "{provider} \u7684\u6388\u6743\u5C1A\u672A\u5B8C\u6210\u3002\u8BF7\u5207\u6362\u5230\u8BE5\u4F9B\u5E94\u5546\u5B8C\u6210\u6216\u53D6\u6D88\u540E\uFF0C\u518D\u5F00\u59CB\u65B0\u7684\u6388\u6743\u3002",
    "status.oauthCodeSubmitted": "\u6388\u6743\u7801\u5DF2\u63D0\u4EA4\uFF0C\u6B63\u5728\u7B49\u5F85\u5B98\u65B9\u9A8C\u8BC1\u7ED3\u679C\u2026",
    "status.oauthCancelled": "\u5DF2\u53D6\u6D88\u672C\u6B21\u6388\u6743\u3002",
    "status.accountSelected": "\u5DF2\u5207\u6362\u5230 {account}\uFF0C\u8D26\u53F7\u7B56\u7565\u6539\u4E3A\u624B\u52A8\u9009\u62E9\u3002",
    "status.accountAdded": "\u5DF2\u6DFB\u52A0 {count} \u4E2A\u8D26\u53F7\u3002",
    "status.noNewOAuthCandidates": "\u6CA1\u6709\u65B0\u7684\u672C\u673A\u767B\u5F55\u6001\u53EF\u6DFB\u52A0\u3002",
    "status.discoveryRefreshFailed": "\u672C\u673A\u767B\u5F55\u6001\u5237\u65B0\u5931\u8D25\uFF1A{error}",
    "status.accountRemoved": "\u8D26\u53F7\u5DF2\u79FB\u9664{details}{scanNotice}\uFF1B{reentry}",
    "status.policyUpdated": "\u8D26\u53F7\u7B56\u7565\u5DF2\u8BBE\u7F6E\u4E3A{policy}\u3002",
    "status.reading": "\u8BFB\u53D6\u4E2D\u2026",
    "status.scanning": "\u626B\u63CF\u4E2D\u2026",
    "status.verificationInProgress": "\u6388\u6743\u8FDB\u884C\u4E2D\u2026",
    "status.canceling": "\u53D6\u6D88\u4E2D\u2026",
    "status.reentryOAuth": "\u5982\u9700\u91CD\u65B0\u63A5\u5165\uFF0C\u8BF7\u91CD\u65B0\u6388\u6743\u3002",
    "status.reentryScan": "\u5982\u9700\u91CD\u65B0\u63A5\u5165\uFF0C\u8BF7\u5148\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u6216\u5B98\u65B9\u73AF\u5883\u5B8C\u6210\u767B\u5F55\uFF0C\u518D\u626B\u63CF\u672C\u673A\u767B\u5F55\u6001\u3002",
    "error.unknown": "\u672A\u77E5\u9519\u8BEF",
    "error.remoteNotMounted": "Dockyard Remote \u5C1A\u672A\u6302\u8F7D\uFF1A{method}",
    "value.notReturned": "\u672A\u8FD4\u56DE",
    "value.unknown": "\u672A\u77E5",
    "value.quota": "\u989D\u5EA6",
    "value.provider": "\u4F9B\u5E94\u5546",
    "time.minutes": "{count} \u5206\u949F",
    "time.hours": "{count} \u5C0F\u65F6",
    "time.days": "{count} \u5929",
    "summary.notConnected": "\u672A\u63A5\u5165",
    "summary.connected": "\u5DF2\u8FDE\u63A5",
    "summary.accountCount": "{count} \u4E2A\u8D26\u53F7",
    "identity.cursorBrowser": "\u5B98\u65B9\u6D4F\u89C8\u5668\u6388\u6743",
    "identity.officialLogin": "\u5B98\u65B9\u5BA2\u6237\u7AEF\u767B\u5F55\u6001",
    "identity.sessionFingerprint": "\u4F1A\u8BDD\u6307\u7EB9 {fingerprint}",
    "health.healthy": "\u6B63\u5E38",
    "health.degraded": "\u5F02\u5E38",
    "health.cooldown": "\u51B7\u5374\u4E2D",
    "health.expired": "\u9700\u91CD\u65B0\u6388\u6743",
    "health.exhausted": "\u989D\u5EA6\u8017\u5C3D",
    "health.unknown": "\u5F85\u68C0\u67E5",
    "account.current": "\u4F7F\u7528\u4E2D",
    "account.use": "\u4F7F\u7528\u6B64\u8D26\u53F7",
    "account.useHint": "\u5207\u6362\u540E\uFF0C\u8D26\u53F7\u7B56\u7565\u6539\u4E3A\u624B\u52A8\u9009\u62E9",
    "account.remove": "\u79FB\u9664",
    "account.confirmRemove": "\u786E\u8BA4\u79FB\u9664",
    "account.removeHint": "\u5C06\u5220\u9664 Dockyard \u8D26\u53F7\u6C60\u8BB0\u5F55\u548C\u672C\u673A\u4FDD\u5B58\u7684\u51ED\u636E\u3002",
    "account.problem": "{status}\uFF1A{detail}",
    "quota.noWindow": "\u4F9B\u5E94\u5546\u5C1A\u672A\u8FD4\u56DE\u989D\u5EA6\u4FE1\u606F\u3002",
    "quota.openUsage": "\u6253\u5F00\u5B98\u65B9\u7528\u91CF\u9875\u9762",
    "quota.readFailed": "\u989D\u5EA6\u8BFB\u53D6\u5931\u8D25\uFF1A{error}",
    "quota.keyUnconfigured": "\u8BE5 Key \u5C1A\u672A\u914D\u7F6E",
    "quota.currentNoWindow": "\u4F9B\u5E94\u5546\u6682\u672A\u63D0\u4F9B\u989D\u5EA6\u4FE1\u606F\uFF0C\u4ECD\u53EF\u7BA1\u7406\u548C\u4F7F\u7528\u5DF2\u914D\u7F6E\u7684 Key\u3002",
    "quota.resetsIn": "{time}\u540E\u91CD\u7F6E",
    "quota.resetSoon": "\u5373\u5C06\u91CD\u7F6E",
    "quota.resetDue": "\u5DF2\u5230\u91CD\u7F6E\u65F6\u95F4",
    "quota.updatedAgo": "{time}\u524D\u66F4\u65B0",
    "quota.updatedNow": "\u521A\u521A\u66F4\u65B0",
    "quota.window.hours": "{count} \u5C0F\u65F6\u989D\u5EA6",
    "quota.window.days": "{count} \u5929\u989D\u5EA6",
    "quota.window.daily": "\u6BCF\u65E5\u989D\u5EA6",
    "quota.window.weekly": "\u6BCF\u5468\u989D\u5EA6",
    "quota.window.monthly": "\u6BCF\u6708\u989D\u5EA6",
    "auth.browserTitle": "\u6B63\u5728\u7B49\u5F85 {provider} \u6388\u6743",
    "auth.terminalTitle": "\u6B63\u5728\u7B49\u5F85 {provider} \u5B98\u65B9\u7EC8\u7AEF\u767B\u5F55",
    "auth.popupBlocked": "\u6D4F\u89C8\u5668\u672A\u80FD\u81EA\u52A8\u6253\u5F00\u6388\u6743\u9875\u3002\u8BF7\u70B9\u51FB\u4E0B\u65B9\u300C\u6253\u5F00\u6388\u6743\u9875\u300D\u7EE7\u7EED\u3002",
    "auth.intro": "\u8BF7\u5728\u5B98\u65B9\u6388\u6743\u9875\u5B8C\u6210\u767B\u5F55\u3002\u5982\u679C\u9875\u9762\u6CA1\u6709\u6253\u5F00\uFF0C\u53EF\u70B9\u51FB\u4E0B\u65B9\u300C\u6253\u5F00\u6388\u6743\u9875\u300D\u3002",
    "auth.step1": "\u5728\u5B98\u65B9\u9875\u9762\u9009\u62E9\u8981\u6DFB\u52A0\u7684\u8D26\u53F7\u5E76\u5B8C\u6210\u6388\u6743\u3002",
    "auth.step2": "\u6388\u6743\u5B8C\u6210\u540E\u56DE\u5230\u8FD9\u91CC\uFF0CDSH \u4F1A\u81EA\u52A8\u63A5\u5165\u8D26\u53F7\uFF0C\u5E76\u663E\u793A\u5B98\u65B9\u8FD4\u56DE\u7684\u53EF\u7528\u6027\u6216\u989D\u5EA6\u4FE1\u606F\u3002",
    "auth.step3": "\u5982\u679C\u9875\u9762\u8FD4\u56DE\u6388\u6743\u7801\uFF0C\u8BF7\u7C98\u8D34\u5305\u542B state \u7684\u5B8C\u6574\u56DE\u8C03\u5730\u5740\uFF0C\u6216\u4F7F\u7528 code#state \u683C\u5F0F\u3002",
    "auth.callbackPlaceholder": "\u5B8C\u6574\u56DE\u8C03\u5730\u5740\u6216 code#state",
    "auth.callbackAria": "\u5B98\u65B9\u6388\u6743\u7801\u6216\u56DE\u8C03\u5730\u5740",
    "auth.submit": "\u63D0\u4EA4\u6388\u6743\u7801",
    "auth.reopen": "\u6253\u5F00\u6388\u6743\u9875",
    "auth.copyLink": "\u590D\u5236\u6388\u6743\u94FE\u63A5",
    "auth.linkCopied": "\u5DF2\u590D\u5236",
    "auth.cancel": "\u53D6\u6D88\u6388\u6743",
    "auth.restart": "\u91CD\u65B0\u5F00\u59CB\u6388\u6743",
    "auth.reauthorize": "\u91CD\u65B0\u6388\u6743",
    "auth.loginAdd": "\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7",
    "auth.officialInstructions": "\u5B98\u65B9\u767B\u5F55\u8BF4\u660E",
    "auth.scanLocal": "\u626B\u63CF\u672C\u673A\u767B\u5F55\u6001",
    "candidate.noNew": "\u6CA1\u6709\u53D1\u73B0\u65B0\u7684\u672C\u673A\u767B\u5F55\u6001\u3002",
    "candidate.add": "\u6DFB\u52A0",
    "subscription.refreshAll": "\u5237\u65B0\u989D\u5EA6",
    "subscription.modelCount": "{count} \u4E2A\u6A21\u578B",
    "subscription.modelPending": "\u6A21\u578B\u76EE\u5F55\u5F85\u52A0\u8F7D",
    "subscription.none": "\u6682\u672A\u53D1\u73B0\u53EF\u7528\u7684\u8BA2\u9605\u4F9B\u5E94\u5546\u3002",
    "subscription.connectHint": "\u9009\u62E9\u4E00\u4E2A\u4F9B\u5E94\u5546\u5E76\u767B\u5F55\u3002\u63A5\u5165\u8D26\u53F7\u540E\uFF0C\u5B83\u7684\u6A21\u578B\u4F1A\u51FA\u73B0\u5728\u6A21\u578B\u5217\u8868\u4E2D\u3002",
    "subscription.aria": "\u4F9B\u5E94\u5546\u7BA1\u7406",
    "subscription.noAccountsOAuth": "\u8FD8\u6CA1\u6709\u8D26\u53F7\u3002\u70B9\u51FB\u300C\u767B\u5F55\u6DFB\u52A0\u8D26\u53F7\u300D\uFF0C\u5728\u4F9B\u5E94\u5546\u5B98\u65B9\u9875\u9762\u5B8C\u6210\u6388\u6743\u3002",
    "subscription.noAccountsScan": "\u8FD8\u6CA1\u6709\u8D26\u53F7\u3002\u8BF7\u5148\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u6216\u5B98\u65B9\u73AF\u5883\u5B8C\u6210\u767B\u5F55\uFF0C\u518D\u626B\u63CF\u672C\u673A\u767B\u5F55\u6001\u5E76\u6DFB\u52A0\u3002",
    "subscription.localCandidates": "\u672C\u673A\u767B\u5F55\u6001",
    "subscription.accountStrategy": "\u8D26\u53F7\u7B56\u7565",
    "subscription.connectedAccounts": "\u5DF2\u8FDE\u63A5\u8D26\u53F7",
    "contextWindow.title": "\u4E0A\u4E0B\u6587\u4E0A\u9650",
    "contextWindow.detected": "\u5B98\u65B9/\u6CE8\u518C\u8868\uFF1A{value}",
    "contextWindow.effective": "\u5F53\u524D\u751F\u6548\uFF1A{value}",
    "contextWindow.auto": "\u81EA\u52A8\uFF08\u4F7F\u7528\u5B98\u65B9/\u6CE8\u518C\u8868\uFF09",
    "contextWindow.custom": "\u81EA\u5B9A\u4E49",
    "contextWindow.placeholder": "token \u6570\uFF0C\u4F8B\u5982 500000",
    "contextWindow.save": "\u4FDD\u5B58",
    "contextWindow.saving": "\u4FDD\u5B58\u4E2D\u2026",
    "contextWindow.saved": "\u4E0A\u4E0B\u6587\u4E0A\u9650\u5DF2\u4FDD\u5B58\u5E76\u7ACB\u5373\u751F\u6548\u3002",
    "contextWindow.invalid": "\u8BF7\u8F93\u5165\u6B63\u6574\u6570 token \u6570\u3002",
    "contextWindow.noDetected": "\u672A\u8FD4\u56DE",
    "contextWindow.scopeKey": "\u5F53\u524D Key",
    "contextWindow.scopeAccount": "\u5F53\u524D\u8D26\u53F7",
    "contextWindow.scopeProvider": "\u5F53\u524D\u4F9B\u5E94\u5546",
    "contextWindow.warning": "\u81EA\u5B9A\u4E49\u503C\u53EA\u5F71\u54CD DSH \u5B9E\u9645\u53D1\u9001\u7684\u4E0A\u4E0B\u6587\uFF0C\u4E0D\u4F1A\u6539\u53D8\u4F9B\u5E94\u5546\u7684\u771F\u5B9E\u80FD\u529B\u3002",
    "native.keyAria": "{title} Key \u4E0E\u989D\u5EA6\u7BA1\u7406",
    "native.dshAccount": "DSH \u8D26\u53F7\u767B\u5F55",
    "native.dshAccountHint": "\u6B64\u4F9B\u5E94\u5546\u4F7F\u7528 DSH \u7684 DeepSeek \u8D26\u53F7\u767B\u5F55\uFF0C\u65E0\u9700\u6DFB\u52A0 API Key\u3002\u53EF\u5728\u4E0A\u65B9\u5207\u6362\u6A21\u578B\u3002",
    "native.refresh": "\u5237\u65B0\u989D\u5EA6",
    "native.reload": "\u5237\u65B0",
    "native.readingConfig": "\u6B63\u5728\u8BFB\u53D6\u4F9B\u5E94\u5546\u914D\u7F6E\u2026",
    "native.configUnavailable": "\u65E0\u6CD5\u8BFB\u53D6\u6B64\u4F9B\u5E94\u5546\u7684 Key \u914D\u7F6E\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5\u3002",
    "native.noKeys": "\u8FD8\u6CA1\u6709\u914D\u7F6E API Key\u3002\u5C55\u5F00\u4E0B\u65B9\u300C\u6DFB\u52A0 API Key\u300D\u5F00\u59CB\u3002",
    "native.currentKey": "\u4F7F\u7528\u4E2D",
    "native.use": "\u4F7F\u7528\u6B64 Key",
    "native.remove": "\u79FB\u9664",
    "native.unlinkReference": "\u89E3\u9664\u5F15\u7528",
    "native.confirmRemove": "\u786E\u8BA4\u79FB\u9664",
    "native.confirmUnlink": "\u786E\u8BA4\u89E3\u9664",
    "native.removeTitle": "\u5C06\u4ECE DSH \u51ED\u636E\u5E93\u79FB\u9664\u6B64 Key\u3002",
    "native.unlinkTitle": "\u53EA\u89E3\u9664\u4F9B\u5E94\u5546\u5F15\u7528\uFF0C\u4E0D\u5220\u9664\u539F\u59CB\u6587\u4EF6\u51ED\u636E\u3002",
    "native.configured": "\u5DF2\u914D\u7F6E",
    "native.unconfigured": "\u672A\u914D\u7F6E",
    "native.source": "\u6765\u6E90\uFF1A{source}",
    "native.fromProviderConfig": "\u6765\u81EA\u5F53\u524D\u4F9B\u5E94\u5546\u914D\u7F6E",
    "native.currentDshKey": "\u5F53\u524D DSH Key",
    "native.addKeyTitle": "\u6DFB\u52A0 API Key",
    "native.pasteApiKey": "\u7C98\u8D34 API Key",
    "native.optionalName": "\u540D\u79F0\uFF08\u53EF\u9009\uFF0C\u4F8B\u5982\u5DE5\u4F5C Key\uFF09",
    "native.save": "\u6DFB\u52A0\u5E76\u542F\u7528",
    "native.saving": "\u4FDD\u5B58\u4E2D\u2026",
    "native.keyStorage": "API Key \u7531 DSH \u51ED\u636E\u5E93\u4FDD\u5B58\uFF0C\u4E0D\u4F1A\u56DE\u663E\u6216\u5199\u5165\u6D4F\u89C8\u5668\u3002",
    "native.keyStrategy": "Key \u7B56\u7565",
    "native.notice.manual": "DSH \u9002\u914D\u5668\u5C1A\u672A\u63D0\u4F9B\u8BF7\u6C42\u7EA7 Key \u6C60\uFF0C\u5F53\u524D\u53EA\u80FD\u624B\u52A8\u5207\u6362 Key\u3002",
    "native.quotaUnsupported": "\u6B64\u4F9B\u5E94\u5546\u672A\u63D0\u4F9B\u989D\u5EA6\u67E5\u8BE2\u3002",
    "native.operation.readProviderCatalog": "\u8BFB\u53D6\u4F9B\u5E94\u5546\u76EE\u5F55",
    "native.operation.readProviderConfig": "\u8BFB\u53D6\u4F9B\u5E94\u5546\u914D\u7F6E",
    "native.operation.readKeyStatus": "\u8BFB\u53D6 Key \u72B6\u6001",
    "native.operation.readKeyPool": "\u8BFB\u53D6 Dockyard Key \u6C60",
    "native.operation.refreshQuota": "\u5237\u65B0\u4F9B\u5E94\u5546\u5B9E\u65F6\u989D\u5EA6",
    "native.operation.updateProviderKey": "\u66F4\u65B0\u4F9B\u5E94\u5546 Key \u914D\u7F6E",
    "native.operation.saveApiKey": "\u4FDD\u5B58 API Key",
    "native.operation.registerKey": "\u767B\u8BB0 Dockyard Key",
    "native.operation.setManualKey": "\u5207\u6362\u4E3A\u624B\u52A8 Key",
    "native.operation.removeApiKey": "\u79FB\u9664 API Key",
    "native.operation.removeDockyardKey": "\u79FB\u9664 Dockyard Key",
    "native.operation.updatePolicy": "\u66F4\u65B0 Key \u7B56\u7565",
    "native.error.noWritableConfig": "DSH \u6CA1\u6709\u8FD4\u56DE\u8BE5\u4F9B\u5E94\u5546\u7684\u53EF\u5199\u914D\u7F6E",
    "native.error.readTimedOut": "\u8BFB\u53D6\u72B6\u6001\u8D85\u65F6\uFF0C\u5DF2\u4FDD\u7559\u73B0\u6709\u914D\u7F6E\u3002\u8BF7\u5237\u65B0\u91CD\u8BD5\u3002",
    "native.error.keyRetained": "Key {ref} \u5DF2\u4FDD\u7559\uFF0C\u8BF7\u5237\u65B0\u540E\u68C0\u67E5\u914D\u7F6E\uFF0C\u518D\u51B3\u5B9A\u662F\u5426\u79FB\u9664\u3002",
    "native.error.enterApiKey": "\u8BF7\u8F93\u5165 API Key",
    "native.error.notNativeProvider": "\u5F53\u524D\u6A21\u578B\u7684\u4F9B\u5E94\u5546\u4E0D\u4F7F\u7528 DSH \u539F\u751F API Key",
    "native.error.keyNotIndexed": "\u627E\u4E0D\u5230\u8FD9\u4E2A Key \u7684\u672C\u5730\u7D22\u5F15",
    "native.error.keyNotConfigured": "\u8FD9\u4E2A Key \u5728 DSH \u51ED\u636E\u5E93\u4E2D\u5C1A\u672A\u914D\u7F6E",
    "native.message.keySaved": "Key \u5DF2\u4FDD\u5B58\u5230 DSH \u51ED\u636E\u5E93\uFF0C\u5E76\u5DF2\u8BBE\u4E3A\u5F53\u524D Key\u3002",
    "native.message.keySelected": "\u5DF2\u5207\u6362\u5230{label}\u3002",
    "native.message.keyRemoved": "\u5DF2\u79FB\u9664{label}\u3002",
    "native.message.referenceRemoved": "\u5DF2\u89E3\u9664{label}\u7684\u4F9B\u5E94\u5546\u5F15\u7528\uFF1B\u539F\u59CB\u6587\u4EF6\u51ED\u636E\u672A\u5220\u9664\u3002",
    "native.message.policyManual": "\u5DF2\u8BBE\u4E3A\u624B\u52A8\u9009\u62E9 Key\u3002",
    "native.message.policyRoundRobin": "\u5DF2\u542F\u7528\u8BF7\u6C42\u7EA7\u591A Key \u8F6E\u8BE2\u3002",
    "native.message.policyFailover": "\u5DF2\u542F\u7528\u5931\u8D25\u8F6C\u79FB\uFF1A\u5F53\u524D Key \u5931\u8D25\u65F6\u81EA\u52A8\u5C1D\u8BD5\u4E0B\u4E00\u4E2A Key\u3002",
    "trigger.subscriptionManagement": "\u4F9B\u5E94\u5546",
    "trigger.accountQuota": "\u8D26\u53F7\u4E0E\u989D\u5EA6\u7BA1\u7406",
    "trigger.providerModel": "{provider} \xB7 {model}",
    "settings.subscriptionSection": "\u8BA2\u9605\u4E0E\u8D26\u53F7"
  }),
  en: Object.freeze({
    "intl.locale": "en",
    "ui.close": "Close",
    "ui.cancel": "Cancel",
    "ui.retry": "Reload",
    "ui.allProviders": "Back to all providers",
    "ui.manageProvider": "Switch provider",
    "ui.subscriptionProviders": "Subscription accounts",
    "ui.apiProviders": "API connections",
    "ui.apiProviderSubtitle": "Connected through an API endpoint",
    "ui.model": "Model",
    "ui.sessionModel": "Model for this conversation",
    "ui.reasoningEffort": "Reasoning effort",
    "ui.chooseModel": "Choose a model for this conversation",
    "ui.refreshModels": "Refresh model list",
    "ui.refreshingModels": "Reading account models\u2026",
    "ui.modelsUpdated": "Model list updated: {count} models.",
    "ui.switching": "Switching model\u2026",
    "ui.noModels": "No models available. Connect an account or refresh the model list.",
    "ui.selectTimedOut": "Switching the model timed out. Retry after the connection recovers.",
    "ui.effortUnavailable": "The selected reasoning effort is no longer available.",
    "ui.advanced": "Policy and context",
    "ui.action.scan": "Scanning local sign-ins\u2026",
    "ui.action.add": "Adding\u2026",
    "ui.action.login": "Opening authorization\u2026",
    "ui.action.use": "Switching account\u2026",
    "ui.action.select": "Switching Key\u2026",
    "ui.action.remove": "Removing\u2026",
    "ui.action.policy": "Saving policy\u2026",
    "ui.action.auth-code": "Submitting authorization code\u2026",
    "ui.action.cancel": "Cancelling authorization\u2026",
    "policy.manual": "Manual selection",
    "policy.sticky_session": "Sticky session",
    "policy.round_robin": "Round robin",
    "policy.failover": "Failover",
    "nativePolicy.manual": "Manual Key",
    "nativePolicy.round_robin": "Key round robin",
    "nativePolicy.failover": "Failover",
    "title.subscriptionManagement": "Providers",
    "title.noModel": "No model selected",
    "title.key": "Key",
    "status.noConnectedAccounts": "No connected accounts to refresh.",
    "status.refreshedAccounts": "Refreshed quota for {count} accounts.",
    "status.refreshPartial": "Refreshed {success}/{total} accounts; {failures} timed out or failed and keep their previous quota.",
    "status.oauthCompleted": "Authorization completed. The account pool was updated.",
    "status.oauthFailed": "Authorization could not be verified. Authorize again.",
    "status.oauthEnded": "This authorization has ended and its link can no longer be used. Start a new one.",
    "status.oauthPollTimeout": "Timed out waiting for the authorization result. Cancel it and start again.",
    "status.oauthInProgress": "An authorization is already in progress. Finish it on the official page that is already open; no second page is opened.",
    "status.oauthOtherInProgress": "Authorization for {provider} is still pending. Switch to that provider to finish or cancel it before starting another.",
    "status.oauthCodeSubmitted": "Authorization code submitted. Waiting for the official verification result\u2026",
    "status.oauthCancelled": "Authorization cancelled.",
    "status.accountSelected": "Switched to {account}. The account policy is now manual selection.",
    "status.accountAdded": "Added {count} accounts.",
    "status.noNewOAuthCandidates": "No new local sign-ins to add.",
    "status.discoveryRefreshFailed": "Failed to refresh local sign-ins: {error}",
    "status.accountRemoved": "Account removed{details}{scanNotice}; {reentry}",
    "status.policyUpdated": "Account policy set to {policy}.",
    "status.reading": "Reading\u2026",
    "status.scanning": "Scanning\u2026",
    "status.verificationInProgress": "Authorization in progress\u2026",
    "status.canceling": "Cancelling\u2026",
    "status.reentryOAuth": "Authorize again to reconnect it.",
    "status.reentryScan": "Sign in through the official client or environment, then scan local sign-ins to reconnect it.",
    "error.unknown": "Unknown error",
    "error.remoteNotMounted": "Dockyard Remote is not mounted: {method}",
    "value.notReturned": "Not returned",
    "value.unknown": "Unknown",
    "value.quota": "Quota",
    "value.provider": "provider",
    "time.minutes": "{count} min",
    "time.hours": "{count} h",
    "time.days": "{count} d",
    "summary.notConnected": "Not connected",
    "summary.connected": "Connected",
    "summary.accountCount": "{count} accounts",
    "identity.cursorBrowser": "Official browser authorization",
    "identity.officialLogin": "Official client sign-in",
    "identity.sessionFingerprint": "Session fingerprint {fingerprint}",
    "health.healthy": "Healthy",
    "health.degraded": "Degraded",
    "health.cooldown": "Cooling down",
    "health.expired": "Reauthorization required",
    "health.exhausted": "Quota exhausted",
    "health.unknown": "Not checked yet",
    "account.current": "In use",
    "account.use": "Use this account",
    "account.useHint": "Switches the account policy to manual selection",
    "account.remove": "Remove",
    "account.confirmRemove": "Remove account",
    "account.removeHint": "Deletes the Dockyard account pool record and the credential stored on this machine.",
    "account.problem": "{status}: {detail}",
    "quota.noWindow": "The provider has not returned quota information.",
    "quota.openUsage": "Open the official usage page",
    "quota.readFailed": "Failed to read quota: {error}",
    "quota.keyUnconfigured": "This Key is not configured",
    "quota.currentNoWindow": "The provider returned no quota information. Configured Keys can still be managed and used.",
    "quota.resetsIn": "resets in {time}",
    "quota.resetSoon": "resets soon",
    "quota.resetDue": "reset time passed",
    "quota.updatedAgo": "Updated {time} ago",
    "quota.updatedNow": "Updated just now",
    "quota.window.hours": "{count}-hour quota",
    "quota.window.days": "{count}-day quota",
    "quota.window.daily": "Daily quota",
    "quota.window.weekly": "Weekly quota",
    "quota.window.monthly": "Monthly quota",
    "auth.browserTitle": "Waiting for {provider} authorization",
    "auth.terminalTitle": "Waiting for the official {provider} terminal sign-in",
    "auth.popupBlocked": "The browser could not open the authorization page automatically. Use \u201COpen authorization page\u201D below to continue.",
    "auth.intro": "Finish signing in on the official authorization page. If it did not open, use \u201COpen authorization page\u201D below.",
    "auth.step1": "Choose the account to add on the official page and complete authorization.",
    "auth.step2": "Return here after authorization. DSH imports the account and shows the availability or quota information returned by the provider.",
    "auth.step3": "If the page returns an authorization code, paste the complete callback URL containing state, or use the code#state format.",
    "auth.callbackPlaceholder": "Complete callback URL or code#state",
    "auth.callbackAria": "Official authorization code or callback URL",
    "auth.submit": "Submit code",
    "auth.reopen": "Open authorization page",
    "auth.copyLink": "Copy authorization link",
    "auth.linkCopied": "Copied",
    "auth.cancel": "Cancel authorization",
    "auth.restart": "Start a new authorization",
    "auth.reauthorize": "Reauthorize",
    "auth.loginAdd": "Log in to add an account",
    "auth.officialInstructions": "Official login instructions",
    "auth.scanLocal": "Scan local sign-ins",
    "candidate.noNew": "No new local sign-ins found.",
    "candidate.add": "Add",
    "subscription.refreshAll": "Refresh quota",
    "subscription.modelCount": "{count} models",
    "subscription.modelPending": "Model catalog loading",
    "subscription.none": "No subscription providers are available.",
    "subscription.connectHint": "Pick a provider and sign in. Once an account is connected, its models appear in the model list.",
    "subscription.aria": "Provider management",
    "subscription.noAccountsOAuth": "No accounts yet. Use \u201CLog in to add an account\u201D and finish authorization on the provider's official page.",
    "subscription.noAccountsScan": "No accounts yet. Sign in through the official client or environment, then scan local sign-ins and add one.",
    "subscription.localCandidates": "Local sign-ins",
    "subscription.accountStrategy": "Account policy",
    "subscription.connectedAccounts": "Connected accounts",
    "contextWindow.title": "Context limit",
    "contextWindow.detected": "Official/registry: {value}",
    "contextWindow.effective": "Effective now: {value}",
    "contextWindow.auto": "Automatic (official/registry)",
    "contextWindow.custom": "Custom",
    "contextWindow.placeholder": "Tokens, e.g. 500000",
    "contextWindow.save": "Save",
    "contextWindow.saving": "Saving\u2026",
    "contextWindow.saved": "Context limit saved and applied.",
    "contextWindow.invalid": "Enter a positive whole number of tokens.",
    "contextWindow.noDetected": "not returned",
    "contextWindow.scopeKey": "Current Key",
    "contextWindow.scopeAccount": "Current account",
    "contextWindow.scopeProvider": "Current provider",
    "contextWindow.warning": "Custom values only limit the context DSH sends; they do not change the provider's real capability.",
    "native.keyAria": "{title} Key and quota management",
    "native.dshAccount": "DSH account sign-in",
    "native.dshAccountHint": "This provider uses DSH's DeepSeek account sign-in and does not need an API Key. Select a model above.",
    "native.refresh": "Refresh quota",
    "native.reload": "Refresh",
    "native.readingConfig": "Reading provider configuration\u2026",
    "native.configUnavailable": "Could not read this provider's Key configuration. Refresh to retry.",
    "native.noKeys": "No API Keys yet. Open \u201CAdd an API Key\u201D below to start.",
    "native.currentKey": "In use",
    "native.use": "Use this Key",
    "native.remove": "Remove",
    "native.unlinkReference": "Unlink",
    "native.confirmRemove": "Remove Key",
    "native.confirmUnlink": "Unlink Key",
    "native.removeTitle": "Removes this Key from DSH Credentials.",
    "native.unlinkTitle": "Only unlinks the provider reference; the original file credential is kept.",
    "native.configured": "Configured",
    "native.unconfigured": "Not configured",
    "native.source": "Source: {source}",
    "native.fromProviderConfig": "From the current provider configuration",
    "native.currentDshKey": "Current DSH Key",
    "native.addKeyTitle": "Add an API Key",
    "native.pasteApiKey": "Paste API Key",
    "native.optionalName": "Name (optional, e.g. Work Key)",
    "native.save": "Add and enable",
    "native.saving": "Saving\u2026",
    "native.keyStorage": "API Keys are stored only through DSH Credentials, never echoed or written to browser storage.",
    "native.keyStrategy": "Key policy",
    "native.notice.manual": "The DSH adapter does not expose a request-level Key pool yet, so only the active Key can be switched manually.",
    "native.quotaUnsupported": "This provider does not offer quota lookup.",
    "native.operation.readProviderCatalog": "Read provider catalog",
    "native.operation.readProviderConfig": "Read provider configuration",
    "native.operation.readKeyStatus": "Read Key status",
    "native.operation.readKeyPool": "Read Dockyard Key pool",
    "native.operation.refreshQuota": "Refresh live provider quota",
    "native.operation.updateProviderKey": "Update provider Key configuration",
    "native.operation.saveApiKey": "Save API Key",
    "native.operation.registerKey": "Register Dockyard Key",
    "native.operation.setManualKey": "Switch to manual Key",
    "native.operation.removeApiKey": "Remove API Key",
    "native.operation.removeDockyardKey": "Remove Dockyard Key",
    "native.operation.updatePolicy": "Update Key policy",
    "native.error.noWritableConfig": "DSH did not return writable configuration for this provider",
    "native.error.readTimedOut": "Reading status timed out. Existing configuration was kept. Refresh to retry.",
    "native.error.keyRetained": "Key {ref} was kept. Refresh and check its configuration before removing it.",
    "native.error.enterApiKey": "Enter an API Key",
    "native.error.notNativeProvider": "The current model's provider does not use a native DSH API Key",
    "native.error.keyNotIndexed": "This Key is missing from the local index",
    "native.error.keyNotConfigured": "This Key is not configured in DSH Credentials",
    "native.message.keySaved": "The Key was written to DSH Credentials and set as the current Key.",
    "native.message.keySelected": "Switched to {label}.",
    "native.message.keyRemoved": "Removed {label}.",
    "native.message.referenceRemoved": "Unlinked {label} from the provider; the original file credential was kept.",
    "native.message.policyManual": "Manual Key selection enabled.",
    "native.message.policyRoundRobin": "Request-level Key round robin enabled.",
    "native.message.policyFailover": "Failover enabled: the next Key is tried automatically when the current Key fails.",
    "trigger.subscriptionManagement": "Providers",
    "trigger.accountQuota": "Account and quota management",
    "trigger.providerModel": "{provider} \xB7 {model}",
    "settings.subscriptionSection": "Subscriptions & accounts"
  })
});
function translate(t, key, params) {
  return typeof t === "function" ? t(key, params) : key;
}

// packages/dsh-plugin/src/native-key-pool.mjs
var STORAGE_PREFIX = "dockyard-dsh.native-key-pool";
var READ_REQUEST_TIMEOUT_MS = 2e4;
var NATIVE_KEY_POLICY_LABELS = Object.freeze({
  manual: "\u624B\u52A8\u9009\u62E9 Key",
  round_robin: "\u591A Key \u8F6E\u8BE2",
  failover: "\u5931\u8D25\u8F6C\u79FB"
});
function resultValue(response, operation) {
  const result = response?.result;
  if (result?.ok === false) {
    throw new Error(result.error?.message ?? result.error?.code ?? `${operation} failed`);
  }
  if (result?.ok === true) return result.value;
  if (response?.ok === false) {
    throw new Error(response.error?.message ?? response.error?.code ?? `${operation} failed`);
  }
  return response?.value ?? response;
}
function createNativeKeyApi(remote) {
  return {
    llm: {
      providers: typeof remote?.llm?.listConfigurableProviders === "function" ? async () => ({ providers: resultValue(await remote.llm.listConfigurableProviders(), "Read provider catalog") }) : void 0
    },
    settings: {
      describe: typeof remote?.settings?.describe === "function" ? () => remote.settings.describe() : void 0,
      mutate: ({ ns, ops, expectedRevision }) => remote.settings.mutate(ns, ops, expectedRevision)
    },
    credentials: {
      describe: typeof remote?.credentials?.describe === "function" ? async ({ refs }) => {
        const credentials = {};
        for (let offset = 0; offset < refs.length; offset += 64) {
          Object.assign(credentials, resultValue(await remote.credentials.describe(refs.slice(offset, offset + 64)), "Read Key status"));
        }
        return { credentials };
      } : void 0,
      set: ({ ref, value }) => remote.credentials.set(ref, value),
      unset: ({ ref }) => remote.credentials.unset(ref)
    }
  };
}
function getPath(source, path = []) {
  let current2 = source;
  for (const segment of path) {
    if (!current2 || typeof current2 !== "object") return void 0;
    current2 = current2[segment];
  }
  return current2;
}
function stringAt(source, key) {
  const value = source?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function providerRef(providerId) {
  return `${String(providerId ?? "provider").toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}
function storageKey(providerId) {
  return `${STORAGE_PREFIX}:${providerId}`;
}
function storageOf() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
function readMetadata(providerId) {
  const storage = storageOf();
  if (!storage) return { policy: "manual", keys: [] };
  try {
    const parsed = JSON.parse(storage.getItem(storageKey(providerId)) ?? "null");
    if (!parsed || typeof parsed !== "object") return { policy: "manual", keys: [] };
    const keys = Array.isArray(parsed.keys) ? parsed.keys.filter((entry) => entry && typeof entry === "object" && typeof entry.ref === "string" && entry.ref.length > 0).map((entry) => ({
      ref: entry.ref,
      label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : entry.ref,
      createdAt: entry.createdAt ?? null
    })) : [];
    const policy = Object.hasOwn(NATIVE_KEY_POLICY_LABELS, parsed.policy) ? parsed.policy : "manual";
    return { policy, keys };
  } catch {
    return { policy: "manual", keys: [] };
  }
}
function writeMetadata(providerId, metadata) {
  const storage = storageOf();
  if (!storage) return;
  try {
    storage.setItem(storageKey(providerId), JSON.stringify({
      policy: Object.hasOwn(NATIVE_KEY_POLICY_LABELS, metadata.policy) ? metadata.policy : "manual",
      keys: metadata.keys.map(({ ref, label, createdAt }) => ({ ref, label, createdAt }))
    }));
  } catch {
  }
}
function makeKeyRef(providerId) {
  const base = providerRef(providerId).replace(/_API_KEY$/, "");
  const random = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID().slice(0, 8).toUpperCase() : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${base}_DOCKYARD_${Date.now().toString(36).toUpperCase()}_${random}`;
}
function errorMessage(error2, t) {
  return error2 instanceof Error ? error2.message : String(error2 ?? t?.("error.unknown") ?? "Unknown error");
}
function nativeEntry(providerRows, providerId) {
  return providerRows.find((entry) => entry?.provider === providerId) ?? null;
}
function isApiKeyEntry(entry, profile) {
  return Boolean(entry && (entry.settingsNs === "llm-pi-ai" || typeof profile?.apiKeyEnv === "string"));
}
function keyRows(metadata, credentials, activeRef, t) {
  const rows = metadata.keys.map((entry) => ({
    ...entry,
    active: entry.ref === activeRef,
    configured: credentials[entry.ref]?.configured === true,
    credential: credentials[entry.ref] ?? null
  }));
  if (activeRef && !rows.some((entry) => entry.ref === activeRef)) {
    rows.unshift({
      ref: activeRef,
      label: t?.("native.currentDshKey") ?? "Current DSH Key",
      createdAt: null,
      active: true,
      configured: credentials[activeRef]?.configured === true,
      credential: credentials[activeRef] ?? null,
      implicit: true
    });
  }
  return rows;
}
var NativeKeyPoolController = class {
  constructor(api, remote = null, t = null) {
    __publicField(this, "api");
    __publicField(this, "store", createSnapshotStore({
      status: "idle",
      action: null,
      providerId: null,
      entry: null,
      namespace: null,
      profile: null,
      settingsPath: [],
      apiKeyRef: null,
      keys: [],
      policy: "manual",
      error: null,
      message: null,
      native: false,
      runtimeMode: "request-key-pool",
      quota: null,
      usage: null,
      quotaSupported: null,
      quotaRefreshing: false
    }));
    __publicField(this, "generation", 0);
    this.api = api;
    this.remote = remote;
    this.t = t;
  }
  operation(key, fallback) {
    return typeof this.t === "function" ? this.t(key) : fallback;
  }
  setState(next) {
    this.store.update((state) => Object.assign(state, next));
  }
  async remoteCall(method, request, operation = method) {
    const fn = this.remote?.[method];
    if (typeof fn !== "function") return null;
    if (!["nativeKeyStatus", "nativeKeyRefresh"].includes(method)) return resultValue(await fn(request), operation);
    return resultValue(await this.readRequest(operation, () => fn(request)), operation);
  }
  async readRequest(operation, read) {
    let timer;
    try {
      return await Promise.race([
        Promise.resolve(read()),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(this.t?.("native.error.readTimedOut") ?? `${operation} timed out. Retry to read the latest status.`)), READ_REQUEST_TIMEOUT_MS);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  applyHostStatus(host) {
    if (!host || typeof host !== "object") return;
    this.setState({
      ...Array.isArray(host.keys) ? { keys: host.keys } : {},
      ...typeof host.policy === "string" ? { policy: host.policy } : {},
      ...typeof host.runtimeMode === "string" ? { runtimeMode: host.runtimeMode } : {},
      ...Object.hasOwn(host, "quota") ? { quota: host.quota } : {},
      ...Object.hasOwn(host, "usage") ? { usage: host.usage } : {},
      ...typeof host.quotaSupported === "boolean" ? { quotaSupported: host.quotaSupported } : {}
    });
  }
  async load(providerId) {
    if (!providerId) return null;
    const generation = ++this.generation;
    const previous = this.store.getSnapshot();
    const action = previous.action ?? "refresh";
    const preserve = previous.providerId === providerId && previous.native;
    this.setState(preserve ? {
      action,
      quotaRefreshing: false,
      error: null,
      message: null
    } : {
      status: "loading",
      action,
      providerId,
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
      quotaSupported: null,
      quotaRefreshing: false,
      error: null,
      message: null
    });
    try {
      if (typeof this.api?.llm?.providers !== "function" || typeof this.api?.settings?.describe !== "function") {
        throw new Error(this.t?.("native.configUnavailable") ?? "Provider configuration is unavailable. Refresh and retry.");
      }
      const [providersResponse, settingsResponse] = await Promise.all([
        this.readRequest(this.operation("native.operation.readProviderCatalog", "Read provider catalog"), () => this.api.llm.providers({})),
        this.readRequest(this.operation("native.operation.readProviderConfig", "Read provider configuration"), () => this.api.settings.describe({}))
      ]);
      const providers = resultValue(providersResponse, this.operation("native.operation.readProviderCatalog", "Read provider catalog")).providers ?? [];
      const settings = resultValue(settingsResponse, this.operation("native.operation.readProviderConfig", "Read provider configuration"));
      const entry = nativeEntry(providers, providerId);
      const namespace = settings.namespaces?.find((view) => view.ns === entry?.settingsNs) ?? null;
      const settingsPath = Array.isArray(entry?.settingsPath) ? entry.settingsPath : [];
      const profile = namespace ? getPath(namespace.value, settingsPath) : null;
      const native = isApiKeyEntry(entry, profile);
      if (!entry || !native) {
        if (generation === this.generation) this.setState({
          status: entry ? "unsupported" : "missing",
          action: null,
          providerId,
          entry: entry ?? null,
          namespace,
          profile,
          settingsPath,
          apiKeyRef: null,
          keys: [],
          policy: "manual",
          native: false,
          error: null,
          message: null
        });
        return null;
      }
      const activeRef = stringAt(profile, "apiKeyEnv");
      const metadata = readMetadata(providerId);
      const refs = [.../* @__PURE__ */ new Set([
        ...activeRef ? [activeRef] : [],
        ...metadata.keys.map((key) => key.ref)
      ])];
      let credentials = {};
      if (refs.length > 0 && this.api.credentials?.describe) {
        const operation = this.operation("native.operation.readKeyStatus", "Read Key status");
        credentials = resultValue(await this.readRequest(operation, () => this.api.credentials.describe({ refs })), operation).credentials ?? {};
      }
      const keys = keyRows(metadata, credentials, activeRef, this.t);
      const preserveQuota = preserve && previous.apiKeyRef === activeRef && previous.profile?.baseURL === profile?.baseURL;
      if (generation !== this.generation) return null;
      this.setState({
        status: "ready",
        action,
        providerId,
        entry,
        namespace,
        profile,
        settingsPath,
        apiKeyRef: activeRef,
        keys,
        policy: metadata.policy,
        native: true,
        quota: preserveQuota ? previous.quota : null,
        usage: preserveQuota ? previous.usage : null
      });
      let hostStatus = null;
      let hostError = null;
      try {
        hostStatus = await this.remoteCall("nativeKeyStatus", { providerId }, this.operation("native.operation.readKeyPool", "Read Dockyard Key pool"));
      } catch (error2) {
        hostError = errorMessage(error2, this.t);
      }
      if (generation !== this.generation) return null;
      this.setState({
        status: "ready",
        action: null,
        providerId,
        entry,
        namespace,
        profile,
        settingsPath,
        apiKeyRef: activeRef,
        keys: hostStatus?.keys?.length ? hostStatus.keys : keys,
        policy: hostStatus?.policy ?? metadata.policy,
        native: true,
        runtimeMode: hostStatus?.runtimeMode ?? (preserve ? previous.runtimeMode : "native-single-key"),
        quota: hostStatus && Object.hasOwn(hostStatus, "quota") ? hostStatus.quota : preserveQuota ? previous.quota : null,
        usage: hostStatus && Object.hasOwn(hostStatus, "usage") ? hostStatus.usage : preserveQuota ? previous.usage : null,
        quotaSupported: hostStatus?.quotaSupported ?? (preserveQuota ? previous.quotaSupported : null),
        error: hostError,
        message: null
      });
      return this.store.getSnapshot();
    } catch (error2) {
      if (generation === this.generation) this.setState({
        status: "error",
        action: null,
        providerId,
        error: errorMessage(error2, this.t)
      });
      return null;
    }
  }
  async ensure(providerId) {
    const state = this.store.getSnapshot();
    if (state.providerId === providerId && (state.native || ["missing", "unsupported"].includes(state.status))) return state;
    return this.load(providerId);
  }
  async refresh(providerId, { background = false } = {}) {
    const current2 = this.store.getSnapshot();
    const switchingProvider = !background && current2.providerId !== providerId && current2.action === "refresh";
    if (current2.action && !switchingProvider || background && (globalThis.document?.hidden || current2.providerId !== providerId || current2.status !== "ready" || !current2.native)) return null;
    const state = background ? current2 : await this.load(providerId);
    if (!state || state.providerId !== providerId) return null;
    if (state.quotaSupported === false || typeof this.remote?.nativeKeyRefresh !== "function") return state;
    const generation = background ? ++this.generation : this.generation;
    this.setState({ quotaRefreshing: true, ...!background ? { action: "refresh" } : {} });
    const isCurrent = () => generation === this.generation && this.store.getSnapshot().providerId === providerId && (background ? !this.store.getSnapshot().action : this.store.getSnapshot().action === "refresh");
    try {
      const refreshed = await this.remoteCall("nativeKeyRefresh", { providerId }, this.operation("native.operation.refreshQuota", "Refresh live provider quota"));
      if (!isCurrent()) return null;
      if (refreshed) {
        this.applyHostStatus(refreshed);
        if (!background) this.setState({ status: "ready", error: null });
      }
    } catch (error2) {
      if (!isCurrent()) return null;
      if (!background) this.setState({ status: "ready", error: errorMessage(error2, this.t) });
    } finally {
      if (isCurrent()) this.setState({ quotaRefreshing: false, ...!background ? { action: null } : {} });
    }
    return this.store.getSnapshot();
  }
  async mutateProfile(providerId, ref, { clear = false } = {}) {
    const state = this.store.getSnapshot();
    if (state.providerId !== providerId || !state.namespace) await this.load(providerId);
    const current2 = this.store.getSnapshot();
    if (!current2.namespace) throw new Error(this.t?.("native.error.noWritableConfig") ?? "DSH did not return writable configuration for this provider");
    const profile = getPath(current2.namespace.value, current2.settingsPath);
    const path = [...current2.settingsPath, "apiKeyEnv"];
    const ops = clear ? [{ op: "unset", path }] : profile === void 0 && current2.settingsPath.length > 0 ? [{ op: "set", path: current2.settingsPath, value: { apiKeyEnv: ref } }] : [{ op: "set", path, value: ref }];
    const response = await this.api.settings.mutate({
      ns: current2.namespace.ns,
      ops,
      expectedRevision: current2.namespace.revision
    });
    resultValue(response, this.operation("native.operation.updateProviderKey", "Update provider Key configuration"));
  }
  async addKey(providerId, value, label = "") {
    const key = String(value ?? "").trim();
    if (!key) throw new Error(this.t?.("native.error.enterApiKey") ?? "Enter an API Key");
    ++this.generation;
    this.setState({ action: "add", status: "loading", providerId, quotaRefreshing: false, error: null, message: null });
    let ref = null;
    let namespace = null;
    let settingsPath = [];
    try {
      await this.ensure(providerId);
      this.setState({ action: "add", status: "loading" });
      const current2 = this.store.getSnapshot();
      if (!current2.native) throw new Error(this.t?.("native.error.notNativeProvider") ?? "The current model is not a native DSH API Key provider");
      namespace = current2.namespace;
      settingsPath = current2.settingsPath;
      ref = makeKeyRef(providerId);
      resultValue(await this.api.credentials.set({ ref, value: key }), this.operation("native.operation.saveApiKey", "Save API Key"));
      await this.mutateProfile(providerId, ref);
      const metadata = readMetadata(providerId);
      metadata.keys = [...metadata.keys.filter((entry) => entry.ref !== ref), {
        ref,
        label: String(label ?? "").trim() || `Key ${metadata.keys.length + 1}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }];
      writeMetadata(providerId, metadata);
      await this.remoteCall("nativeKeyRegister", { providerId, ref, label: metadata.keys.at(-1).label }, this.operation("native.operation.registerKey", "Register Dockyard Key"));
      await this.load(providerId);
      this.setState({ message: this.t?.("native.message.keySaved") ?? "The Key was written to DSH Credentials and set as the current Key.", action: null, status: "ready" });
      return this.store.getSnapshot();
    } catch (error2) {
      let retained = Boolean(ref);
      if (ref && namespace) {
        try {
          const settings = resultValue(await this.api.settings.describe({}), "Read provider configuration");
          const latest2 = settings.namespaces?.find((view) => view.ns === namespace.ns);
          if (latest2 && stringAt(getPath(latest2.value, settingsPath), "apiKeyEnv") !== ref) {
            resultValue(await this.api.credentials.unset({ ref }), "Remove unused API Key");
            retained = false;
          }
        } catch {
        }
      }
      const recovery = retained ? this.t?.("native.error.keyRetained", { ref }) ?? `Key ${ref} was kept. Refresh and check its configuration before removing it.` : "";
      this.setState({ action: null, status: "error", providerId, error: [errorMessage(error2, this.t), recovery].filter(Boolean).join(" "), message: null });
      return null;
    }
  }
  async selectKey(providerId, ref) {
    if (!ref) return null;
    ++this.generation;
    this.setState({ action: "select", status: "loading", providerId, quotaRefreshing: false, error: null, message: null });
    try {
      await this.ensure(providerId);
      this.setState({ action: "select", status: "loading" });
      const current2 = this.store.getSnapshot();
      const key = current2.keys.find((entry) => entry.ref === ref);
      if (!key) throw new Error(this.t?.("native.error.keyNotIndexed") ?? "This Key is missing from the local index");
      if (!key.configured) throw new Error(this.t?.("native.error.keyNotConfigured") ?? "This Key is not configured in DSH Credentials");
      await this.mutateProfile(providerId, ref);
      await this.remoteCall("nativeKeyRegister", { providerId, ref, label: key.label }, this.operation("native.operation.registerKey", "Register Dockyard Key"));
      await this.remoteCall("nativeKeySetPolicy", { providerId, policy: "manual" }, this.operation("native.operation.setManualKey", "Switch to manual Key"));
      const metadata = readMetadata(providerId);
      metadata.policy = "manual";
      writeMetadata(providerId, metadata);
      await this.load(providerId);
      this.setState({ message: this.t?.("native.message.keySelected", { label: key.label }) ?? `Switched to ${key.label}.`, action: null, status: "ready" });
      return this.store.getSnapshot();
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorMessage(error2, this.t) });
      return null;
    }
  }
  async removeKey(providerId, ref) {
    if (!ref) return null;
    ++this.generation;
    this.setState({ action: "remove", status: "loading", providerId, quotaRefreshing: false, error: null, message: null });
    try {
      await this.ensure(providerId);
      this.setState({ action: "remove", status: "loading" });
      const current2 = this.store.getSnapshot();
      const key = current2.keys.find((entry) => entry.ref === ref);
      if (!key) throw new Error(this.t?.("native.error.keyNotIndexed") ?? "This Key is missing from the local index");
      const remaining = current2.keys.filter((entry) => entry.ref !== ref && entry.configured);
      if (current2.apiKeyRef === ref) {
        if (remaining[0]) await this.mutateProfile(providerId, remaining[0].ref);
        else await this.mutateProfile(providerId, null, { clear: true });
      }
      const writable = key.credential?.writable !== false;
      if (writable) resultValue(await this.api.credentials.unset({ ref }), this.operation("native.operation.removeApiKey", "Remove API Key"));
      const metadata = readMetadata(providerId);
      metadata.keys = metadata.keys.filter((entry) => entry.ref !== ref);
      writeMetadata(providerId, metadata);
      try {
        await this.remoteCall("nativeKeyUnregister", { providerId, ref }, this.operation("native.operation.removeDockyardKey", "Remove Dockyard Key"));
      } catch {
      }
      await this.load(providerId);
      this.setState({
        message: writable ? this.t?.("native.message.keyRemoved", { label: key.label }) ?? `Removed ${key.label}.` : this.t?.("native.message.referenceRemoved", { label: key.label }) ?? `Unlinked ${key.label} from the provider; the original file credential was kept.`,
        action: null,
        status: "ready"
      });
      return this.store.getSnapshot();
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorMessage(error2, this.t) });
      return null;
    }
  }
  async setPolicy(providerId, policy) {
    if (!Object.hasOwn(NATIVE_KEY_POLICY_LABELS, policy)) return;
    ++this.generation;
    this.setState({ action: "policy", quotaRefreshing: false, error: null, message: null });
    try {
      await this.remoteCall("nativeKeySetPolicy", { providerId, policy }, this.operation("native.operation.updatePolicy", "Update Key policy"));
    } catch (error2) {
      this.setState({ action: null, error: errorMessage(error2, this.t) });
      return null;
    }
    const metadata = readMetadata(providerId);
    metadata.policy = policy;
    writeMetadata(providerId, metadata);
    this.setState({ action: null, policy, runtimeMode: "request-key-pool", message: policy === "manual" ? this.t?.("native.message.policyManual") ?? "Manual Key selection enabled." : policy === "round_robin" ? this.t?.("native.message.policyRoundRobin") ?? "Request-level Key round robin enabled." : this.t?.("native.message.policyFailover") ?? "Failover enabled: the next Key is tried automatically when the current Key fails." });
    return this.store.getSnapshot();
  }
};

// packages/dsh-plugin/src/model-selection.mjs
var sessionSelections = /* @__PURE__ */ new WeakMap();
var CANCELLED = Symbol("superseded model selection");
function chooseProviderModel({ providerId, groups, current: current2, lastModel, defaultSelection }) {
  const models = groups?.find((group) => group.id === providerId)?.models ?? [];
  const ids = models.map((model2) => model2?.id).filter((id) => typeof id === "string" && id.trim());
  const model = [current2?.model, lastModel, defaultSelection?.provider === providerId ? defaultSelection.model : null].find((id) => ids.includes(id)) ?? ids[0];
  return model ? { provider: providerId, model } : null;
}
function unwrap(response) {
  if (response?.ok === false) throw new Error(response.error?.message ?? response.error?.code ?? "Model selection failed");
  return response?.ok === true ? response.value : response;
}
var ProviderModelSelectionController = class {
  constructor(directory, { loadCatalog, timeoutMs = 15e3, noModels, timedOut, effortUnavailable } = {}) {
    __publicField(this, "store", createSnapshotStore({ providerId: null, pending: false, error: null }));
    __publicField(this, "active", null);
    this.directory = directory;
    this.loadCatalog = loadCatalog;
    this.timeoutMs = timeoutMs;
    this.noModels = noModels ?? "No available models. Connect an account or refresh the model catalog.";
    this.timedOut = timedOut ?? "Model selection timed out. Retry after the connection recovers.";
    this.effortUnavailable = effortUnavailable ?? "The selected reasoning effort is no longer available.";
    if (!sessionSelections.has(directory)) {
      sessionSelections.set(directory, { lastModels: /* @__PURE__ */ new Map(), submitted: Promise.resolve() });
    }
    this.session = sessionSelections.get(directory);
    this.lastModels = this.session.lastModels;
  }
  remember(selection) {
    if (!selection?.provider || !selection?.model) return;
    const signature = JSON.stringify([selection.provider, selection.model]);
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
    const gate = new Promise((_, reject) => {
      rejectGate = reject;
    });
    const request = { cancel: () => rejectGate(CANCELLED) };
    this.active = request;
    const timer = setTimeout(() => rejectGate(new Error(this.timedOut)), this.timeoutMs);
    const wait = (operation) => Promise.race([Promise.resolve(operation), gate]);
    gate.catch(() => {
    });
    this.store.set({ providerId, pending: true, error: null });
    this.remember(this.directory.store.getSnapshot().current);
    try {
      let state = await wait(this.directory.load());
      if (this.active !== request) return null;
      state = this.directory.store.getSnapshot() ?? state;
      let groups = state.groups;
      let failures = state.failures;
      let defaultSelection = null;
      const choose = (current2) => {
        if (!explicitSelection) return chooseProviderModel({
          providerId,
          groups,
          current: current2,
          lastModel: this.lastModels.get(providerId),
          defaultSelection
        });
        const model = groups?.find((group) => group.id === providerId)?.models.find((entry) => entry.id === explicitSelection.model && entry.id.trim());
        if (!model) return null;
        const selection2 = { provider: providerId, model: model.id };
        if (explicitSelection.reasoningEffort !== void 0) {
          if (!model.reasoning?.efforts?.some((effort) => effort.id === explicitSelection.reasoningEffort)) {
            throw new Error(this.effortUnavailable);
          }
          selection2.reasoningEffort = explicitSelection.reasoningEffort;
        }
        return selection2;
      };
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
      const latest2 = this.directory.store.getSnapshot();
      if (latest2.groups !== groupsAtRead) groups = latest2.groups;
      const selection = choose(latest2.current);
      if (!selection) throw new Error(`${providerId}: ${this.noModels}`);
      const submitted = Promise.resolve(this.directory.select(selection));
      this.session.submitted = submitted.catch(() => {
      });
      unwrap(await wait(submitted));
      if (this.active !== request) return null;
      this.lastModels.set(selection.provider, selection.model);
      this.store.set({ providerId, pending: false, error: null });
      return selection;
    } catch (error2) {
      if (this.active === request && error2 !== CANCELLED) {
        this.store.set({ providerId, pending: false, error: error2 instanceof Error ? error2.message : String(error2) });
      }
      return null;
    } finally {
      clearTimeout(timer);
      if (this.active === request) this.active = null;
    }
  }
};

// packages/dsh-plugin/src/quota-display.mjs
var HOUR = 60 * 60 * 1e3;
var DAY = 24 * HOUR;
var PERIOD_HINTS = [
  [/five[\s-]*hour|5[\s-]*hour|\b5h\b/i, 5 * 60 * 60 * 1e3],
  [/one[\s-]*hour|hourly|\b1h\b|\bhour\b/i, 60 * 60 * 1e3],
  [/one[\s-]*day|daily|\b24h\b|\b1d\b|\bday\b/i, 24 * 60 * 60 * 1e3],
  [/one[\s-]*week|weekly|\b7d\b|\bweek\b/i, 7 * 24 * 60 * 60 * 1e3],
  [/one[\s-]*month|monthly|\b30d\b|\bmonth\b/i, 30 * 24 * 60 * 60 * 1e3],
  [/yearly|annual|\b365d\b|\byear\b/i, 365 * 24 * 60 * 60 * 1e3]
];
function numericTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e10 ? value * 1e3 : value;
  }
  if (value instanceof Date) return value.getTime();
  if (value === null || value === void 0 || value === "") return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}
function periodHint(window2) {
  const label = `${window2?.id ?? ""} ${window2?.name ?? ""}`;
  return PERIOD_HINTS.find(([pattern]) => pattern.test(label))?.[1] ?? null;
}
function resetRemaining(window2, now) {
  const timestamp = numericTimestamp(window2?.resetAt);
  if (timestamp === null || timestamp <= now) return null;
  return timestamp - now;
}
function remainingFraction(window2) {
  const remaining = Number(window2?.remaining);
  const limit = Number(window2?.limit);
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) return null;
  return Math.max(0, Math.min(1, remaining / limit));
}
function numericValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function quotaWindowPeriod(window2) {
  const seconds = numericValue(window2?.windowSeconds);
  return seconds !== null && seconds > 0 ? seconds * 1e3 : periodHint(window2);
}
function comparisonValue(window2, now) {
  return quotaWindowPeriod(window2) ?? resetRemaining(window2, now) ?? Number.POSITIVE_INFINITY;
}
var MACHINE_NAME = /^[a-z0-9]+(?:[_.][a-z0-9]+)+$/i;
function quotaWindowLabel(window2, t) {
  const name = window2?.name ?? window2?.id ?? null;
  if (name && !MACHINE_NAME.test(name)) return name;
  const period = quotaWindowPeriod(window2);
  if (period >= HOUR) {
    const days = period / DAY;
    if (days === 1) return translate(t, "quota.window.daily");
    if (days === 7) return translate(t, "quota.window.weekly");
    if (days === 30) return translate(t, "quota.window.monthly");
    return Number.isInteger(days) ? translate(t, "quota.window.days", { count: days }) : translate(t, "quota.window.hours", { count: Math.round(period / HOUR * 10) / 10 });
  }
  return name ? name.replace(/[_.]+/g, " ") : translate(t, "value.quota");
}
function quotaLevel(percent) {
  return percent <= 10 ? "critical" : percent <= 25 ? "warning" : "healthy";
}
function selectPrimaryQuotaWindow(windows, now = Date.now()) {
  if (!Array.isArray(windows) || windows.length === 0) return null;
  return windows.reduce((selected, candidate) => {
    if (!selected) return candidate;
    const selectedValue = comparisonValue(selected, now);
    const candidateValue = comparisonValue(candidate, now);
    if (candidateValue < selectedValue) return candidate;
    if (candidateValue > selectedValue) return selected;
    const selectedFraction = remainingFraction(selected);
    const candidateFraction = remainingFraction(candidate);
    if (candidateFraction !== null && (selectedFraction === null || candidateFraction < selectedFraction)) return candidate;
    return selected;
  }, null);
}
function selectQuotaIndicator(windows, now = Date.now()) {
  const window2 = selectPrimaryQuotaWindow(windows, now);
  if (!window2) return null;
  const remaining = numericValue(window2.remaining);
  if (remaining === null) return null;
  if (window2.kind === "balance") {
    return { type: "balance", window: window2, remaining };
  }
  const limit = numericValue(window2.limit);
  if (limit === null || limit <= 0) return null;
  return {
    type: "quota",
    window: window2,
    remaining,
    percent: Math.max(0, Math.min(100, Math.round(remaining / limit * 100)))
  };
}

// packages/dsh-plugin/src/dockyard-client.mjs
var h = React.createElement;
var {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} = React;
var STYLE_ID = "dockyard-dsh-account-control";
var POLICY_KEYS = Object.freeze({
  manual: "policy.manual",
  sticky_session: "policy.sticky_session",
  round_robin: "policy.round_robin",
  failover: "policy.failover"
});
function text(t, key, params) {
  return translate(t, key, params);
}
function policyLabel(t, policy) {
  return text(t, POLICY_KEYS[policy] ?? "policy.manual");
}
var DOCKYARD_CHEVRON_PATH = "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z";
var POPUP_WIDTH = 440;
var POPUP_MAX_HEIGHT = 640;
var POPUP_MARGIN = 14;
var CSS = `
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
var modelGroupFoldState = /* @__PURE__ */ new Map();
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
  const english = menu.getAttribute("aria-label") === "Model and reasoning effort";
  for (const section of modelMenuSections(menu)) {
    const labelledBy = section.getAttribute("aria-labelledby");
    const title = [...section.children].find((child) => child.id === labelledBy) ?? section.querySelector(".dockyard-dsh-model-group-toggle");
    if (!title) continue;
    const options = [...section.children].filter((child) => child.getAttribute("role") === "menuitemradio");
    if (options.length === 0) continue;
    const key = `${title.textContent?.trim() ?? "provider"}`;
    const stored = modelGroupFoldState.get(key);
    const hasCheckedModel = options.some((child) => child.getAttribute("aria-checked") === "true");
    const collapsed = hasCheckedModel ? false : stored === true;
    modelGroupFoldState.set(key, collapsed);
    section.dataset.dockyardModelGroupCollapsed = String(collapsed);
    title.classList.add("dockyard-dsh-model-group-toggle");
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.setAttribute("aria-expanded", String(!collapsed));
    title.setAttribute("title", collapsed ? english ? "Expand model" : "\u5C55\u5F00\u6A21\u578B" : english ? "Collapse model" : "\u6298\u53E0\u6A21\u578B");
    syncModelGroupChevron(title, !collapsed);
  }
}
function installModelMenuFolding() {
  if (typeof document === "undefined" || !document.body || typeof MutationObserver === "undefined") return () => {
  };
  const boundMenus = /* @__PURE__ */ new Set();
  const menuSelector = '[role="menu"][aria-label="\u6A21\u578B\u4E0E\u63A8\u7406\u7B49\u7EA7"], [role="menu"][aria-label="Model and reasoning effort"]';
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
    if (records.some(({ target, addedNodes, removedNodes }) => [...addedNodes, ...removedNodes, target].some((node) => node.nodeType === 1 && (node.matches(menuSelector) || node.closest(menuSelector) || node.querySelector(menuSelector))))) sync();
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
function errorText(error2, t) {
  if (error2 instanceof Error) return error2.message;
  return String(error2 ?? text(t, "error.unknown"));
}
function refreshResultMessage(result, t) {
  if (!Array.isArray(result)) return null;
  const failures = result.reduce((count, entry) => count + (Array.isArray(entry?.diagnostics) && entry.diagnostics.length > 0 ? 1 : 0), 0);
  if (result.length === 0) return text(t, "status.noConnectedAccounts");
  if (failures === 0) return text(t, "status.refreshedAccounts", { count: result.length });
  return text(t, "status.refreshPartial", {
    success: result.length - failures,
    total: result.length,
    failures
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
    ...Array.isArray(provider.accounts) ? provider.accounts.map((account) => account?.accountId).filter(Boolean).sort() : []
  ].join(":")).join("|");
}
function localeTag(t) {
  const tag = text(t, "intl.locale");
  return tag === "intl.locale" ? void 0 : tag;
}
function formatDate(value, t) {
  if (!value) return text(t, "value.notReturned");
  const date3 = new Date(value);
  return Number.isNaN(date3.getTime()) ? String(value) : date3.toLocaleString(localeTag(t));
}
function formatNumber(value, t) {
  if (value === null || value === void 0) return text(t, "value.unknown");
  return typeof value === "number" ? new Intl.NumberFormat(localeTag(t)).format(value) : String(value);
}
function durationLabel(milliseconds, t) {
  const minutes = Math.max(1, Math.round(Math.abs(milliseconds) / 6e4));
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
    updatedAt: quota.updatedAt
  }];
  return [];
}
function quotaPercent(window2) {
  if (typeof window2?.remaining !== "number" || typeof window2?.limit !== "number" || window2.limit <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(window2.remaining / window2.limit * 100)));
}
function quotaResetLabel(window2, t, now = Date.now()) {
  const time3 = window2?.resetAt ? new Date(window2.resetAt).getTime() : Number.NaN;
  if (Number.isNaN(time3)) return null;
  if (time3 <= now) return text(t, "quota.resetDue");
  if (time3 - now < 6e4) return text(t, "quota.resetSoon");
  return text(t, "quota.resetsIn", { time: durationLabel(time3 - now, t) });
}
function quotaUpdatedLabel(value, t, now = Date.now()) {
  const time3 = value ? new Date(value).getTime() : Number.NaN;
  if (Number.isNaN(time3)) return null;
  return now - time3 < 6e4 ? text(t, "quota.updatedNow") : text(t, "quota.updatedAgo", { time: durationLabel(now - time3, t) });
}
function balanceCurrency(window2) {
  const raw = String(window2?.currency ?? window2?.unit ?? "").trim().toUpperCase();
  const normalized = raw === "RMB" ? "CNY" : raw;
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}
function formatBalance(window2, t, value = window2?.remaining) {
  if (value === null || value === void 0 || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  const currency = balanceCurrency(window2);
  if (!Number.isFinite(amount) || !currency) return null;
  try {
    return new Intl.NumberFormat(localeTag(t), {
      style: "currency",
      currency,
      maximumFractionDigits: 2
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
function accountIdentityLine(account, t) {
  const identitySource = account?.resources?.identitySource;
  if (account?.email && account?.resources?.authSource === "official_cursor_browser_oauth") return text(t, "identity.cursorBrowser");
  if (["official_cli_auth_status", "official_client_auth_status"].includes(identitySource)) return text(t, "identity.officialLogin");
  if (account?.resources?.sessionFingerprint) return text(t, "identity.sessionFingerprint", { fingerprint: account.resources.sessionFingerprint });
  return null;
}
function healthLabel(status, t) {
  return status === "healthy" ? text(t, "health.healthy") : status === "degraded" ? text(t, "health.degraded") : status === "cooldown" ? text(t, "health.cooldown") : status === "expired" ? text(t, "health.expired") : status === "exhausted" ? text(t, "health.exhausted") : status ?? text(t, "health.unknown");
}
function healthState(status) {
  return status === "healthy" ? "ok" : ["degraded", "cooldown"].includes(status) ? "warn" : ["expired", "exhausted"].includes(status) ? "error" : "idle";
}
function providerOverview(provider, t) {
  const accounts = provider?.accounts ?? [];
  if (accounts.length === 0) return { state: "idle", label: text(t, "summary.notConnected") };
  const selected = providerAccount(provider);
  if (!selected) {
    const states = accounts.map((account) => healthState(account?.health?.status));
    const state2 = states.every((entry) => entry === "error") ? "error" : states.some((entry) => entry === "error" || entry === "warn") ? "warn" : "ok";
    return { state: state2, label: text(t, "summary.accountCount", { count: accounts.length }) };
  }
  const state = healthState(selected.health?.status);
  if (state === "error" || state === "warn") return { state, label: healthLabel(selected.health.status, t) };
  const indicator = selectQuotaIndicator(quotaWindowRows(selected.quota, t));
  if (indicator?.type === "quota") return { state, label: `${indicator.percent}%`, percent: indicator.percent };
  return { state, label: (indicator?.type === "balance" ? formatBalance(indicator.window, t) : null) ?? text(t, "summary.connected") };
}
var DockyardClientController = class {
  constructor(remote, t) {
    __publicField(this, "remote");
    __publicField(this, "store", createSnapshotStore({
      snapshot: null,
      status: "idle",
      action: null,
      providerId: null,
      error: null,
      message: null,
      scan: null,
      auth: null
    }));
    __publicField(this, "snapshotPromise", null);
    __publicField(this, "refreshPromises", /* @__PURE__ */ new Map());
    __publicField(this, "authTimers", /* @__PURE__ */ new Map());
    __publicField(this, "authPolling", /* @__PURE__ */ new Set());
    // Per-session poll generation. Cancelling (or rescheduling) bumps the
    // generation so an in-flight poll RPC can no longer apply its stale result
    // over the cancelled/newer state.
    __publicField(this, "authGenerations", /* @__PURE__ */ new Map());
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
      auth: ["pending", "processing"].includes(this.store.getSnapshot().auth?.status) ? this.store.getSnapshot().auth : null
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
        diagnostic: result.diagnostic ?? null
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
    const current2 = this.store.getSnapshot().snapshot;
    if (current2?.providers) return current2;
    if (this.snapshotPromise) return this.snapshotPromise;
    this.setState({ status: "loading", error: null });
    this.snapshotPromise = this.call("snapshot").then((value) => {
      const snapshot = this.applyValue(value);
      this.setState({ status: "ready", error: null });
      return snapshot;
    }).catch((error2) => {
      this.setState({ status: "error", error: errorText(error2, this.t) });
      throw error2;
    }).finally(() => {
      this.snapshotPromise = null;
    });
    return this.snapshotPromise;
  }
  async ensure(providerId) {
    const current2 = await this.ensureSnapshot();
    return providerId ? providerFromSnapshot(current2, providerId) ?? current2 : current2;
  }
  async refresh(providerId = null, { background = false } = {}) {
    const state = this.store.getSnapshot();
    if (background && (globalThis.document?.hidden || state.action || ["pending", "processing"].includes(state.auth?.status))) return null;
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
        const latest2 = this.store.getSnapshot();
        if (background && (latest2.action || latest2.snapshot !== state.snapshot)) return null;
        const result = this.applyValue(value, providerId, { preserveControl: background });
        if (!background) this.setState({ message: refreshResultMessage(result, this.t) });
        return result;
      } catch (error2) {
        if (!background) this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
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
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
      return null;
    }
  }
  async refreshDiscovery(providerId) {
    try {
      const value = await this.call("scan", { providerId });
      return { result: this.applyValue(value, providerId, { preserveControl: true }), error: null };
    } catch (error2) {
      return { result: null, error: errorText(error2, this.t) };
    }
  }
  async add(providerId, candidateId) {
    this.setState({ action: "add", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("add", { providerId, ...candidateId ? { candidateId } : {} });
      const result = this.applyValue(value, providerId);
      const count = result?.accounts?.length ?? 0;
      const discovery = await this.refreshDiscovery(providerId);
      const scanNotice = discovery.error ? text(this.t, "status.discoveryRefreshFailed", { error: discovery.error }) : null;
      this.setState({ message: scanNotice ?? (count ? text(this.t, "status.accountAdded", { count }) : text(this.t, "status.noNewOAuthCandidates")) });
      return result;
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
      return null;
    }
  }
  async login(providerId) {
    const current2 = this.store.getSnapshot();
    if (current2.action) return null;
    if (["pending", "processing"].includes(current2.auth?.status) && current2.auth.sessionId) {
      const authProviderId = current2.auth.providerId;
      if (authProviderId === providerId) this.scheduleAuth(authProviderId, current2.auth.sessionId);
      this.setState({ providerId, status: "ready", error: null, message: text(
        this.t,
        authProviderId === providerId ? "status.oauthInProgress" : "status.oauthOtherInProgress",
        { provider: providerDisplayName(authProviderId, providerFromSnapshot(current2.snapshot, authProviderId)?.manifest, this.t) }
      ) });
      return current2.auth;
    }
    if (current2.auth?.sessionId) this.stopAuth(current2.auth.sessionId);
    this.setState({ action: "login", status: "loading", providerId, error: null, message: null, auth: null });
    let authWindow = null;
    try {
      if (typeof window !== "undefined" && typeof window.open === "function") authWindow = window.open("about:blank", "dockyard-dsh-oauth", "popup");
      if (authWindow) authWindow.opener = null;
    } catch {
    }
    try {
      const location = typeof window !== "undefined" ? window.location : null;
      const localPage = ["localhost", "127.0.0.1", "[::1]"].includes(location?.hostname) || location?.protocol === "dsh-app:" && location?.hostname === "app";
      const hostBrowserFallback = (!authWindow || authWindow.closed) && localPage;
      const value = await this.call("login", { providerId, ...hostBrowserFallback ? { openBrowser: true } : {} });
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
        } catch {
          authWindow?.close?.();
        }
        const auth = this.store.getSnapshot().auth;
        if (auth) this.setState({ auth: { ...auth, browserOpenFailed: !opened } });
      } else {
        authWindow?.close?.();
      }
      if (["pending", "processing"].includes(result?.status) && result.sessionId) {
        this.scheduleAuth(providerId, result.sessionId);
      }
      return result;
    } catch (error2) {
      authWindow?.close?.();
      this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
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
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
      return null;
    }
  }
  scheduleAuth(providerId, sessionId) {
    if (this.authPolling.has(sessionId)) return;
    this.authPolling.add(sessionId);
    const deadline = Date.now() + 11 * 60 * 1e3;
    const generation = (this.authGenerations.get(sessionId) ?? 0) + 1;
    this.authGenerations.set(sessionId, generation);
    let pollFailed = false;
    const tick = async () => {
      this.authTimers.delete(sessionId);
      if (this.authGenerations.get(sessionId) !== generation) return;
      if (Date.now() >= deadline) {
        this.stopAuth(sessionId);
        this.setState({ error: text(this.t, "status.oauthPollTimeout"), message: null });
        return;
      }
      const before = this.store.getSnapshot();
      try {
        const value = await this.call("poll", { providerId, sessionId });
        if (this.authGenerations.get(sessionId) !== generation) return;
        const latest2 = this.store.getSnapshot();
        const waiting = ["pending", "processing"].includes(value?.result?.status) && !pollFailed;
        pollFailed = false;
        const result = this.applyValue(
          latest2.snapshot !== before.snapshot ? { ...value, snapshot: latest2.snapshot } : value,
          providerId,
          { preserveControl: Boolean(latest2.action) || waiting }
        );
        if (["pending", "processing"].includes(result?.status)) {
          const timer = setTimeout(tick, 1e3);
          this.authTimers.set(sessionId, timer);
        }
      } catch (error2) {
        if (this.authGenerations.get(sessionId) !== generation) return;
        if (this.store.getSnapshot().action) {
          this.authTimers.set(sessionId, setTimeout(tick, 1e3));
          return;
        }
        pollFailed = true;
        this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
        this.authTimers.set(sessionId, setTimeout(tick, 1e3));
      }
    };
    this.authTimers.set(sessionId, setTimeout(tick, 1e3));
  }
  stopAuth(sessionId) {
    const timer = this.authTimers.get(sessionId);
    if (timer) clearTimeout(timer);
    this.authTimers.delete(sessionId);
    this.authPolling.delete(sessionId);
    this.authGenerations.set(sessionId, (this.authGenerations.get(sessionId) ?? 0) + 1);
  }
  async cancelAuthorization(providerId, sessionId) {
    this.stopAuth(sessionId);
    this.setState({ action: "cancel", status: "loading", providerId, error: null, message: null });
    try {
      const value = await this.call("cancel", { providerId, sessionId });
      this.applyValue(value, providerId);
      this.setState({ auth: null, action: null, status: "ready", message: text(this.t, "status.oauthCancelled") });
      return value;
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
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
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
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
      const scanNotice = discovery.error ? text(this.t, "status.discoveryRefreshFailed", { error: discovery.error }) : "";
      const provider = providerFromSnapshot(this.store.getSnapshot().snapshot, providerId);
      const supportsOAuthLogin = provider?.manifest?.capabilities?.includes("oauth_authorization");
      const reentry = supportsOAuthLogin ? text(this.t, "status.reentryOAuth") : text(this.t, "status.reentryScan");
      this.setState({ message: text(this.t, "status.accountRemoved", {
        details: diagnostics,
        scanNotice: scanNotice ? `; ${scanNotice}` : "",
        reentry
      }) });
      return value;
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
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
    } catch (error2) {
      this.setState({ action: null, status: "error", providerId, error: errorText(error2, this.t) });
      return null;
    }
  }
  dispose() {
    for (const timer of this.authTimers.values()) clearTimeout(timer);
    this.authTimers.clear();
    this.authPolling.clear();
    this.authGenerations.clear();
  }
};
function modelDetails(directoryState, providerId = null) {
  const selected = directoryState?.current ?? null;
  const targetProviderId = providerId ?? selected?.provider ?? null;
  const group = targetProviderId ? directoryState?.groups?.find((entry) => entry.id === targetProviderId) ?? null : null;
  const current2 = selected && (!providerId || selected.provider === providerId) ? selected : null;
  if (!current2) return { current: null, group, model: null, efforts: [] };
  const model = group?.models?.find((entry) => entry.id === current2.model) ?? null;
  const efforts = model?.reasoning?.efforts ?? [];
  return { current: current2, group, model, efforts };
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
  if (value === null || value === void 0 || String(value).trim() === "") return null;
  const numeric = Number(String(value).replaceAll(",", "").trim());
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}
var ICONS = Object.freeze({
  close: "M4 4l8 8M12 4l-8 8",
  back: "M10 3.5 5.5 8l4.5 4.5",
  forward: "M6 3.5 10.5 8 6 12.5",
  refresh: "M12.2 5.2A5 5 0 1 0 13 8M12.6 2.5v2.9H9.7",
  add: "M8 3.5v9M3.5 8h9"
});
function Icon({ name, spin = false }) {
  return h("svg", {
    className: "dockyard-dsh-icon",
    viewBox: "0 0 16 16",
    focusable: "false",
    "aria-hidden": true,
    "data-spin": spin || void 0
  }, h("path", { d: ICONS[name] }));
}
function IconButton({ icon, label, spin = false, ...props }) {
  return h("button", {
    type: "button",
    className: "dockyard-dsh-icon-button",
    "aria-label": label,
    title: label,
    ...props
  }, h(Icon, { name: icon, spin }));
}
function button(variant, props, ...children) {
  return h("button", {
    type: "button",
    className: "dockyard-dsh-button",
    "data-variant": variant ?? void 0,
    ...props
  }, ...children);
}
function problem(message, tone = void 0) {
  return h("div", { className: "dockyard-dsh-problem", role: "alert", "data-tone": tone }, h("span", null, message));
}
function ChevronIcon({ open }) {
  return h("span", {
    className: "dockyard-dsh-chevron",
    "data-open": Boolean(open),
    "aria-hidden": true
  }, h("svg", {
    viewBox: "0 0 14 14",
    focusable: "false",
    "aria-hidden": true
  }, h("path", {
    d: DOCKYARD_CHEVRON_PATH,
    fill: "currentColor"
  })));
}
function Meter({ percent, level = quotaLevel(percent), label = null, loading = false }) {
  return h("span", {
    className: "dockyard-dsh-meter",
    "data-level": level,
    "data-loading": loading || void 0,
    ...label ? {
      role: "meter",
      "aria-label": label,
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": percent
    } : { "aria-hidden": true }
  }, h("span", { className: "dockyard-dsh-meter-fill", style: { width: `${percent}%` } }));
}
function Disclosure({ title, value = null, open, onToggle, children }) {
  return h(
    "details",
    {
      className: "dockyard-dsh-disclosure",
      open,
      onToggle: (event) => onToggle(event.currentTarget.open)
    },
    h(
      "summary",
      null,
      h("span", null, title),
      value ? h("span", { className: "dockyard-dsh-disclosure-value" }, value) : null,
      h(ChevronIcon, { open })
    ),
    open ? h("div", { className: "dockyard-dsh-disclosure-body" }, children) : null
  );
}
function ContextWindowSection({ providerId, current: current2, model, accountId = null, keyRef = null, remote, t }) {
  const modelId = current2?.model ?? null;
  const detected = modelContextWindow(model);
  const scope = {
    providerId,
    modelId,
    ...accountId ? { accountId } : {},
    ...keyRef ? { keyRef } : {}
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
      return void 0;
    }
    Promise.resolve(remote.getContextWindowOverride(scope)).then((response) => unwrapRemote(response, t)).then((value) => {
      if (cancelled) return;
      const override = normalizeDraftContextWindow(value?.override);
      const effectiveOverride = normalizeDraftContextWindow(value?.effectiveOverride);
      setState({
        status: "ready",
        override,
        effectiveOverride,
        source: value?.source ?? (override !== null ? "custom" : "auto")
      });
      setMode(override !== null ? "custom" : "auto");
      setDraft(override === null ? "" : String(override));
    }).catch((error2) => {
      if (cancelled) return;
      setState({ status: "error", override: null, effectiveOverride: null, source: "auto" });
      setMessage({ error: true, text: errorText(error2, t) });
    });
    return () => {
      cancelled = true;
    };
  }, [remote, providerId, modelId, accountId, keyRef]);
  if (!modelId) return null;
  const effective = state.effectiveOverride ?? detected;
  const pending = mode === "custom" ? normalizeDraftContextWindow(draft) : null;
  const invalid = mode === "custom" && draft.trim() !== "" && pending === null;
  const dirty = mode === "custom" ? pending !== null && pending !== state.override : state.override !== null;
  const tokens = (value) => value === null ? text(t, "contextWindow.noDetected") : `${formatNumber(value, t)} tokens`;
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
        source: saved?.source ?? (override !== null ? "custom" : "auto")
      });
      setMode(override !== null ? "custom" : "auto");
      setDraft(override === null ? "" : String(override));
      setMessage({ error: false, text: text(t, "contextWindow.saved") });
    } catch (error2) {
      setMessage({ error: true, text: errorText(error2, t) });
    } finally {
      setBusy(false);
    }
  };
  return h(
    React.Fragment,
    null,
    h(
      "span",
      { className: "dockyard-dsh-field-label" },
      text(t, "contextWindow.title"),
      h("small", null, contextWindowScopeLabel(scope, t))
    ),
    h(
      "div",
      { className: "dockyard-dsh-field-control" },
      h(
        "select",
        {
          className: "dockyard-dsh-select",
          "aria-label": text(t, "contextWindow.title"),
          value: mode,
          disabled: busy || state.status === "loading",
          onChange: (event) => {
            setMode(event.target.value);
            setMessage(null);
            if (event.target.value !== "custom") setDraft("");
          }
        },
        h("option", { value: "auto" }, text(t, "contextWindow.auto")),
        h("option", { value: "custom" }, text(t, "contextWindow.custom"))
      ),
      mode === "custom" ? h("input", {
        className: "dockyard-dsh-input",
        type: "number",
        min: "1",
        step: "1",
        value: draft,
        placeholder: text(t, "contextWindow.placeholder"),
        "aria-label": text(t, "contextWindow.placeholder"),
        "aria-invalid": invalid || void 0,
        disabled: busy,
        onChange: (event) => setDraft(event.target.value),
        onKeyDown: (event) => {
          if (event.key === "Enter") void save();
        }
      }) : null,
      dirty || busy ? button("primary", { disabled: busy, onClick: save }, text(t, busy ? "contextWindow.saving" : "contextWindow.save")) : null
    ),
    h(
      "div",
      { className: "dockyard-dsh-note dockyard-dsh-facts" },
      h("span", null, text(t, "contextWindow.effective", { value: tokens(effective) })),
      h("span", null, text(t, "contextWindow.detected", { value: tokens(detected) }))
    ),
    invalid ? h("div", { className: "dockyard-dsh-note", role: "alert" }, text(t, "contextWindow.invalid")) : mode === "custom" ? h("div", { className: "dockyard-dsh-note" }, text(t, "contextWindow.warning")) : null,
    message?.error ? problem(message.text) : message ? h("div", { className: "dockyard-dsh-note", role: "status" }, message.text) : null
  );
}
function QuotaList({ quota, fallback = null, t }) {
  const rows = quotaWindowRows(quota, t);
  if (rows.length === 0) return fallback;
  const updatedAt = quota?.updatedAt ?? rows.map((window2) => window2.updatedAt).filter(Boolean).sort().at(-1);
  const updated = quotaUpdatedLabel(updatedAt, t);
  return h(
    "div",
    { className: "dockyard-dsh-quota" },
    rows.map((window2, index) => {
      const label = quotaWindowLabel(window2, t);
      const money = window2.kind === "balance" ? formatBalance(window2, t) : null;
      const percent = window2.kind === "balance" ? null : quotaPercent(window2);
      const hasLimit = window2.limit !== null && window2.limit !== void 0;
      const value = money !== null ? `${money}${hasLimit ? ` / ${formatBalance(window2, t, window2.limit) ?? formatNumber(window2.limit, t)}` : ""}` : percent !== null ? `${percent}%` : `${formatNumber(window2.remaining, t)}${hasLimit ? ` / ${formatNumber(window2.limit, t)}` : ""}${window2.unit ? ` ${window2.unit}` : ""}`;
      const reset = quotaResetLabel(window2, t);
      return h(
        "div",
        { className: "dockyard-dsh-quota-row", key: `${window2.id ?? "quota"}-${index}` },
        h("span", { className: "dockyard-dsh-quota-label", title: window2.id ?? void 0 }, label),
        reset ? h("span", { className: "dockyard-dsh-quota-reset", title: formatDate(window2.resetAt, t) }, reset) : null,
        h("span", { className: "dockyard-dsh-quota-value" }, value),
        percent === null ? null : h(Meter, { percent, label })
      );
    }),
    updated ? h("div", { className: "dockyard-dsh-note", title: formatDate(updatedAt, t) }, updated) : null
  );
}
function usageLink(url, t) {
  return url ? [" ", h("a", { key: "usage", href: url, target: "_blank", rel: "noreferrer noopener" }, text(t, "quota.openUsage"))] : null;
}
function AccountRow({ account, current: current2, providerId, controller, busy, canAuthorize, t }) {
  const [confirming, setConfirming] = useState(false);
  const status = account?.health?.status;
  const state = healthState(status);
  const name = accountName(account, t);
  const identity = accountIdentityLine(account, t);
  const detail = account.health?.lastError;
  const named = (key) => `${text(t, key)} ${name}`;
  return h(
    "div",
    { className: "dockyard-dsh-account" },
    h(
      "div",
      { className: "dockyard-dsh-account-head" },
      h("span", { className: "dockyard-dsh-dot", "data-state": state, role: "img", "aria-label": healthLabel(status, t), title: healthLabel(status, t) }),
      h(
        "div",
        { className: "dockyard-dsh-account-identity" },
        h("div", { className: "dockyard-dsh-account-name", title: account.accountId }, name),
        identity ? h("div", { className: "dockyard-dsh-account-id" }, identity) : null
      ),
      account.subscription?.plan ? h("span", { className: "dockyard-dsh-tag", "data-plan": "" }, account.subscription.plan) : null,
      // Confirm in place. Cancel takes the spot Remove had, so a double click cannot confirm.
      h("div", { className: "dockyard-dsh-account-actions" }, confirming ? [
        button("danger-solid", {
          key: "confirm",
          disabled: busy,
          "aria-label": named("account.confirmRemove"),
          onClick: () => {
            setConfirming(false);
            controller.removeAccount(providerId, account.accountId);
          }
        }, text(t, "account.confirmRemove")),
        button(null, { key: "cancel", autoFocus: true, onClick: () => setConfirming(false) }, text(t, "ui.cancel"))
      ] : [
        current2 ? h("span", { key: "current", className: "dockyard-dsh-tag", "data-tone": "info" }, text(t, "account.current")) : status === "expired" ? null : button("ghost", {
          key: "use",
          disabled: busy,
          title: text(t, "account.useHint"),
          "aria-label": named("account.use"),
          onClick: () => controller.selectAccount(providerId, account.accountId)
        }, text(t, "account.use")),
        button("danger", {
          key: "remove",
          disabled: busy,
          "aria-label": named("account.remove"),
          onClick: () => setConfirming(true)
        }, text(t, "account.remove"))
      ])
    ),
    confirming ? h("div", { className: "dockyard-dsh-note" }, text(t, "account.removeHint")) : null,
    state === "warn" || state === "error" || detail ? h(
      "div",
      { className: "dockyard-dsh-problem", "data-tone": state === "error" ? void 0 : "warning" },
      h("span", null, detail ? text(t, "account.problem", { status: healthLabel(status, t), detail }) : healthLabel(status, t)),
      status === "expired" && canAuthorize ? button(null, { disabled: busy, "aria-label": named("auth.reauthorize"), onClick: () => controller.login(providerId) }, text(t, "auth.reauthorize")) : null
    ) : null,
    account.resources?.identityNote ? h("div", { className: "dockyard-dsh-note" }, account.resources.identityNote) : null,
    h(QuotaList, {
      quota: account.quota,
      t,
      // An account that must sign in again has no quota worth explaining.
      fallback: status === "expired" ? null : h(
        "div",
        { className: "dockyard-dsh-note" },
        account.resources?.quotaDiagnostic ?? text(t, "quota.noWindow"),
        usageLink(account.resources?.quotaUrl, t)
      )
    })
  );
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
  const candidates = (provider?.candidates ?? []).filter((candidate) => !candidate.imported && !accounts.some((account) => candidateMatchesAccount(candidate, account)));
  if (candidates.length === 0) {
    return h(
      "div",
      { className: "dockyard-dsh-note" },
      provider?.diagnostics?.length ? provider.diagnostics.join("\uFF1B") : text(t, "candidate.noNew")
    );
  }
  return h("div", { className: "dockyard-dsh-list" }, candidates.map((candidate) => h("div", {
    className: "dockyard-dsh-account",
    key: candidate.candidateId
  }, h(
    "div",
    { className: "dockyard-dsh-account-head" },
    h(
      "div",
      { className: "dockyard-dsh-account-identity" },
      h("div", { className: "dockyard-dsh-account-name" }, candidate.email ?? candidate.displayName ?? candidate.candidateId)
    ),
    button(null, { disabled: busy, onClick: () => controller.add(providerId, candidate.candidateId) }, text(t, "candidate.add"))
  ))));
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
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(auth.authorizationUrl);
      setCopied(true);
    } catch {
    }
  };
  if (!active) return h(
    "div",
    { className: "dockyard-dsh-login-guide" },
    problem(auth.diagnostic ?? auth.instructions ?? text(t, "status.oauthEnded")),
    h(
      "div",
      { className: "dockyard-dsh-toolbar" },
      button("primary", { disabled: busy, onClick: () => controller.login(providerId) }, text(t, "auth.restart"))
    )
  );
  return h(
    "div",
    { className: "dockyard-dsh-login-guide" },
    h(
      "div",
      { className: "dockyard-dsh-login-guide-title" },
      h("span", { className: "dockyard-dsh-spinner", "aria-hidden": true }),
      text(t, auth.terminalOpened ? "auth.terminalTitle" : "auth.browserTitle", { provider: providerName })
    ),
    h("div", { className: "dockyard-dsh-note" }, auth.browserOpenFailed ? text(t, "auth.popupBlocked") : auth.instructions ?? text(t, "auth.intro")),
    auth.terminalOpened ? null : h(
      "ol",
      { className: "dockyard-dsh-login-guide-steps" },
      h("li", null, text(t, "auth.step1")),
      h("li", null, text(t, "auth.step2")),
      auth.authorizationCodeRequired ? h("li", null, text(t, "auth.step3")) : null
    ),
    auth.authorizationCodeRequired ? h(
      "form",
      { className: "dockyard-dsh-login-guide-code", onSubmit: submit },
      h("input", {
        className: "dockyard-dsh-input",
        value: code,
        disabled: busy,
        onChange: (event) => setCode(event.target.value),
        placeholder: text(t, "auth.callbackPlaceholder"),
        "aria-label": text(t, "auth.callbackAria"),
        autoComplete: "off",
        spellCheck: false
      }),
      button("primary", { type: "submit", disabled: busy || !code.trim() }, text(t, "auth.submit"))
    ) : null,
    auth.diagnostic ? problem(auth.diagnostic, "warning") : null,
    h(
      "div",
      { className: "dockyard-dsh-toolbar" },
      auth.authorizationUrl ? h("a", {
        className: "dockyard-dsh-button",
        "data-variant": auth.browserOpenFailed ? "primary" : void 0,
        href: auth.authorizationUrl,
        target: "_blank",
        rel: "noopener noreferrer"
      }, text(t, "auth.reopen")) : null,
      auth.authorizationUrl && globalThis.navigator?.clipboard?.writeText ? button(null, { onClick: copyLink }, text(t, copied ? "auth.linkCopied" : "auth.copyLink")) : null,
      auth.sessionId ? button("danger", {
        disabled: busy,
        onClick: () => controller.cancelAuthorization(providerId, auth.sessionId)
      }, text(t, canceling ? "status.canceling" : "auth.cancel")) : null
    )
  );
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
  const current2 = entry?.active === true;
  const writable = entry?.credential?.writable !== false;
  const label = entry?.label ?? entry?.ref ?? text(t, "title.key");
  const stateLabel = text(t, configured ? "native.configured" : "native.unconfigured");
  const named = (key) => `${text(t, key)} ${label}`;
  const facts = [
    configured ? null : stateLabel,
    entry?.implicit ? text(t, "native.fromProviderConfig") : null,
    entry?.credential?.source ? text(t, "native.source", { source: entry.credential.source }) : null
  ].filter(Boolean);
  return h(
    "div",
    { className: "dockyard-dsh-account" },
    h(
      "div",
      { className: "dockyard-dsh-account-head" },
      h("span", { className: "dockyard-dsh-dot", "data-state": configured ? "ok" : "warn", role: "img", "aria-label": stateLabel, title: stateLabel }),
      h(
        "div",
        { className: "dockyard-dsh-account-identity" },
        h("div", { className: "dockyard-dsh-account-name", title: entry?.ref }, label),
        facts.length ? h("div", { className: "dockyard-dsh-account-id" }, facts.map((fact) => h("span", { key: fact }, fact))) : null
      ),
      h("div", { className: "dockyard-dsh-account-actions" }, confirming ? [
        button("danger-solid", {
          key: "confirm",
          disabled: busy,
          "aria-label": named(writable ? "native.confirmRemove" : "native.confirmUnlink"),
          onClick: () => {
            setConfirming(false);
            controller.removeKey(providerId, entry.ref);
          }
        }, text(t, writable ? "native.confirmRemove" : "native.confirmUnlink")),
        button(null, { key: "cancel", autoFocus: true, onClick: () => setConfirming(false) }, text(t, "ui.cancel"))
      ] : [
        current2 ? h("span", { key: "current", className: "dockyard-dsh-tag", "data-tone": "info" }, text(t, "native.currentKey")) : button("ghost", {
          key: "use",
          disabled: busy || !configured,
          "aria-label": named("native.use"),
          onClick: () => controller.selectKey(providerId, entry.ref)
        }, text(t, "native.use")),
        button("danger", {
          key: "remove",
          disabled: busy,
          "aria-label": named(writable ? "native.remove" : "native.unlinkReference"),
          onClick: () => setConfirming(true)
        }, text(t, writable ? "native.remove" : "native.unlinkReference"))
      ])
    ),
    confirming ? h("div", { className: "dockyard-dsh-note" }, text(t, writable ? "native.removeTitle" : "native.unlinkTitle")) : null,
    entry?.usage && entry.usage.status !== "unsupported" ? nativeQuotaView(entry, t) : null
  );
}
function ModelEffortField({ current: current2, model, efforts, directory, modelSelector, disabled = false, t }) {
  const [busy, setBusy] = useState(false);
  const [error2, setError] = useState(null);
  if (efforts.length === 0) return null;
  const tier = current2?.reasoningEffort ?? model?.reasoning?.defaultEffort;
  const select = async (reasoningEffort) => {
    if (!current2 || !directory || busy || disabled || reasoningEffort === tier) return;
    setBusy(true);
    setError(null);
    try {
      const selection = { ...current2, reasoningEffort };
      if (modelSelector) await modelSelector.selectModel(selection);
      else unwrapRemote(await directory.select(selection), t);
    } catch (error3) {
      setError(errorText(error3, t));
    } finally {
      setBusy(false);
    }
  };
  return h(
    React.Fragment,
    null,
    h("span", { className: "dockyard-dsh-field-label" }, text(t, "ui.reasoningEffort")),
    h(
      "div",
      { className: "dockyard-dsh-segments", role: "group", "aria-label": text(t, "ui.reasoningEffort") },
      efforts.map((effort) => h("button", {
        type: "button",
        className: "dockyard-dsh-segment",
        key: effort.id,
        "aria-pressed": tier === effort.id,
        disabled: busy || disabled,
        title: effort.description ?? effort.id,
        onClick: () => select(effort.id)
      }, effort.name ?? effort.id))
    ),
    error2 ? problem(error2) : null
  );
}
function ProviderNavigation({ providerId, providers, directoryState, onSelect, busy, t }) {
  const subscriptions = new Map((providers ?? []).map((entry) => [entry.providerId, providerDisplayName(entry.providerId, entry.manifest, t)]));
  const custom = /* @__PURE__ */ new Map();
  for (const group of directoryState?.groups ?? []) {
    if (!subscriptions.has(group.id)) custom.set(group.id, group.name ?? group.id);
  }
  if (!subscriptions.has(providerId) && !custom.has(providerId)) custom.set(providerId, providerId);
  return h(
    "div",
    { className: "dockyard-dsh-navigation" },
    h("select", {
      value: providerId,
      "aria-label": text(t, "ui.manageProvider"),
      disabled: busy,
      onChange: (event) => onSelect(event.target.value)
    }, [["ui.subscriptionProviders", subscriptions], ["ui.apiProviders", custom]].filter(([, values]) => values.size).map(([label, values]) => h(
      "optgroup",
      { key: label, label: text(t, label) },
      [...values].map(([id, name]) => h("option", { key: id, value: id }, name))
    )))
  );
}
function ModelSelectionStatus({ state, onRetry, t }) {
  if (!state?.pending && !state?.error) return null;
  return h(
    "div",
    {
      role: state.error ? "alert" : "status",
      className: state.error ? "dockyard-dsh-problem" : "dockyard-dsh-note"
    },
    h("span", null, state.error ?? text(t, "ui.switching")),
    state.error && onRetry ? button(null, { onClick: onRetry }, text(t, "ui.retry")) : null
  );
}
function ModelSelectionSection({ providerId, directory, directoryState, remote, modelSelector, modelSelectionState, busy, t }) {
  const [pending, setPending] = useState(false);
  const [error2, setError] = useState(null);
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
      setCatalogStatus({
        busy: false,
        message: force ? text(t, "ui.modelsUpdated", { count: entry?.count ?? 0 }) : null,
        error: entry?.diagnostic ?? null
      });
    } catch (error3) {
      setCatalogStatus({ busy: false, message: null, error: errorText(error3, t) });
    } finally {
      catalogPending.current = false;
    }
  };
  useEffect(() => {
    if (!liveCatalog) return void 0;
    void refreshCatalog();
    const timer = setInterval(() => {
      void refreshCatalog();
    }, 3e5);
    return () => clearInterval(timer);
  }, [providerId, remote]);
  const { current: current2, group, model, efforts } = modelDetails(directoryState, providerId);
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
    } catch (error3) {
      setError(errorText(error3, t));
    } finally {
      setPending(false);
    }
  };
  return h(
    "div",
    { className: "dockyard-dsh-fields" },
    h("span", { className: "dockyard-dsh-field-label" }, text(t, "ui.model")),
    h(
      "div",
      { className: "dockyard-dsh-field-control" },
      h(
        "select",
        {
          className: "dockyard-dsh-select",
          "aria-label": text(t, "ui.sessionModel"),
          value: current2?.model ?? "",
          disabled: busy || pending || providerSelectionPending || directoryState?.status === "selecting" || models.length === 0,
          onChange: (event) => {
            void select(event.target.value);
          }
        },
        !current2 ? h("option", { value: "", disabled: true }, text(t, models.length ? "ui.chooseModel" : selectionStatus?.error || directoryState?.status === "ready" ? "title.noModel" : "subscription.modelPending")) : null,
        current2 && !models.some((entry) => entry.id === current2.model) ? h("option", { value: current2.model }, current2.model) : null,
        models.map((entry) => h("option", { key: entry.id, value: entry.id }, entry.name ?? entry.id))
      ),
      liveCatalog ? h(IconButton, {
        icon: "refresh",
        spin: catalogStatus.busy,
        label: text(t, catalogStatus.busy ? "ui.refreshingModels" : "ui.refreshModels"),
        disabled: busy || catalogStatus.busy,
        onClick: () => {
          void refreshCatalog(true);
        }
      }) : null
    ),
    h(ModelEffortField, { key: current2?.model, current: current2, model, efforts, directory, modelSelector, disabled: providerSelectionPending, t }),
    catalogStatus.error ? problem(catalogStatus.error) : catalogStatus.message ? h("div", { className: "dockyard-dsh-note", role: "status" }, catalogStatus.message) : null,
    h(ModelSelectionStatus, { state: selectionStatus, onRetry: modelSelector ? () => {
      void modelSelector.retry();
    } : null, t }),
    error2 ? problem(error2) : null
  );
}
function OperationStatus({ state, providerId, t, children }) {
  if (providerId && state.providerId && state.providerId !== providerId) return null;
  if (state.error) {
    return h("div", { className: "dockyard-dsh-problem dockyard-dsh-banner", role: "alert" }, h("span", null, state.error), children);
  }
  const progress = state.action && state.action !== "refresh" ? text(t, `ui.action.${state.action}`) : null;
  const message = progress ?? (state.action ? null : state.message);
  if (!message) return null;
  return h(
    "div",
    {
      className: "dockyard-dsh-toast",
      role: "status",
      "aria-atomic": true,
      "data-done": !progress,
      key: message
    },
    progress ? h("span", { className: "dockyard-dsh-spinner", "aria-hidden": true }) : null,
    h("span", null, message)
  );
}
function PopupHeader({ onBack, onClose, caption = null, t, children }) {
  return h(
    "div",
    { className: "dockyard-dsh-head" },
    onBack ? h(IconButton, { icon: "back", label: text(t, "ui.allProviders"), onClick: onBack }) : null,
    children,
    caption ? h("span", { className: "dockyard-dsh-head-caption" }, caption) : null,
    onClose ? h(IconButton, { icon: "close", label: text(t, "ui.close"), onClick: onClose }) : null
  );
}
function NativeKeyPopup({ providerId, native, providers, directory, directoryState, modelSelector, modelSelectionState, nativeController, remote, onSelectProvider, onBack, onClose, t }) {
  const [keyDraft, setKeyDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const { current: current2, group, model } = modelDetails(directoryState, providerId);
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
  try {
    endpointHost = new URL(native.profile?.baseURL).host;
  } catch {
  }
  const addKey = async (event) => {
    event.preventDefault();
    if (!keyDraft.trim() || busy) return;
    const added = await nativeController.addKey(providerId, keyDraft, labelDraft);
    if (added) {
      setKeyDraft("");
      setLabelDraft("");
      setAdding(false);
    }
  };
  return h(
    "div",
    {
      className: "dockyard-dsh-popup",
      role: "dialog",
      tabIndex: -1,
      "aria-label": text(t, "native.keyAria", { title }),
      onMouseDown: (event) => event.stopPropagation()
    },
    h(PopupHeader, {
      onBack,
      onClose,
      t,
      caption: accountProvider ? text(t, "native.dshAccount") : endpointHost ?? text(t, "ui.apiProviderSubtitle")
    }, h(ProviderNavigation, { providerId, providers, directoryState, onSelect: onSelectProvider, busy: blocked, t })),
    h(OperationStatus, { state: native, providerId, t }),
    h(
      "div",
      { className: "dockyard-dsh-popup-scroll" },
      h(ModelSelectionSection, { key: providerId, providerId, directory, directoryState, modelSelector, modelSelectionState, remote, busy: blocked, t }),
      accountProvider ? h("div", { className: "dockyard-dsh-empty" }, text(t, "native.dshAccountHint")) : h(
        "div",
        { className: "dockyard-dsh-section" },
        h(
          "div",
          { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" }, "API Key", canManage ? h("span", { className: "dockyard-dsh-count" }, keys.length) : null),
          button(
            "ghost",
            { disabled: busy, onClick: () => nativeController.refresh(providerId) },
            h(Icon, { name: "refresh", spin: native.action === "refresh" || native.quotaRefreshing === true }),
            text(t, "native.reload")
          )
        ),
        loadingConfig ? h("div", { className: "dockyard-dsh-note", role: "status" }, text(t, "native.readingConfig")) : !canManage ? !native.error ? h("div", { className: "dockyard-dsh-note" }, text(t, "native.configUnavailable")) : null : keys.length === 0 ? h("div", { className: "dockyard-dsh-empty" }, text(t, "native.noKeys")) : h("div", { className: "dockyard-dsh-list" }, keys.map((entry) => h(NativeKeyRow, { key: entry.ref, entry, providerId, controller: nativeController, busy, t }))),
        canManage && !busy && keys.length > 0 && !keys.some((entry) => entry.active && entry.usage && entry.usage.status !== "unsupported") ? nativeQuotaView(keys.find((entry) => entry.active && entry.usage) ?? native, t) : null
      ),
      canManage ? h(
        Disclosure,
        { title: text(t, "native.addKeyTitle"), open: adding, onToggle: setAdding },
        h(
          "form",
          { className: "dockyard-dsh-key-form", onSubmit: addKey },
          h("input", {
            className: "dockyard-dsh-input",
            type: "password",
            value: keyDraft,
            placeholder: text(t, "native.pasteApiKey"),
            "aria-label": text(t, "native.pasteApiKey"),
            autoCapitalize: "none",
            spellCheck: false,
            disabled: busy,
            autoComplete: "off",
            onChange: (event) => setKeyDraft(event.target.value)
          }),
          h("input", {
            className: "dockyard-dsh-input",
            type: "text",
            value: labelDraft,
            placeholder: text(t, "native.optionalName"),
            "aria-label": text(t, "native.optionalName"),
            disabled: busy,
            onChange: (event) => setLabelDraft(event.target.value)
          }),
          h(
            "div",
            { className: "dockyard-dsh-toolbar" },
            button("primary", { type: "submit", disabled: busy || !keyDraft.trim() }, text(t, native.action === "add" ? "native.saving" : "native.save"))
          ),
          h("div", { className: "dockyard-dsh-note" }, text(t, "native.keyStorage"))
        )
      ) : null,
      canManage ? h(
        Disclosure,
        {
          title: text(t, "ui.advanced"),
          value: text(t, `nativePolicy.${native.policy ?? "manual"}`),
          open: advanced,
          onToggle: setAdvanced
        },
        h(
          "div",
          { className: "dockyard-dsh-fields" },
          h("span", { className: "dockyard-dsh-field-label" }, text(t, "native.keyStrategy")),
          h(
            "div",
            { className: "dockyard-dsh-field-control" },
            h(
              "select",
              {
                className: "dockyard-dsh-select",
                "aria-label": text(t, "native.keyStrategy"),
                value: native.policy ?? "manual",
                disabled: busy,
                onChange: (event) => {
                  void nativeController.setPolicy(providerId, event.target.value);
                }
              },
              h("option", { value: "manual" }, text(t, "nativePolicy.manual")),
              h("option", { value: "round_robin", disabled: !pooled }, text(t, "nativePolicy.round_robin")),
              h("option", { value: "failover", disabled: !pooled }, text(t, "nativePolicy.failover"))
            )
          ),
          pooled ? null : h("div", { className: "dockyard-dsh-note" }, text(t, "native.notice.manual")),
          h(ContextWindowSection, { key: `${providerId}:${current2?.model}:${activeKeyRef}`, providerId, current: current2, model, keyRef: activeKeyRef, remote, t })
        )
      ) : null
    )
  );
}
function SubscriptionOverviewPopup({ providers, directoryState, modelSelectionState, controlState, controller, selectedProviderId, onSelect, onClose, t }) {
  const busy = controlState.action !== null;
  const blocked = busy && controlState.action !== "refresh";
  const connected = providers.some((provider) => provider.accounts?.length);
  const custom = (directoryState?.groups ?? []).filter((group) => !providers.some((provider) => provider.providerId === group.id));
  const row = (id, name, meta2, overview) => h(
    "button",
    {
      type: "button",
      className: "dockyard-dsh-provider-row",
      key: id,
      "data-current": id === selectedProviderId,
      "aria-current": id === selectedProviderId || void 0,
      disabled: blocked,
      onClick: () => onSelect(id)
    },
    // The dot column stays reserved so both groups share one left edge.
    h("span", { className: "dockyard-dsh-dot", "data-state": overview?.state, style: overview ? void 0 : { visibility: "hidden" } }),
    h("span", { className: "dockyard-dsh-provider-row-name" }, name),
    h("span", { className: "dockyard-dsh-provider-row-meta" }, meta2),
    overview?.percent === void 0 ? null : h(Meter, { percent: overview.percent }),
    overview ? h("span", { className: "dockyard-dsh-provider-row-status", "data-state": overview.state }, overview.label) : null,
    h(Icon, { name: "forward" })
  );
  return h(
    "div",
    {
      className: "dockyard-dsh-popup",
      role: "dialog",
      tabIndex: -1,
      "aria-label": text(t, "subscription.aria"),
      onMouseDown: (event) => event.stopPropagation()
    },
    h(PopupHeader, { onClose, t }, h("div", { className: "dockyard-dsh-title" }, text(t, "title.subscriptionManagement"))),
    h(
      OperationStatus,
      { state: controlState, t },
      controlState.snapshot ? null : button(null, { onClick: () => controller.ensureSnapshot().catch(() => {
      }) }, text(t, "ui.retry"))
    ),
    // Until the snapshot arrives nothing is known: a failed load is the banner's
    // to explain, and model groups cannot yet be told apart from API providers.
    h("div", { className: "dockyard-dsh-popup-scroll" }, !controlState.snapshot ? controlState.status === "loading" ? h("div", { className: "dockyard-dsh-note", role: "status" }, text(t, "status.reading")) : null : h(
      React.Fragment,
      null,
      h(ModelSelectionStatus, { state: modelSelectionState, t }),
      h(
        "div",
        { className: "dockyard-dsh-section" },
        h(
          "div",
          { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" }, text(t, "ui.subscriptionProviders")),
          connected ? button(
            "ghost",
            { disabled: busy, onClick: () => controller.refresh() },
            h(Icon, { name: "refresh", spin: controlState.action === "refresh" }),
            text(t, "subscription.refreshAll")
          ) : null
        ),
        providers.length > 0 && !connected ? h("div", { className: "dockyard-dsh-note" }, text(t, "subscription.connectHint")) : null,
        providers.length === 0 ? h("div", { className: "dockyard-dsh-note" }, text(t, "subscription.none")) : h("div", { className: "dockyard-dsh-provider-list" }, providers.map((provider) => {
          const selected = providerAccount(provider);
          return row(
            provider.providerId,
            providerDisplayName(provider.providerId, provider.manifest, t),
            // Whose quota the row shows, or how a pool without a current account is shared.
            selected ? selected.email ?? selected.displayName ?? "" : provider.accounts?.length ? policyLabel(t, provider.policy) : "",
            providerOverview(provider, t)
          );
        }))
      ),
      custom.length ? h(
        "div",
        { className: "dockyard-dsh-section" },
        h(
          "div",
          { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" }, text(t, "ui.apiProviders"))
        ),
        h("div", { className: "dockyard-dsh-provider-list" }, custom.map((group) => row(
          group.id,
          group.name ?? group.id,
          text(t, "subscription.modelCount", { count: group.models?.length ?? 0 }),
          null
        )))
      ) : null
    ))
  );
}
function SubscriptionSettingsSection({ controller, remote, t }) {
  const controlState = useSnapshot(controller.store);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const providers = controlState.snapshot?.providers ?? [];
  const provider = selectedProviderId ? providerFromSnapshot(controlState.snapshot, selectedProviderId) : null;
  useEffect(() => {
    controller.ensureSnapshot().catch(() => {
    });
  }, [controller]);
  useEffect(() => {
    if (selectedProviderId && !provider) setSelectedProviderId(null);
  }, [selectedProviderId, provider]);
  useEffect(() => {
    if (!selectedProviderId || !provider) return void 0;
    controller.ensure(selectedProviderId).catch(() => {
    });
    void controller.refresh(selectedProviderId, { background: true });
    const timer = setInterval(() => controller.refresh(selectedProviderId, { background: true }), 3e4);
    return () => clearInterval(timer);
  }, [controller, selectedProviderId, Boolean(provider)]);
  return h(
    "div",
    { className: "dockyard-dsh-settings-section" },
    provider ? h(DockyardPopup, {
      providerId: selectedProviderId,
      provider,
      directory: null,
      directoryState: null,
      controlState,
      controller,
      remote,
      onSelectProvider: setSelectedProviderId,
      onBack: () => setSelectedProviderId(null),
      t
    }) : h(SubscriptionOverviewPopup, {
      providers,
      directoryState: null,
      controlState,
      controller,
      selectedProviderId: null,
      onSelect: setSelectedProviderId,
      t
    })
  );
}
function DockyardPopup({ providerId, provider, directory, directoryState, modelSelector, modelSelectionState, controlState, controller, remote, onSelectProvider, onBack, onClose, t }) {
  const [advanced, setAdvanced] = useState(false);
  const { current: current2, group, model } = modelDetails(directoryState, providerId);
  const accounts = provider?.accounts ?? [];
  const activeId = provider?.defaultAccountId ?? null;
  const contextAccountId = activeId ?? (accounts.length === 1 ? accounts[0]?.accountId ?? null : null);
  const busy = controlState.action !== null;
  const here = controlState.providerId === providerId;
  const authInProgress = controlState.auth?.providerId === providerId && ["pending", "processing"].includes(controlState.auth?.status) && Boolean(controlState.auth?.sessionId);
  const supportsOAuthLogin = provider?.manifest?.capabilities?.includes("oauth_authorization");
  const providerName = providerDisplayName(providerId, provider?.manifest, t);
  const scan = controlState.scan?.providers?.some((entry) => entry.providerId === providerId) ? controlState.scan : null;
  const auth = controlState.auth?.providerId === providerId ? controlState.auth : null;
  const authError = auth && !authInProgress ? auth.diagnostic ?? auth.instructions ?? text(t, "status.oauthFailed") : null;
  return h(
    "div",
    {
      className: "dockyard-dsh-popup",
      role: "dialog",
      tabIndex: -1,
      "aria-label": `${providerName} ${text(t, "trigger.accountQuota")}`,
      onMouseDown: (event) => event.stopPropagation()
    },
    h(
      PopupHeader,
      { onBack, onClose, t },
      h(ProviderNavigation, { providerId, providers: controlState.snapshot?.providers, directoryState, onSelect: onSelectProvider, busy: busy && controlState.action !== "refresh", t })
    ),
    h(OperationStatus, { state: authError && controlState.error === authError ? { ...controlState, error: null } : controlState, providerId, t }),
    h(
      "div",
      { className: "dockyard-dsh-popup-scroll" },
      // Without an account there is no model to pick; the empty state below says what to do.
      accounts.length > 0 || group?.models?.length ? h(ModelSelectionSection, { key: connectedAccountSignature({ providers: [provider] }), providerId, directory, directoryState, modelSelector, modelSelectionState, remote, busy, t }) : null,
      auth ? h(AuthorizationLoginGuide, {
        key: auth.sessionId,
        auth,
        providerId,
        providerName,
        controller,
        busy,
        canceling: controlState.action === "cancel",
        t
      }) : null,
      h(
        "div",
        { className: "dockyard-dsh-section" },
        h(
          "div",
          { className: "dockyard-dsh-section-head" },
          h(
            "span",
            { className: "dockyard-dsh-section-title" },
            text(t, "subscription.connectedAccounts"),
            h("span", { className: "dockyard-dsh-count" }, accounts.length)
          ),
          accounts.length > 0 ? button(
            "ghost",
            { disabled: busy, onClick: () => controller.refresh(providerId) },
            h(Icon, { name: "refresh", spin: controlState.action === "refresh" && here }),
            text(t, "native.refresh")
          ) : null
        ),
        accounts.length === 0 ? h("div", { className: "dockyard-dsh-empty" }, text(t, supportsOAuthLogin ? "subscription.noAccountsOAuth" : "subscription.noAccountsScan")) : h("div", { className: "dockyard-dsh-list" }, accounts.map((account) => h(AccountRow, {
          key: account.accountId,
          account,
          current: account.accountId === activeId,
          providerId,
          controller,
          busy,
          canAuthorize: supportsOAuthLogin && !authInProgress,
          t
        }))),
        h(
          "div",
          { className: "dockyard-dsh-toolbar" },
          button(
            "primary",
            { disabled: busy || authInProgress, onClick: () => controller.login(providerId) },
            h(Icon, { name: "add" }),
            authInProgress ? text(t, "status.verificationInProgress") : text(t, supportsOAuthLogin ? "auth.loginAdd" : "auth.officialInstructions")
          ),
          button(
            null,
            { disabled: busy, onClick: () => controller.scan(providerId) },
            controlState.action === "scan" && here ? text(t, "status.scanning") : text(t, "auth.scanLocal")
          )
        )
      ),
      scan ? h(
        "div",
        { className: "dockyard-dsh-section" },
        h(
          "div",
          { className: "dockyard-dsh-section-head" },
          h("span", { className: "dockyard-dsh-section-title" }, text(t, "subscription.localCandidates"))
        ),
        h(CandidateList, { scan, providerId, controller, busy, accounts, t })
      ) : null,
      h(
        Disclosure,
        { title: text(t, "ui.advanced"), value: policyLabel(t, provider?.policy ?? "round_robin"), open: advanced, onToggle: setAdvanced },
        h(
          "div",
          { className: "dockyard-dsh-fields" },
          h("span", { className: "dockyard-dsh-field-label" }, text(t, "subscription.accountStrategy")),
          h(
            "div",
            { className: "dockyard-dsh-field-control" },
            h("select", {
              className: "dockyard-dsh-select",
              "aria-label": text(t, "subscription.accountStrategy"),
              value: provider?.policy ?? "round_robin",
              disabled: busy,
              onChange: (event) => controller.setPolicy(providerId, event.target.value)
            }, Object.keys(POLICY_KEYS).map((value) => h("option", { value, key: value }, policyLabel(t, value))))
          ),
          h(ContextWindowSection, { key: `${providerId}:${current2?.model}:${contextAccountId}`, providerId, current: current2, model, accountId: contextAccountId, remote, t })
        )
      )
    )
  );
}
function DockyardAccountControl({ sessionId, directory, modelDirectory, loadModelCatalog, controller, nativeController, remote, t }) {
  const directoryState = useSnapshot(directory);
  const modelSelector = useMemo(() => new ProviderModelSelectionController(modelDirectory, {
    loadCatalog: loadModelCatalog,
    noModels: text(t, "ui.noModels"),
    timedOut: text(t, "ui.selectTimedOut"),
    effortUnavailable: text(t, "ui.effortUnavailable")
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
  const accountSignatureRef = useRef(void 0);
  const modelSelectionSignatureRef = useRef(void 0);
  const { current: current2, model } = modelDetails(directoryState);
  const currentProviderId = current2?.provider ?? null;
  const modelSelectionSignature = JSON.stringify([
    sessionId,
    current2?.provider ?? null,
    current2?.model ?? null
  ]);
  const providers = controlState.snapshot?.providers ?? [];
  const currentProvider = providerFromSnapshot(controlState.snapshot, currentProviderId);
  const currentNative = nativeState.providerId === currentProviderId && nativeState.native ? nativeState : null;
  const providerId = showOverview ? null : detailProviderId ?? currentProviderId;
  const provider = providerFromSnapshot(controlState.snapshot, providerId);
  const snapshotReady = Array.isArray(controlState.snapshot?.providers);
  const nativeCandidate = Boolean(providerId && (nativeState.providerId === providerId || snapshotReady && !provider));
  const native = nativeState.providerId === providerId && nativeState.native ? nativeState : nativeCandidate ? nativeState.providerId === providerId ? nativeState : {
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
    message: null
  } : null;
  const accountSignature = connectedAccountSignature(controlState.snapshot);
  const nativeSwitchBlocked = Boolean(!provider && nativeState.providerId !== providerId && nativeState.action && nativeState.action !== "refresh");
  useEffect(() => {
    installStyles();
  }, []);
  useEffect(() => {
    const previous = modelSelectionSignatureRef.current;
    modelSelectionSignatureRef.current = modelSelectionSignature;
    if (previous === void 0 || previous === modelSelectionSignature) return;
    if (modelSelector.store.getSnapshot().pending) return;
    setShowOverview(false);
    setDetailProviderId(currentProviderId);
  }, [currentProviderId, modelSelectionSignature, modelSelector]);
  useEffect(() => {
    controller.ensureSnapshot().catch(() => {
    });
  }, [controller]);
  useEffect(() => {
    if (typeof remote?.catalog !== "function") return void 0;
    const previous = accountSignatureRef.current;
    accountSignatureRef.current = accountSignature;
    if (!accountSignature || previous !== void 0 && previous === accountSignature) return void 0;
    const timer = setTimeout(() => {
      const loading2 = remote.catalog({});
      loading2?.catch?.(() => {
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [accountSignature, remote]);
  useEffect(() => {
    if (!providerId || !snapshotReady || nativeSwitchBlocked) return void 0;
    const hasProvider = Boolean(provider);
    if (hasProvider) {
      void controller.refresh(providerId, { background: true });
      const timer2 = setInterval(() => controller.refresh(providerId, { background: true }), 3e4);
      return () => clearInterval(timer2);
    }
    void nativeController.refresh(providerId);
    const timer = setInterval(() => nativeController.refresh(providerId, { background: true }), 3e4);
    return () => clearInterval(timer);
  }, [controller, nativeController, providerId, Boolean(provider), snapshotReady, nativeSwitchBlocked]);
  useEffect(() => {
    if (!open) return void 0;
    const anchor = rootRef.current;
    const popup = anchor?.querySelector('[role="dialog"]');
    if (typeof popup?.showPopover === "function") {
      popup.setAttribute("popover", "manual");
      popup.showPopover();
    }
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
    if (!open || typeof window === "undefined") return void 0;
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
        Math.max(POPUP_MARGIN, viewportWidth - popupWidth - POPUP_MARGIN)
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
  const quotaSource = currentProvider ? currentSelectedAccount?.quota : currentNative?.quota ?? currentNative?.entry?.quota;
  const liveCompactIndicator = selectQuotaIndicator(quotaWindowRows(quotaSource, t));
  let compactIndicator = liveCompactIndicator;
  if (liveCompactIndicator) {
    compactIndicatorCacheRef.current = { providerId: currentProviderId, indicator: liveCompactIndicator };
  } else if (loading && compactIndicatorCacheRef.current.providerId === currentProviderId) {
    compactIndicator = compactIndicatorCacheRef.current.indicator;
  } else if (!loading) {
    compactIndicatorCacheRef.current = { providerId: currentProviderId, indicator: null };
  }
  const compactLabel = compactIndicator?.type === "balance" ? formatBalance(compactIndicator.window, t) : compactIndicator?.type === "quota" ? `${compactIndicator.percent}%` : null;
  const attention = ["expired", "exhausted", "degraded"].includes(currentSelectedAccount?.health?.status) || compactIndicator?.type === "balance" && compactIndicator.remaining <= 0;
  const compactLevel = attention ? "critical" : compactIndicator?.type === "quota" ? quotaLevel(compactIndicator.percent) : void 0;
  const providerLabel = currentProviderId ? providerDisplayName(currentProviderId, currentProvider?.manifest ?? currentNative?.entry, t) : text(t, "trigger.subscriptionManagement");
  const modelLabel = model?.name ?? current2?.model ?? "";
  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      setShowOverview(false);
      setDetailProviderId(null);
      return;
    }
    const hasManagedProvider = Boolean(currentProvider || currentNative || nativeCandidate);
    setShowOverview(!currentProviderId || !hasManagedProvider);
    setDetailProviderId(currentProviderId && hasManagedProvider ? currentProviderId : null);
    setOpen(true);
  };
  const selectProvider = (selectedProviderId) => {
    focusNavigationRef.current = !showOverview;
    setShowOverview(false);
    setDetailProviderId(selectedProviderId);
    const target = providerFromSnapshot(controlState.snapshot, selectedProviderId);
    if (selectedProviderId === currentProviderId || target && !target.accounts?.length) return;
    void modelSelector.selectProvider(selectedProviderId);
  };
  const close = () => setOpen(false);
  const showProviders = () => setShowOverview(true);
  const overviewOpen = open && (showOverview || !providerId || !provider && !native);
  return h(
    "div",
    { className: "dockyard-dsh-anchor", ref: rootRef },
    h(
      "button",
      {
        type: "button",
        className: "dockyard-dsh-trigger",
        "aria-haspopup": "dialog",
        title: currentProviderId ? [text(t, "trigger.providerModel", { provider: providerLabel, model: modelLabel }), compactLabel].filter(Boolean).join(" \xB7 ") : text(t, "trigger.subscriptionManagement"),
        "aria-label": currentProviderId ? `${providerLabel} ${text(t, "trigger.accountQuota")}${compactLabel ? ` ${compactLabel}` : ""}` : text(t, "subscription.aria"),
        "aria-expanded": open,
        onClick: toggleOpen
      },
      attention && compactIndicator?.type !== "quota" ? h("span", { className: "dockyard-dsh-dot", "data-state": "error" }) : null,
      h("span", { className: "dockyard-dsh-label" }, providerLabel),
      compactIndicator?.type === "quota" ? h(Meter, { percent: compactIndicator.percent, level: compactLevel, label: text(t, "value.quota"), loading }) : null,
      compactLabel ? h("span", { className: "dockyard-dsh-trigger-value", "data-level": compactLevel }, compactLabel) : null,
      h(ChevronIcon, { open })
    ),
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
      }
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
      onClose: close
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
      onClose: close
    }) : null
  );
}
var inject = ["slots", "modelDirectories", "remote", "remote.session", "remote.llm", "remote.settings", "remote.credentials", "locale"];
async function apply(ctx) {
  installStyles();
  const disposeModelMenuFolding = installModelMenuFolding();
  const disposeLocale = ctx.locale.register(DOCKYARD_LOCALE_NS, DOCKYARD_LOCALES);
  const t = ctx.locale.bind(DOCKYARD_LOCALE_NS);
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
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
          remote
        };
      }
    }, DockyardAccountControl));
    scope.slots.inject("settings.section", () => scope.slots.register({
      name: "settings.section",
      id: "dockyard-subscriptions",
      order: 15,
      label: () => text(t, "settings.subscriptionSection"),
      locale: DOCKYARD_LOCALE_NS,
      inject: () => ({ controller, remote })
    }, SubscriptionSettingsSection));
  });
  return async () => {
    disposeModelMenuFolding();
    disposeLocale?.();
    controller.dispose();
    await disposeRemote?.();
  };
}

    return module.exports;
  },
});
