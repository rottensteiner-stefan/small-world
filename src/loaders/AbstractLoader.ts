/// src/loaders/AbstractLoader.ts
import { EventDispatcherImpl } from "../core/events/index.js";
import { Events, EventHandler } from "../interfaces/index.js";
import { LoaderOptions } from "../interfaces/index.js";
import { EventType } from "../enums/index.js";

/**
 * Abstract base class for all resource loaders.
 * @template T The type of resource returned by the loader.
 */
export abstract class AbstractLoader<T> implements Events {
  /** The base path for resource URLs. */
  public basePath: string = "";
  private _dispatcher: EventDispatcherImpl = new EventDispatcherImpl();

  /**
   * Creates a new AbstractLoader.
   * @param options Optional configuration options.
   */
  constructor(options: LoaderOptions = {}) {
    this.basePath = options.basePath ?? "";
  }

  /**
   * Sets the base path for the loader.
   * @param path The base path string.
   * @returns this
   */
  public setBasePath(path: string): this {
    this.basePath = path;
    return this;
  }

  /** @inheritdoc */
  public addEventListener(type: string | EventType, listener: EventHandler): void {
    this._dispatcher.addEventListener(type, listener);
  }

  /** @inheritdoc */
  public removeEventListener(type: string | EventType, listener: EventHandler): void {
    this._dispatcher.removeEventListener(type, listener);
  }

  /** @inheritdoc */
  public dispatchEvent(type: string | EventType, eventData: Record<string, unknown> = {}): void {
    this._dispatcher.dispatchEvent(type, eventData);
  }

  /**
   * Loads a resource from the given URL.
   * @param url The relative URL to the resource.
   * @returns A promise resolving to the loaded resource.
   */
  public abstract load(url: string): Promise<T>;
}
