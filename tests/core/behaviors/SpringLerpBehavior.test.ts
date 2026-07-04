import { SpringLerpBehavior } from "../../../src/core/behaviors/SpringLerpBehavior.js";
import { Object3D } from "../../../src/core/Object3D.js";
import { Vector3D } from "../../../src/math/Vector3D.js";

describe("SpringLerpBehavior", () => {
  it("should interpolate position towards the target over time", () => {
    const target = new Object3D("testTarget");
    target.position.set(0, 0, 0);

    const behavior = new SpringLerpBehavior(new Vector3D(10, 10, 10), 0.5);
    behavior.onAttach(target);

    // Update with 1/60th of a second
    behavior.update(1 / 60);

    // At 60fps and lerp 0.5, t should be exactly 0.5
    expect(target.position.x).toBeCloseTo(5.0, 3);
    expect(target.position.y).toBeCloseTo(5.0, 3);
    expect(target.position.z).toBeCloseTo(5.0, 3);

    // Update again
    behavior.update(1 / 60);

    // 0.5 * remaining distance (5) = 2.5. Total 7.5
    expect(target.position.x).toBeCloseTo(7.5, 3);
    expect(target.position.y).toBeCloseTo(7.5, 3);
    expect(target.position.z).toBeCloseTo(7.5, 3);
  });
});
