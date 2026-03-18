/// src/loaders/AbstractLoader.ts

import { EventDispatcher, EventHandler } from "../core/events/EventDispatcher.js";
import { IEventDispatcher } from "../interfaces/IEventDispatcher.js";
import { EventType } from "../enums/EventType.js";

/**
 * Abstrakte Basisklasse für alle Loader.
 * T ist der Typ, den der Loader am Ende zurückgibt (z.B. string, ImageBitmap, ModelGeometry).
 */
export abstract class AbstractLoader<T> implements IEventDispatcher {
  public basePath: string = "";
  private _dispatcher: EventDispatcher = new EventDispatcher();

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
