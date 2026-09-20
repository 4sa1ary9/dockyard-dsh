export class EventBus {
  #handlers = new Map();

  on(type, handler) {
    if (typeof type !== "string" || type.length === 0) {
      throw new TypeError("EventBus.on requires a non-empty event type");
    }
    if (typeof handler !== "function") {
      throw new TypeError("EventBus.on requires a handler function");
    }
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    const handlers = this.#handlers.get(type);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) this.#handlers.delete(type);
  }

  async emit(type, payload) {
    const handlers = [...(this.#handlers.get(type) ?? [])];
    const errors = [];
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (error) {
        // Event consumers are observers. One broken observer must not prevent
        // the remaining observers or the lifecycle operation from completing.
        errors.push(error);
      }
    }
    return { handled: handlers.length, errors };
  }

  clear() {
    this.#handlers.clear();
  }
}
