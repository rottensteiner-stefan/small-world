/// src/loaders/AbstractLoader.ts

import { EventDispatcher } from "../core/events/EventDispatcher.js";

/**
 * Abstrakte Basisklasse für alle Loader.
 * T ist der Typ, den der Loader am Ende zurückgibt (z.B. string, ImageBitmap, ModelGeometry).
 */
export abstract class AbstractLoader<T> extends EventDispatcher {
  public basePath: string = "";

  public setBasePath(path: string): this {
    this.basePath = path;
    return this;
  }

  /**
   * Die Hauptmethode, die von jedem spezifischen Loader implementiert werden muss.
   */
  public abstract load(url: string): Promise<T>;
}
