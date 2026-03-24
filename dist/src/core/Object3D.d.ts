import { AbstractMaterial } from './materials/index.js';
import { BoundingVolume, GeometryData } from '../interfaces/index.js';
import { Matrix4, Vector3D } from '../math/index.js';
export declare class Object3D {
    readonly uuid: string;
    name: string;
    geometry: GeometryData | null;
    material: AbstractMaterial | null;
    bounds: BoundingVolume | null;
    position: Vector3D;
    rotation: Vector3D;
    scale: Vector3D;
    localMatrix: Matrix4;
    worldMatrix: Matrix4;
    parent: Object3D | null;
    children: Object3D[];
    isVisible: boolean;
    frustumCulled: boolean;
    constructor(name?: string);
    add(child: Object3D): void;
    remove(child: Object3D): void;
    updateMatrixWorld(force?: boolean): void;
}
