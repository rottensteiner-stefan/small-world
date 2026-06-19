/// src/physix/BoundingBox.ts
import { Vector3D, MathPool } from "../math/index.js";
import { BoundingType } from "../enums/index.js";
import { Collision } from "./Collision.js";
/**
 * Represents an axis-aligned bounding box (AABB).
 */
export class BoundingBox {
    min;
    max;
    /** @inheritdoc */
    type = BoundingType.BOX;
    /** The center of the box. */
    center = new Vector3D();
    /**
     * Creates a new BoundingBox.
     * @param min The minimum coordinates.
     * @param max The maximum coordinates.
     */
    constructor(min = new Vector3D(Infinity, Infinity, Infinity), max = new Vector3D(-Infinity, -Infinity, -Infinity)) {
        this.min = min;
        this.max = max;
        this.center.copyFrom(min).add(max).scale(0.5);
    }
    /**
     * Creates a new BoundingBox that encapsulates all provided vertices.
     * @param vertices The raw vertex data [x, y, z, ...].
     * @returns A new BoundingBox instance.
     */
    static fromVertices(vertices) {
        const min = new Vector3D(Infinity, Infinity, Infinity);
        const max = new Vector3D(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];
            if (x < min.x) {
                min.x = x;
            }
            if (y < min.y) {
                min.y = y;
            }
            if (z < min.z) {
                min.z = z;
            }
            if (x > max.x) {
                max.x = x;
            }
            if (y > max.y) {
                max.y = y;
            }
            if (z > max.z) {
                max.z = z;
            }
        }
        return new BoundingBox(min, max);
    }
    /** @inheritdoc */
    getBroadRadius() {
        return this.min.distanceTo(this.max) * 0.5;
    }
    /**
     * Checks if a point is inside the box.
     * @param point The point to check.
     * @returns True if inside.
     */
    containsPoint(point) {
        return (point.x >= this.min.x &&
            point.x <= this.max.x &&
            point.y >= this.min.y &&
            point.y <= this.max.y &&
            point.z >= this.min.z &&
            point.z <= this.max.z);
    }
    /**
     * Checks if another box intersects with this one.
     * @param other The other box.
     * @returns True if intersecting.
     */
    intersectsBox(other) {
        return (this.min.x <= other.max.x &&
            this.max.x >= other.min.x &&
            this.min.y <= other.max.y &&
            this.max.y >= other.min.y &&
            this.min.z <= other.max.z &&
            this.max.z >= other.min.z);
    }
    /**
     * Checks if another box is entirely contained within this one.
     * @param other The other box.
     * @returns True if entirely contained.
     */
    containsBox(other) {
        return (this.min.x <= other.min.x &&
            this.max.x >= other.max.x &&
            this.min.y <= other.min.y &&
            this.max.y >= other.max.y &&
            this.min.z <= other.min.z &&
            this.max.z >= other.max.z);
    }
    /**
     * Checks if a sphere is entirely contained within this box.
     * @param other The sphere.
     * @returns True if entirely contained.
     */
    containsSphere(other) {
        return (this.min.x <= other.center.x - other.radius &&
            this.max.x >= other.center.x + other.radius &&
            this.min.y <= other.center.y - other.radius &&
            this.max.y >= other.center.y + other.radius &&
            this.min.z <= other.center.z - other.radius &&
            this.max.z >= other.center.z + other.radius);
    }
    /** @inheritdoc */
    intersectsFrustum(frustum) {
        const p = frustum.planes;
        for (let i = 0; 6 > i; i++) {
            const idx = i * 4;
            const p0 = p[idx];
            const p1 = p[idx + 1];
            const p2 = p[idx + 2];
            const p3 = p[idx + 3];
            const px = 0 <= p0 ? this.max.x : this.min.x;
            const py = 0 <= p1 ? this.max.y : this.min.y;
            const pz = 0 <= p2 ? this.max.z : this.min.z;
            const dist = p0 * px + p1 * py + p2 * pz + p3;
            if (0 > dist) {
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
        if (BoundingType.BOX === other.type) {
            return this.containsBox(other);
        }
        if (BoundingType.SPHERE === other.type) {
            return this.containsSphere(other);
        }
        return false;
    }
    /** @inheritdoc */
    transform(matrix) {
        const min = this.min;
        const max = this.max;
        // Corners of the box
        const points = [
            MathPool.acquireVector().set(min.x, min.y, min.z),
            MathPool.acquireVector().set(min.x, min.y, max.z),
            MathPool.acquireVector().set(min.x, max.y, min.z),
            MathPool.acquireVector().set(min.x, max.y, max.z),
            MathPool.acquireVector().set(max.x, min.y, min.z),
            MathPool.acquireVector().set(max.x, min.y, max.z),
            MathPool.acquireVector().set(max.x, max.y, min.z),
            MathPool.acquireVector().set(max.x, max.y, max.z),
        ];
        min.set(Infinity, Infinity, Infinity);
        max.set(-Infinity, -Infinity, -Infinity);
        for (const p of points) {
            matrix.transformVector(p);
            min.min(p);
            max.max(p);
            MathPool.releaseVector(p);
        }
        this.center.copyFrom(min).add(max).scale(0.5);
    }
}
//# sourceMappingURL=BoundingBox.js.map