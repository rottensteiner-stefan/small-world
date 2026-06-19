/// src/physix/Ray.ts
import { Vector3D } from "../math/Vector3D.js";
/**
 * Represents a mathematical ray in 3D space.
 */
export class Ray {
    origin;
    direction;
    /**
     * Creates a new Ray.
     * @param origin The origin point of the ray.
     * @param direction The normalized direction vector of the ray.
     */
    constructor(origin = new Vector3D(), direction = new Vector3D(0, 0, -1)) {
        this.origin = origin;
        this.direction = direction;
    }
    /**
     * Sets the ray's origin and direction.
     * @param origin The new origin.
     * @param direction The new normalized direction.
     * @returns This ray instance.
     */
    set(origin, direction) {
        this.origin.copyFrom(origin);
        this.direction.copyFrom(direction);
        return this;
    }
    /**
     * Computes the point along the ray at a given distance.
     * @param t The distance along the ray.
     * @param target Optional target vector.
     * @returns The computed point.
     */
    at(t, target = new Vector3D()) {
        return target.copyFrom(this.direction).scale(t).add(this.origin);
    }
    /**
     * Tests whether this ray intersects the given AABB.
     * Uses the slab method.
     * @param box The axis-aligned bounding box.
     * @returns The distance `t` to the intersection, or -1 if no intersection.
     */
    intersectsBox(box) {
        let tmin = -Infinity;
        let tmax = Infinity;
        const dirX = this.direction.x;
        const dirY = this.direction.y;
        const dirZ = this.direction.z;
        const oriX = this.origin.x;
        const oriY = this.origin.y;
        const oriZ = this.origin.z;
        const invDirX = 1.0 / (0 === dirX ? 1e-10 : dirX);
        const invDirY = 1.0 / (0 === dirY ? 1e-10 : dirY);
        const invDirZ = 1.0 / (0 === dirZ ? 1e-10 : dirZ);
        let t1 = (box.min.x - oriX) * invDirX;
        let t2 = (box.max.x - oriX) * invDirX;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));
        t1 = (box.min.y - oriY) * invDirY;
        t2 = (box.max.y - oriY) * invDirY;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));
        t1 = (box.min.z - oriZ) * invDirZ;
        t2 = (box.max.z - oriZ) * invDirZ;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));
        if (tmax >= tmin && 0 <= tmax) {
            return 0 <= tmin ? tmin : tmax;
        }
        return -1;
    }
}
//# sourceMappingURL=Ray.js.map