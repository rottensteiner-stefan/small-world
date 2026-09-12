import { describe, expect, it } from "vitest";
import { OBB } from "../../src/physix/OBB.js";
import { Frustum } from "../../src/math/Frustum.js";

describe("OBB Frustum Culling", () => {
  it("should return false when the bounding sphere intersects but actual corners do not (False Positive fix)", () => {
    const obb = new OBB();
    obb.halfExtents.set(10, 1, 1);

    // Bounding sphere radius is length of (10,1,1) = ~10.049
    const sphereRadius = obb.getBroadRadius();
    expect(sphereRadius).toBeGreaterThan(10);
    expect(sphereRadius).toBeLessThan(10.1);

    const frustum = new Frustum();
    // Set up a frustum plane where distance from center is -10.01.
    // The projection of the OBB onto this normal is exactly 10.
    // So the OBB is fully outside the plane (dist = -10.01, -r = -10).
    // But the bounding sphere radius is ~10.049, which would intersect (-10.049 < -10.01).
    frustum.planes.fill(0);
    frustum.planes[0] = -1; // nx
    frustum.planes[1] = 0; // ny
    frustum.planes[2] = 0; // nz
    frustum.planes[3] = -10.01; // d

    // The conservative check (using getBroadRadius) would have returned TRUE.
    // The new 8-corner projection check MUST return FALSE.
    expect(obb.intersectsFrustum(frustum)).toBe(false);
  });
});
