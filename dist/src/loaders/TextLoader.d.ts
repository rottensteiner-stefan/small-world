import { AbstractLoader } from './AbstractLoader.js';
import { LoaderOptions } from '../interfaces/index.js';
/**
 * Loader for text assets.
 */
export declare class TextLoader extends AbstractLoader<string> {
    /**
     * Creates a new TextLoader.
     * @param options Optional configuration options.
     */
    constructor(options?: LoaderOptions);
    /** @inheritdoc */
    load(url: string): Promise<string>;
}
