import { Object3D } from './Object3D.js';
import { Octree } from './Octree.js';
import { BoundingBox } from '../physics/BoundingBox.js';
/**
 * A scene that holds a collection of 3D objects.
 */
export declare class Scene {
    objects: Object3D[];
    private readonly _objectsByName;
    staticOctree: Octree | undefined;
    dynamicOctree: Octree | undefined;
    add(...objs: Object3D[]): void;
    remove(...objs: Object3D[]): void;
    initOctrees(bounds: BoundingBox): void;
    getObjectByName(name: string): Object3D | undefined;
    update(): void;
    updateStaticOctree(): void;
    updateDynamicOctree(): void;
    private _addObjectToOctree;
    /**
     * Returns visible objects, respecting BOTH user visibility and frustum state.
     */
    getVisibleObjectsSorted(): Map<string, Map<string, Object3D[]>>;
    private _collectVisible;
    get octree(): Octree | undefined;
}
