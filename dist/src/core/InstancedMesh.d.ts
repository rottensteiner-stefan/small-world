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
    instanceData?: Float32Array;
    instanceDataNeedsUpdate: boolean;
    instanceDataSize: number;
    constructor(name: string, geometry: GeometryDataInterface, material: AbstractMaterial, count: number);
    /**
     * Initializes the extra instance data buffer.
     * @param sizePerInstance How many floats per instance (e.g. 4 for a vec4).
     */
    initInstanceData(sizePerInstance: number): void;
    setMatrixAt(index: number, matrix: Matrix4): void;
    getMatrixAt(index: number, out: Matrix4): void;
    /**
     * Sets the instance data at a specific index.
     * @param index The instance index.
     * @param data The data array (length must match `instanceDataSize`).
     */
    setInstanceDataAt(index: number, data: number[]): void;
}
