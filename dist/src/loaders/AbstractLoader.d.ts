import { Events, EventHandler, LoaderOptions } from '../interfaces/index.js';
import { EventType } from '../enums/index.js';
/**
 * Abstract base class for all resource loaders.
 * @template T The type of resource returned by the loader.
 */
export declare abstract class AbstractLoader<T> implements Events {
    /** The base path for resource URLs. */
    basePath: string;
    private _dispatcher;
    /**
     * Creates a new AbstractLoader.
     * @param options Optional configuration options.
     */
    constructor(options?: LoaderOptions);
    /**
     * Sets the base path for the loader.
     * @param path The base path string.
     * @returns this
     */
    setBasePath(path: string): this;
    /** @inheritdoc */
    addEventListener(type: string | EventType, listener: EventHandler): void;
    /** @inheritdoc */
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    /** @inheritdoc */
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
    /**
     * Loads a resource from the given URL.
     * @param url The relative URL to the resource.
     * @returns A promise resolving to the loaded resource.
     */
    abstract load(url: string): Promise<T>;
    /**
     * Derives the folder path (everything up to and including the last `/`)
     * from a URL, so sibling resources (materials, textures, buffers) can be
     * resolved relative to it.
     * @param url The URL to derive the folder path from.
     * @returns The folder path, including a trailing slash.
     */
    protected static getFolderPath(url: string): string;
}
