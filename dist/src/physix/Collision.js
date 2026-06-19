/// src/physix/Collision.ts
import { MathPool } from "../math/index.js";
import { BoundingType } from "../enums/index.js";
/**
 * Static class for collision detection and resolution.
 */
export class Collision {
    /**
     * Performs a collision test between two bounding volumes.
     */
    static test(a, b) {
        const distSq = a.center.distanceToSq(b.center);
        const sumRad = a.getBroadRadius() + b.getBroadRadius();
        if (distSq > sumRad * sumRad)
            return false;
        // Use specific logic based on types to avoid infinite recursion
        if (BoundingType.SPHERE === a.type && BoundingType.SPHERE === b.type) {
            return this._sphereSphere(a, b);
        }
        if (BoundingType.BOX === a.type && BoundingType.BOX === b.type) {
            return this._boxBox(a, b);
        }
        if (BoundingType.SPHERE === a.type && BoundingType.BOX === b.type) {
            return this._sphereBox(a, b);
        }
        if (BoundingType.BOX === a.type && BoundingType.SPHERE === b.type) {
            return this._sphereBox(b, a);
        }
        return false;
    }
    /**
     * Resolves collision between a sphere and a box, returning a correction vector.
     * @param s The sphere (e.g. Camera).
     * @param b The box (e.g. Wall).
     * @param result Vector to store the correction.
     * @returns True if collision was resolved.
     */
    static resolveSphereBox(s, b, result) {
        const closest = MathPool.acquireVector().set(Math.max(b.min.x, Math.min(s.center.x, b.max.x)), Math.max(b.min.y, Math.min(s.center.y, b.max.y)), Math.max(b.min.z, Math.min(s.center.z, b.max.z)));
        const diff = MathPool.acquireVector().copyFrom(s.center).sub(closest);
        const distSq = diff.lengthSq();
        if (distSq >= s.radius * s.radius) {
            MathPool.releaseVector(closest);
            MathPool.releaseVector(diff);
            return false;
        }
        const dist = Math.sqrt(distSq);
        if (0.0001 > dist) {
            // Sphere center is exactly on the edge or inside. Push out along the axis of least penetration.
            const dx1 = s.center.x - b.min.x;
            const dx2 = b.max.x - s.center.x;
            const dy1 = s.center.y - b.min.y;
            const dy2 = b.max.y - s.center.y;
            const dz1 = s.center.z - b.min.z;
            const dz2 = b.max.z - s.center.z;
            const min = Math.min(dx1, dx2, dy1, dy2, dz1, dz2);
            if (min === dx1) {
                result.set(-s.radius - dx1, 0, 0);
            }
            else if (min === dx2) {
                result.set(s.radius + dx2, 0, 0);
            }
            else if (min === dy1) {
                result.set(0, -s.radius - dy1, 0);
            }
            else if (min === dy2) {
                result.set(0, s.radius + dy2, 0);
            }
            else if (min === dz1) {
                result.set(0, 0, -s.radius - dz1);
            }
            else {
                result.set(0, 0, s.radius + dz2);
            }
        }
        else {
            const overlap = s.radius - dist;
            result.copyFrom(diff).normalize().scale(overlap);
        }
        MathPool.releaseVector(closest);
        MathPool.releaseVector(diff);
        return true;
    }
    static _sphereSphere(s1, s2) {
        const d2 = s1.center.distanceToSq(s2.center);
        const r2 = (s1.radius + s2.radius) * (s1.radius + s2.radius);
        return d2 <= r2;
    }
    static _boxBox(b1, b2) {
        return (b1.min.x <= b2.max.x &&
            b1.max.x >= b2.min.x &&
            b1.min.y <= b2.max.y &&
            b1.max.y >= b2.min.y &&
            b1.min.z <= b2.max.z &&
            b1.max.z >= b2.min.z);
    }
    static _sphereBox(s, b) {
        const closest = MathPool.acquireVector().set(Math.max(b.min.x, Math.min(s.center.x, b.max.x)), Math.max(b.min.y, Math.min(s.center.y, b.max.y)), Math.max(b.min.z, Math.min(s.center.z, b.max.z)));
        const result = closest.distanceToSq(s.center) <= s.radius * s.radius;
        MathPool.releaseVector(closest);
        return result;
    }
}
//# sourceMappingURL=Collision.js.map