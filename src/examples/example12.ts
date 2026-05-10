import {
  AmbientLight,
  BasicMaterial,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  Input,
  MathUtils,
  Object3D,
  PerspectiveProjection,
  Cylinder,
} from "../index.js";
import { AbstractExample } from "../core/example/AbstractExample.js";

/**
 * Example 12: Controls Verification.
 * Used to visually verify that WASD and coordinate systems follow the engine standard.
 */
class Example12 extends AbstractExample {
  
  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // 1. Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 2, 10);
    this.camera.theta = 0; // Looking towards -Z

    // 2. Add FPS Controller
    this.controllers.push(new FPSController(this.camera, { moveSpeed: 10 }));

    // Pointer Lock Request on click
    window.addEventListener("mousedown", () => {
      Input.requestPointerLock(this.canvas);
    });

    // 3. Lighting
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.3 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Verification Grid
    const floorMat = new BasicMaterial({ color: new Color(0.2, 0.2, 0.2) });
    const floor = new Object3D("Floor");
    floor.geometry = new Cylinder({ radiusTop: 20, radiusBottom: 20, height: 0.1 }).getGeometryData();
    floor.material = floorMat;
    floor.setPosition(0, -0.05, 0);
    this.scene.add(floor);

    // X-Axis (Red) -> Right
    const xPositive = this._createMarker(new Color(1, 0, 0), "X+ (Right)");
    xPositive.position.set(5, 0.5, 0);
    this.scene.add(xPositive);

    // Z-Axis (Blue) -> Back (Positive Z is towards the viewer if looking at origin)
    // Front is -Z
    const zNegative = this._createMarker(new Color(0, 1, 1), "Z- (Front/Forward)");
    zNegative.position.set(0, 0.5, -5);
    this.scene.add(zNegative);

    const zPositive = this._createMarker(new Color(0, 0, 1), "Z+ (Back/Backward)");
    zPositive.position.set(0, 0.5, 5);
    this.scene.add(zPositive);
  }

  private _createMarker(color: Color, name: string): Object3D {
    const obj = new Object3D(name);
    obj.geometry = new Cube({ size: 1 }).getGeometryData();
    obj.material = new BasicMaterial({ color });
    return obj;
  }

  protected override update(_deltaTime: number): void {}
}

const app = new Example12();
app.start().catch(console.error);
