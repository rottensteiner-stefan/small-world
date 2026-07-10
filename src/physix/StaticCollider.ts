/// src/physix/StaticCollider.ts
import { Collidable, BoundingVolume } from "../interfaces/index.js";

/**
 * A lightweight collision object that avoids the overhead of a full Object3D.
 * Used for inserting static obstacles (like grid walls) into a SpatialHash.
 */
export class StaticCollider implements Collidable {
  public bounds: BoundingVolume | undefined;

  // To allow InteractionManager to filter out non-pickable hits
  public isPickable: boolean = true;

  constructor(bounds?: BoundingVolume) {
    this.bounds = bounds;
  }
}
