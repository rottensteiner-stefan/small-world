import { Object3D } from '../../core/index.js';
import { AbstractMaterial } from '../../core/materials/AbstractMaterial.js';
export interface ApothecaryBottleOptions {
    radius?: number;
    height?: number;
    glassMaterial?: AbstractMaterial;
    stopperMaterial?: AbstractMaterial;
    segments?: number;
}
export declare class ApothecaryBottle extends Object3D {
    constructor(name: string, options?: ApothecaryBottleOptions);
}
