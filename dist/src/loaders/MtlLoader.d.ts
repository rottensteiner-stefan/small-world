import { AbstractLoader } from './AbstractLoader.js';
import { PhongMaterial } from '../core/index.js';
import { LoaderOptions } from '../interfaces/index.js';
export declare class MtlLoader extends AbstractLoader<Map<string, PhongMaterial>> {
    /**
     * Creates a new MtlLoader.
     * @param options Optional configuration options.
     */
    constructor(options?: LoaderOptions);
    load(url: string): Promise<Map<string, PhongMaterial>>;
    private _parse;
}
