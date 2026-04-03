/// examples/demo2.ts

import {
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  Input,
  Keys,
  Object3D,
  PerspectiveProjection,
  PhongMaterial,
  Plane,
  ProjectionType,
  Vector3D,
  WireframeMaterial,
} from "../src/index.js";
import { AbstractDemo } from "./AbstractDemo.js";

/**
 * Demo 2: Interactive camera (FPS-style) and keyboard input.
 * Shows how to move the camera with mouse and keyboard.
 */
export class Demo2 extends AbstractDemo {
  private _targetPos: Vector3D = new Vector3D(0, 2, 0);
  private _moveSpeed: number = 10.0;

  /** @inheritdoc */
  protected override async setupScene(): Promise<void> {
    // 1. Initialize input (Keyboard & Mouse)
    Input.init();
    Input.debug = true;

    // Attach event listener directly to the canvas to activate PointerLock (mouse capture)
    this.canvas.addEventListener("click", (): void => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });

    // 2. Configure camera (FPS mode)
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect: number = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (75 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }
    // We switch to the First-Person strategy
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 2, 0); // Start position

    // 3. Add light
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Create a large floor (Plane)
    const floor: Object3D = new Object3D("Floor");
    floor.geometry = new Plane({
      width: 50,
      depth: 50,
      widthSegments: 10,
      depthSegments: 10,
    }).getGeometryData();

    // We use a wireframe material so that the movement is better perceived
    const floorMat: WireframeMaterial = new WireframeMaterial();
    floorMat.color = Color.DARKSLATEGRAY;
    floor.material = floorMat;

    // The plane is created by default XY-aligned (standing).
    // We tilt it by 90 degrees on the X-axis so it lies flat.
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // 5. Distribute some obstacles (cubes)
    const boxMat: PhongMaterial = new PhongMaterial({
      color: Color.RED,
      shininess: 30,
    });

    for (let i: number = 0; 20 > i; i++) {
      const box: Object3D = new Object3D(`Box_${i}`);
      box.geometry = new Cube({ size: Math.random() * 2 + 1 }).getGeometryData();
      box.material = boxMat;

      // Random position on the floor
      const px: number = (Math.random() - 0.5) * 40;
      const pz: number = (Math.random() - 0.5) * 40;
      box.position.set(px, 1, pz);

      // Random rotation
      box.rotation.y = Math.random() * Math.PI;

      this.scene.add(box);
    }
  }

  protected override onCanvasRecreated(): void {
    // Since we recreated the canvas, we must reattach the click listener!
    this.canvas.addEventListener("click", (): void => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });
  }

  /** @inheritdoc */
  protected override update(deltaTime: number): void {
    // 1. Query mouse deltas (only if pointer is locked)
    const dx: number = Input.isPointerLocked ? Input.mouse.dx : 0;
    const dy: number = Input.isPointerLocked ? Input.mouse.dy : 0;

    // Reset deltas so they are not applied again in the next frame
    Input.mouse.dx = 0;
    Input.mouse.dy = 0;

    // 2. Keyboard input for movement (W,A,S,D)
    // We determine the axes: -1, 0, or 1
    const moveZ: number = Input.getAxis(Keys.W, Keys.S); // Forward / Backward
    const moveX: number = Input.getAxis(Keys.A, Keys.D); // Left / Right

    // 3. Calculate movement direction relative to camera rotation
    // The camera rotates around the Y-axis (theta).
    if (0 !== moveZ || 0 !== moveX) {
      const sin: number = Math.sin(this.camera.theta);
      const cos: number = Math.cos(this.camera.theta);

      // Rotate direction vector (2D rotation matrix)
      const dirX: number = moveX * cos + moveZ * sin;
      const dirZ: number = -moveX * sin + moveZ * cos;

      // Update position
      this._targetPos.x += dirX * this._moveSpeed * deltaTime;
      this._targetPos.z += dirZ * this._moveSpeed * deltaTime;
    }

    // 4. Call camera update
    // The camera strategy (FPS) internally handles how the rotation (dx, dy)
    // is applied to the target position.
    this.camera.update(this._targetPos, dx, dy, deltaTime);
  }

  /** @inheritdoc */
  protected override getDebugInfo(): Record<string, string | number> {
    const base: Record<string, string | number> = super.getDebugInfo();
    return {
      ...base,
      Demo: "02 - FPS Camera",
    };
  }
}

// === START THE ENGINE ===
const app: Demo2 = new Demo2();
app
  .start()
  .then((): void => {
    console.log("Engine running");
  })
  .catch((err: Error): void => {
    console.error("Error while starting the engine: ", err);
  });
