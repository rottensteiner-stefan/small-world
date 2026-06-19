/// src/physix/Raycaster.ts
import { MathPool } from "../math/index.js";
import { BoundingType } from "../enums/index.js";
import { Ray } from "./Ray.js";
/**
 * Casts rays into the scene to pick or select objects.
 */
export class Raycaster {
    /** The internal mathematical ray used for casting. */
    ray = new Ray();
    /**
     * Sets the ray's origin and direction based on screen coordinates and the camera.
     * @param coords The 2D coordinates in Normalized Device Coordinates (NDC) [-1, 1].
     * @param camera The camera used to render the scene.
     */
    setFromCamera(coords, camera) {
        const invVP = MathPool.acquireMatrix();
        if (false === camera.viewProjectionMatrix4.invert(invVP)) {
            MathPool.releaseMatrix(invVP);
            return;
        }
        // Determine the ray direction by unprojecting the point on the far plane
        const target = MathPool.acquireVector().set(coords.x, coords.y, 1.0);
        invVP.transformVector(target);
        // Origin is the camera position for perspective (simplification)
        this.ray.origin.copyFrom(camera.position);
        // Direction is target - origin
        this.ray.direction.copyFrom(target).sub(this.ray.origin).normalize();
        MathPool.releaseVector(target);
        MathPool.releaseMatrix(invVP);
    }
    /**
     * Tests the ray against a list of objects.
     * Currently uses fast AABB (BoundingBox) intersection.
     * @param objects The objects to test against.
     * @param sort If true, the results are sorted by distance (closest first).
     * @returns An array of intersections.
     */
    intersectObjects(objects, sort = true) {
        const intersects = [];
        for (const obj of objects) {
            if (!obj.isVisible || !obj.bounds || obj.bounds.type !== BoundingType.BOX) {
                continue;
            }
            const box = obj.bounds;
            const t = this.ray.intersectsBox(box);
            if (0 <= t) {
                intersects.push({
                    distance: t,
                    object: obj,
                });
            }
        }
        if (sort) {
            intersects.sort((a, b) => a.distance - b.distance);
        }
        return intersects;
    }
}
//# sourceMappingURL=Raycaster.js.map