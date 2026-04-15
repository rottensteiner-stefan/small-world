import { Object3D } from './Object3D.js';
import { Octree } from './Octree.js';
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
    /** The octree for spatial partitioning. */
    octree: Octree | undefined;
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
     * Rebuilds the octree from the current objects in the scene.
     */
    updateOctree(): void;
    /**
     * Adds an object and its children to the octree.
     * @param obj The object to add.
     * @private
     */
    private _addObjectToOctree;
}
