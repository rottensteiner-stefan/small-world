import { Vector2D } from '../math/index.js';
import { CameraInterfaceData } from '../interfaces/index.js';
import { Object3D } from '../core/Object3D.js';
import { Ray } from './Ray.js';
/**
 * Represents an intersection result from a raycast.
 */
export interface Intersection {
    /** Distance from the ray origin to the intersection point. */
    distance: number;
    /** The intersected object. */
    object: Object3D;
}
/**
 * Casts rays into the scene to pick or select objects.
 */
export declare class Raycaster {
    /** The internal mathematical ray used for casting. */
    ray: Ray;
    /**
     * Sets the ray's origin and direction based on screen coordinates and the camera.
     * @param coords The 2D coordinates in Normalized Device Coordinates (NDC) [-1, 1].
     * @param camera The camera used to render the scene.
     */
    setFromCamera(coords: Vector2D, camera: CameraInterfaceData): void;
    /**
     * Tests the ray against a list of objects.
     * Currently uses fast AABB (BoundingBox) intersection.
     * @param objects The objects to test against.
     * @param sort If true, the results are sorted by distance (closest first).
     * @returns An array of intersections.
     */
    intersectObjects(objects: Object3D[], sort?: boolean): Intersection[];
}
