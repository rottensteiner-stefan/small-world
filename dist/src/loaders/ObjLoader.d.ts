import { AbstractLoader } from './AbstractLoader.js';
import { Object3D } from '../core/index.js';
import { LoaderOptions } from '../interfaces/index.js';
export declare class ObjLoader extends AbstractLoader<Object3D> {
    /**
     * Creates a new ObjLoader.
     * @param options Optional configuration options.
     */
    constructor(options?: LoaderOptions);
    load(url: string): Promise<Object3D>;
    private _parse;
    private _parseFaceVertex;
}
