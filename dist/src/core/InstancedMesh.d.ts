import { Object3D } from './Object3D.js';
import { Matrix4 } from '../math/index.js';
import { GeometryDataInterface } from '../interfaces/index.js';
import { AbstractMaterial } from './materials/index.js';
/**
 * A class for rendering multiple instances of a mesh with different transforms.
 */
export declare class InstancedMesh extends Object3D {
    readonly isInstancedMesh: boolean;
    instanceCount: number;
    instanceMatrices: Float32Array;
    instanceMatrixNeedsUpdate: boolean;
    constructor(name: string, geometry: GeometryDataInterface, material: AbstractMaterial, count: number);
    setMatrixAt(index: number, matrix: Matrix4): void;
    getMatrixAt(index: number, out: Matrix4): void;
}
