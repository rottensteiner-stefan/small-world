import { Object3D } from './Object3D.js';
import { Octree } from './Octree.js';
import { BoundingBox } from '../physics/BoundingBox.js';
/**
 * A scene that holds a collection of 3D objects.
 */
export declare class Scene {
    /**
     * The list of objects in the scene.
     */
    objects: Object3D[];
    /**
     * A map for fast O(1) object lookups by name.
     */
    private readonly _objectsByName;
    /** The octree for static objects. */
    staticOctree: Octree | undefined;
    /** The octree for dynamic objects. */
    dynamicOctree: Octree | undefined;
    /**
     * Adds objects to the scene.
     * @param objs The objects to add.
     */
    add(...objs: Object3D[]): void;
    /**
     * Removes objects from the scene.
     * @param objs The objects to remove.
     */
    remove(...objs: Object3D[]): void;
    /**
     * Initializes the octrees for the scene.
     * @param bounds The bounds of the octrees.
     */
    initOctrees(bounds: BoundingBox): void;
    /**
     * Retrieves an object by its name.
     * @param name The name of the object to find.
     * @returns The object, or undefined if not found.
     */
    getObjectByName(name: string): Object3D | undefined;
    /**
     * Updates all objects in the scene.
     */
    update(): void;
    /**
     * Rebuilds the static octree from all static objects in the scene.
     * This should be called manually when the static scene changes.
     */
    updateStaticOctree(): void;
    /**
     * Rebuilds the dynamic octree from all dynamic objects in the scene.
     */
    updateDynamicOctree(): void;
    /**
     * Adds an object and its children to the respective octree.
     * @param obj The object to add.
     * @param checkStatic Whether to add static or dynamic objects.
     * @private
     */
    private _addObjectToOctree;
    /**
     * Returns all visible objects in the scene, grouped by their shader ID and material UUID
     * to minimize state changes during rendering.
     * @returns A map of shader IDs to a map of material UUIDs to arrays of objects.
     */
    getVisibleObjectsSorted(): Map<string, Map<string, Object3D[]>>;
    /**
     * Recursively collects visible objects into the sorted map.
     * @private
     */
    private _collectVisible;
    /**
     * Backwards compatibility for the old 'octree' property.
     * Returns the static octree if it exists.
     */
    get octree(): Octree | undefined;
}
