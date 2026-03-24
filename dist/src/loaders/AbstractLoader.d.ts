import { EventHandler } from '../core/events/index.js';
import { EventDispatcher } from '../interfaces/index.js';
import { EventType } from '../enums/index.js';
/**
 * Abstrakte Basisklasse für alle Loader.
 * T ist der Typ, den der Loader am Ende zurückgibt (z.B. string, ImageBitmap, ModelGeometry).
 */
export declare abstract class AbstractLoader<T> implements EventDispatcher {
    basePath: string;
    private _dispatcher;
    setBasePath(path: string): this;
    addEventListener(type: string | EventType, listener: EventHandler): void;
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
    /**
     * Die Hauptmethode, die von jedem spezifischen Loader implementiert werden muss.
     */
    abstract load(url: string): Promise<T>;
}
