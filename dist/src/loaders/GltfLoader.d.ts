import { AbstractLoader } from './index.js';
import { Object3D } from '../core/index.js';
import { LoaderOptions } from '../interfaces/index.js';
/**
 * Loader for glTF 2.0 assets (.gltf and .glb).
 */
export declare class GltfLoader extends AbstractLoader<Object3D> {
    constructor(options?: LoaderOptions);
    load(url: string): Promise<Object3D>;
    private _loadJson;
    private _loadBinary;
    private _decodeBase64;
    private _parse;
    private _parseNode;
    private _parseGeometry;
    private _getBufferData;
    private _getComponentCount;
    private _parseMaterial;
}
