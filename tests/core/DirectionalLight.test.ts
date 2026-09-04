import { describe, expect, it } from "vitest";
import { OrthographicProjection } from "../../src/math/projections/index.js";
import { Vector3D } from "../../src/math/index.js";
import { DirectionalLight } from "../../src/core/lights/DirectionalLight.js";
import { Camera } from "../../src/core/Camera.js";

describe("DirectionalLight.updateCascades", () => {
  it("updates cascades for an orthographic (ISOMETRIC) camera instead of early-returning", () => {
    const camera = new Camera(
      new OrthographicProjection({
        left: -25,
        right: 25,
        bottom: -25,
        top: 25,
        near: 0.1,
        far: 200,
      }),
    );
    camera.position.set(0, 50, 0);
    camera.target.set(0, 0, 0);

    const light = new DirectionalLight({
      direction: new Vector3D(0, -1, 0),
      numCascades: 4,
      castShadow: true,
    });

    light.updateCascades(camera);

    // The ortho branch must compute split distances spanning the real far plane; the old code
    // returned early here and left cascadeSplits untouched at their initial value of 0.
    expect(light.cascadeSplits[light.numCascades - 1]).toBeCloseTo(200, 5);

    // Cascade cameras must be refit to the ortho main frustum instead of staying frozen at the
    // constructor's default -10..10 origin box.
    const firstCascade = light.cascadeCameras[0]!.projection as OrthographicProjection;
    expect(firstCascade.right - firstCascade.left).toBeGreaterThan(0);
    expect(firstCascade.top - firstCascade.bottom).toBeGreaterThan(0);
  });
});
