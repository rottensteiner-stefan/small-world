import { Object3D } from '../../core/index.js';
import { AbstractMaterial } from '../../core/materials/AbstractMaterial.js';
export interface ErlenmeyerFlaskOptions {
    radius?: number;
    height?: number;
    glassMaterial?: AbstractMaterial;
    segments?: number;
}
export declare class ErlenmeyerFlask extends Object3D {
    constructor(name: string, options?: ErlenmeyerFlaskOptions);
}
