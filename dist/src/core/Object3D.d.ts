import { AbstractMaterial } from './materials/index.js';
import { BoundingVolume, GeometryDataInterface } from '../interfaces/index.js';
import { Matrix4, Vector3D } from '../math/index.js';
import { Behavior } from './behaviors/Behavior.js';
/**
 * Base class for all 3D objects in the scene.
 */
export declare class Object3D {
    readonly uuid: string;
    name: string;
    geometry: GeometryDataInterface | undefined;
    material: AbstractMaterial | undefined;
    bounds: BoundingVolume | undefined;
    position: Vector3D;
    rotation: Vector3D;
    scale: Vector3D;
    localMatrix: Matrix4;
    worldMatrix: Matrix4;
    parent: Object3D | undefined;
    children: Object3D[];
    behaviors: Behavior[];
    isVisible: boolean;
    frustumCulled: boolean;
    isStatic: boolean;
    inFrustum: boolean;
    castShadow: boolean;
    receiveShadow: boolean;
    isPickable: boolean;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
    onPointerClick?: () => void;
    onPointerDown?: (ray: import('../physix/Ray.js').Ray, intersectionPoint: Vector3D) => void;
    onPointerUp?: () => void;
    onPointerMove?: (ray: import('../physix/Ray.js').Ray) => void;
    constructor(name?: string);
    add(...children: Object3D[]): void;
    remove(...children: Object3D[]): void;
    addBehavior(behavior: Behavior): this;
    removeBehavior(behavior: Behavior): this;
    translate(v: Vector3D): this;
    setPosition(x: number, y: number, z: number): this;
    setRotation(x: number, y: number, z: number): this;
    setScale(x: number, y?: number, z?: number): this;
    computeBounds(): this;
    lookAt(target: Vector3D, up?: Vector3D): this;
    updateMatrixWorld(force?: boolean): void;
}
