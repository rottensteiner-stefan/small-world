/// src/loaders/AbstractLoader.ts
import { EventDispatcherImpl, EventHandler } from "../core/events/index.js";
import { EventDispatcher } from "../interfaces/index.js";
import { EventType } from "../enums/index.js";

/**
 * Abstrakte Basisklasse für alle Loader.
 * T ist der Typ, den der Loader am Ende zurückgibt (z.B. string, ImageBitmap, ModelGeometry).
 */
export abstract class AbstractLoader<T> implements EventDispatcher {
  public basePath: string = "";
  private _dispatcher: EventDispatcherImpl = new EventDispatcherImpl();

  public setBasePath(path: string): this {
    this.basePath = path;
    return this;
  }

  public addEventListener(type: string | EventType, listener: EventHandler): void {
    this._dispatcher.addEventListener(type, listener);
  }

  public removeEventListener(type: string | EventType, listener: EventHandler): void {
    this._dispatcher.removeEventListener(type, listener);
  }

  public dispatchEvent(type: string | EventType, eventData: Record<string, unknown> = {}): void {
    this._dispatcher.dispatchEvent(type, eventData);
  }

  /**
   * Die Hauptmethode, die von jedem spezifischen Loader implementiert werden muss.
   */
  public abstract load(url: string): Promise<T>;
}
