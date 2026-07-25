import { Object3D } from './Object3D.js';
import { Octree } from './Octree.js';
import { Fog } from './Fog.js';
import { Vector3D } from '../math/index.js';
import { BoundingBox, SpatialHash } from '../physix/index.js';
import { Topology } from '../enums/index.js';
import { Collidable } from '../interfaces/index.js';
export interface RenderBatch {
    shaderId: string;
    topology: Topology;
    matUuid: string;
    wireframeMode?: "structural" | "triangles";
    objects: Object3D[];
}
export interface RenderList {
    opaqueLookup: Map<string, Map<Topology, Map<string, RenderBatch>>>;
    opaqueBatches: RenderBatch[];
    transparent: Object3D[];
}
/**
 * A scene that holds a collection of 3D objects.
 */
export declare class Scene {
    readonly root: Object3D;
    get objects(): Object3D[];
    staticOctree: Octree | undefined;
    dynamicOctree: Octree | undefined;
    spatialHash: SpatialHash | undefined;
    /**
     * Lightweight static colliders (e.g. `StaticCollider`) that aren't part of
     * the `Object3D` scene graph. `PhysicsSystem` reads this in addition to
     * walking `objects`, so non-Object3D obstacles participate in collision
     * resolution too.
     */
    staticColliders: Collidable[];
    fog?: Fog;
    irradianceMap?: import('./textures/index.js').CubeTexture;
    prefilterMap?: import('./textures/index.js').CubeTexture;
    brdfLUT?: import('./textures/index.js').Texture;
    environmentIntensity: number;
    private readonly _renderList;
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
