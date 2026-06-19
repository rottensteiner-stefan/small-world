/// src/loaders/AbstractLoader.ts
import { EventDispatcherImpl } from "../core/index.js";
/**
 * Abstract base class for all resource loaders.
 * @template T The type of resource returned by the loader.
 */
export class AbstractLoader {
    /** The base path for resource URLs. */
    basePath = "";
    _dispatcher = new EventDispatcherImpl();
    /**
     * Creates a new AbstractLoader.
     * @param options Optional configuration options.
     */
    constructor(options = {}) {
        this.basePath = options.basePath ?? "";
    }
    /**
     * Sets the base path for the loader.
     * @param path The base path string.
     * @returns this
     */
    setBasePath(path) {
        this.basePath = path;
        return this;
    }
    /** @inheritdoc */
    addEventListener(type, listener) {
        this._dispatcher.addEventListener(type, listener);
    }
    /** @inheritdoc */
    removeEventListener(type, listener) {
        this._dispatcher.removeEventListener(type, listener);
    }
    /** @inheritdoc */
    dispatchEvent(type, eventData = {}) {
        this._dispatcher.dispatchEvent(type, eventData);
    }
}
//# sourceMappingURL=AbstractLoader.js.map