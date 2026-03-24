import { AbstractLoader } from './index.js';
import { Object3D } from '../core/index.js';
export declare class ObjLoader extends AbstractLoader<Object3D> {
    load(url: string): Promise<Object3D>;
    private parse;
    private parseFaceVertex;
}
