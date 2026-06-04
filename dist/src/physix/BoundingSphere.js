/// src/physix/BoundingSphere.ts
import { BoundingType } from "../enums/index.js";
import { Collision } from "./Collision.js";
/**
 * Represents a bounding sphere in 3D space.
 */
export class BoundingSphere {
    center;
    radius;
    /** @inheritdoc */
    type = BoundingType.SPHERE;
    /**
     * Creates a new BoundingSphere.
     * @param center The center position of the sphere.
     * @param radius The radius of the sphere.
     */
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
    /** @inheritdoc */
    getBroadRadius() {
        return this.radius;
    }
    /** @inheritdoc */
    intersectsFrustum(frustum) {
        const c = this.center;
        const r = this.radius;
        const p = frustum.planes;
        for (let i = 0; 6 > i; i++) {
            const idx = i * 4;
            const dist = p[idx] * c.x + p[idx + 1] * c.y + p[idx + 2] * c.z + p[idx + 3];
            if (-r > dist) {
                return false;
            }
        }
        return true;
    }
    /** @inheritdoc */
    intersectsVolume(other) {
        return Collision.test(this, other);
    }
    /** @inheritdoc */
    containsVolume(other) {
        if (BoundingType.SPHERE === other.type) {
            const s = other;
            const d = this.center.distanceTo(s.center);
            return d + s.radius <= this.radius;
        }
        if (BoundingType.BOX === other.type) {
            const b = other;
            // All 8 corners of the box must be inside the sphere
            // This is quite expensive, but rarely used for sphere parents.
            // For now, let's use a simpler check: dist(center, box.center) + box.radius <= sphere.radius
            const d = this.center.distanceTo(b.center);
            return d + b.getBroadRadius() <= this.radius;
        }
        return false;
    }
    /** @inheritdoc */
    transform(matrix) {
        matrix.transformVector(this.center);
        // Approximate new radius by taking the max scale
        const me = matrix.data;
        const sX = Math.sqrt(me[0] * me[0] + me[1] * me[1] + me[2] * me[2]);
        const sY = Math.sqrt(me[4] * me[4] + me[5] * me[5] + me[6] * me[6]);
        const sZ = Math.sqrt(me[8] * me[8] + me[9] * me[9] + me[10] * me[10]);
        this.radius *= Math.max(sX, sY, sZ);
    }
}
//# sourceMappingURL=BoundingSphere.js.map