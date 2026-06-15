import { Object3D } from './Object3D.js';
import { Octree } from './Octree.js';
import { Fog } from './Fog.js';
import { Vector3D } from '../math/Vector3D.js';
import { BoundingBox } from '../physix/index.js';
export interface RenderList {
    opaque: Map<string, Map<string, Map<string, Object3D[]>>>;
    transparent: Object3D[];
}
/**
 * A scene that holds a collection of 3D objects.
 */
export declare class Scene {
    objects: Object3D[];
    private readonly _objectsByName;
    staticOctree: Octree | undefined;
    dynamicOctree: Octree | undefined;
    fog?: Fog;
    private _scratchFrustum;
    private _scratchMatrix;
    add(...objs: Object3D[]): void;
    remove(...objs: Object3D[]): void;
    initOctrees(bounds: BoundingBox): void;
    getObjectByName(name: string): Object3D | undefined;
    update(deltaTime?: number): void;
    updateLights(camera: import('../interfaces/index.js').CameraInterfaceData): void;
    private _updateLightsRecursive;
    updateStaticOctree(): void;
    updateDynamicOctree(): void;
    private _addObjectToOctree;
    private _updateBehaviorsRecursive;
    /**
     * Returns visible objects, respecting BOTH user visibility and frustum state.
     * Separates opaque and transparent objects.
     * Opaque Grouping: shaderId -> topology -> matUuid -> Object3D[]
     * Transparent: Object3D[] sorted back-to-front
     */
    getVisibleObjectsSorted(vp: Float32Array, camPos: Vector3D): RenderList;
    private _collectVisible;
    get octree(): Octree | undefined;
}
