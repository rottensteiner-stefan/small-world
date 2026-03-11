import { EventDispatcher } from "../core/events/EventDispatcher.js";
/**
 * Abstrakte Basisklasse für alle Loader.
 * T ist der Typ, den der Loader am Ende zurückgibt (z.B. string, ImageBitmap, ModelGeometry).
 */
export class Loader extends EventDispatcher {
    basePath = "";
    setBasePath(path) {
        this.basePath = path;
        return this;
    }
}
//# sourceMappingURL=Loader.js.map