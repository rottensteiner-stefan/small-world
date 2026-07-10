/// src/physix/SpatialHash.ts
import { Collidable, BoundingVolume } from "../interfaces/index.js";

/**
 * A simple 2D spatial hash for fast broad-phase collision detection on the XZ plane.
 * Useful for grid-based games like YAD where vertical checks are mostly irrelevant for walls.
 */
export class SpatialHash {
  public cellSize: number;
  private _grid: Map<string, Collidable[]> = new Map();

  /**
   * @param cellSize The size of a single grid cell. E.g. if walls are 2 units, use 2.
   */
  constructor(cellSize: number = 2) {
    this.cellSize = cellSize;
  }

  /**
   * Inserts an object into the spatial hash based on its bounding volume.
   */
  public insert(obj: Collidable): void {
    if (!obj.bounds) return;

    const bounds = obj.bounds;
    const r = bounds.getBroadRadius();
    const minX = bounds.center.x - r;
    const maxX = bounds.center.x + r;
    const minZ = bounds.center.z - r;
    const maxZ = bounds.center.z + r;

    const startCellX = Math.floor(minX / this.cellSize);
    const endCellX = Math.floor(maxX / this.cellSize);
    const startCellZ = Math.floor(minZ / this.cellSize);
    const endCellZ = Math.floor(maxZ / this.cellSize);

    for (let x = startCellX; x <= endCellX; x++) {
      for (let z = startCellZ; z <= endCellZ; z++) {
        const key = this._getKey(x, z);
        let list = this._grid.get(key);
        if (!list) {
          list = [];
          this._grid.set(key, list);
        }
        if (!list.includes(obj)) {
          list.push(obj);
        }
      }
    }
  }

  /**
   * Clears the spatial hash.
   */
  public clear(): void {
    this._grid.clear();
  }

  /**
   * Queries for potential collisions in the given volume's area.
   */
  public query(volume: BoundingVolume): Collidable[] {
    const result = new Set<Collidable>();
    const r = volume.getBroadRadius();
    const minX = volume.center.x - r;
    const maxX = volume.center.x + r;
    const minZ = volume.center.z - r;
    const maxZ = volume.center.z + r;

    const startCellX = Math.floor(minX / this.cellSize);
    const endCellX = Math.floor(maxX / this.cellSize);
    const startCellZ = Math.floor(minZ / this.cellSize);
    const endCellZ = Math.floor(maxZ / this.cellSize);

    for (let x = startCellX; x <= endCellX; x++) {
      for (let z = startCellZ; z <= endCellZ; z++) {
        const key = this._getKey(x, z);
        const list = this._grid.get(key);
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const obj = list[i]!;
            if (obj.bounds && obj.bounds.intersectsVolume(volume)) {
              result.add(obj);
            }
          }
        }
      }
    }

    return Array.from(result);
  }

  /**
   * Queries for potential collisions along a ray on the XZ plane.
   * This is a simple broad-phase approach stepping along the ray direction.
   */
  public queryRay(ray: import("./Ray.js").Ray, maxDistance: number = 100): Collidable[] {
    const result = new Set<Collidable>();

    // Step size roughly half a cell to not miss any cells
    const stepSize = this.cellSize * 0.5;
    for (let d = 0; d <= maxDistance; d += stepSize) {
      const px = ray.origin.x + ray.direction.x * d;
      const pz = ray.origin.z + ray.direction.z * d;

      const cx = Math.floor(px / this.cellSize);
      const cz = Math.floor(pz / this.cellSize);
      const key = this._getKey(cx, cz);

      const list = this._grid.get(key);
      if (list) {
        for (let i = 0; i < list.length; i++) {
          result.add(list[i]!);
        }
      }
    }

    return Array.from(result);
  }

  private _getKey(x: number, z: number): string {
    return `${x},${z}`;
  }
}
