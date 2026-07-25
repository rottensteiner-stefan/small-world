import { SpotLight } from "../../src/core/lights/SpotLight.js";
import { PerspectiveProjection } from "../../src/math/index.js";

describe("SpotLight", () => {
  it("should initialize with default properties", () => {
    const light = new SpotLight();
    expect(light.castShadow).toBe(false);
    expect(light.shadowCamera).toBeUndefined();
  });

  it("should initialize shadowCamera if castShadow is true", () => {
    const light = new SpotLight({ castShadow: true, angle: Math.PI / 4, distance: 100 });
    expect(light.shadowCamera).toBeDefined();

    const proj = light.shadowCamera!.projection as PerspectiveProjection;
    // FOV should be double the angle
    expect(proj.fov).toBeCloseTo((Math.PI / 4) * 2.0);
    expect(proj.far).toBeCloseTo(100);
  });

  it("should update shadowCamera position and target correctly", () => {
    const light = new SpotLight({ castShadow: true });

    // Set position and update its world matrix
    light.setPosition(10, 20, 30);
    light.direction.set(0, -1, 0);
    light.updateMatrixWorld();

    // Explicitly update shadow camera
    light.updateShadowCamera();

    const cam = light.shadowCamera!;
    expect(cam.position.x).toBeCloseTo(10);
    expect(cam.position.y).toBeCloseTo(20);
    expect(cam.position.z).toBeCloseTo(30);

    // Target should be position + direction
    expect(cam.target.x).toBeCloseTo(10);
    expect(cam.target.y).toBeCloseTo(19); // 20 - 1
    expect(cam.target.z).toBeCloseTo(30);
  });

  it("should adjust up vector if pointing straight down", () => {
    const light = new SpotLight({ castShadow: true });
    light.direction.set(0, -1, 0); // Pointing straight down
    light.updateMatrixWorld();
    light.updateShadowCamera();

    const cam = light.shadowCamera!;
    expect(cam.up.x).toBeCloseTo(0);
    expect(cam.up.y).toBeCloseTo(0);
    expect(cam.up.z).toBeCloseTo(-1);
  });

  it("should use standard up vector if not pointing straight down", () => {
    const light = new SpotLight({ castShadow: true });
    light.direction.set(1, -0.5, 0).normalize();
    light.updateMatrixWorld();
    light.updateShadowCamera();

    const cam = light.shadowCamera!;
    expect(cam.up.x).toBeCloseTo(0);
    expect(cam.up.y).toBeCloseTo(1);
    expect(cam.up.z).toBeCloseTo(0);
  });
});
