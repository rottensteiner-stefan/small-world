import { Collidable, BoundingVolume } from '../interfaces/index.js';
/**
 * A lightweight collision object that avoids the overhead of a full Object3D.
 * Used for inserting static obstacles (like grid walls) into a SpatialHash.
 */
export declare class StaticCollider implements Collidable {
    bounds: BoundingVolume | undefined;
    isPickable: boolean;
    constructor(bounds?: BoundingVolume);
}
