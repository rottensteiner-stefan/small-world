/// examples/example9.ts

import {
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  Input,
  Keys,
  MathUtils,
  Object3D,
  PerspectiveProjection,
  PhongMaterial,
  Plane,
  Skydome,
  Texture,
} from "../src/index.js";
import { AbstractExample } from "../src/core/example/AbstractExample.js";

/**
 * Example 9: Clean rebuild with Skydome, Green Floor, WASD/QE movement.
 */
export class Example9 extends AbstractExample {
  private readonly _moveSpeed: number = 15.0;
  private readonly _eyeHeight: number = 2.0;

  private _skydome: Skydome | undefined = undefined;
  private _floor: Object3D | undefined = undefined;

  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // 1. Camera
    const aspect: number = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect,
      near: 0.1,
      far: 2000, // Make sure far plane is large enough for the skydome
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, this._eyeHeight, 0);

    // 2. Lighting
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.5 }));
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 3. Skydome
    const skyTexture: Texture = await Texture.fromUrl("/resources/models/textures/skydome-1.jpg");

    const skydome: Skydome = new Skydome({
      texture: skyTexture,
      radius: 1000, // Large enough to cover the visible space without clipping
    });
    this.scene.add(skydome);
    this._skydome = skydome;

    // 4. Floor
    // The floor doesn't need to be gigantic as long as it moves with the camera.
    // It only needs to cover the area up to the clipping plane.
    const floor: Object3D = new Object3D("Floor");
    floor.geometry = new Plane({
      width: 4000,
      depth: 4000,
      widthSegments: 10,
      depthSegments: 10,
    }).getGeometryData();

    floor.material = new PhongMaterial({
      color: new Color(0.2, 0.8, 0.2), // Bright grass green
      shininess: 0,
    });
    floor.rotation.x = -MathUtils.HALF_PI;
    this.scene.add(floor);
    this._floor = floor;

    // 5. Reference points (Illusion Breaker)
    const referenceCube: Object3D = new Object3D("ReferenceCube");
    referenceCube.geometry = new Cube({ size: 2 }).getGeometryData();
    referenceCube.material = new PhongMaterial({ color: Color.BLUE, shininess: 50 });
    referenceCube.position.set(0, 1, -10); // Exactly in front of our starting position
    this.scene.add(referenceCube);

    const redCube: Object3D = new Object3D("RedCube");
    redCube.geometry = new Cube({ size: 2 }).getGeometryData();
    redCube.material = new PhongMaterial({ color: Color.RED, shininess: 50 });
    redCube.position.set(10, 1, 0); // To our right
    this.scene.add(redCube);
  }

  protected override update(deltaTime: number): void {
    // 1. Process rotation from mouse
    let dx: number = 0;
    let dy: number = 0;
    if (Input.isPointerLocked) {
      dx = Input.mouse.dx;
      dy = Input.mouse.dy;
    }
    Input.mouse.dx = 0;
    Input.mouse.dy = 0;

    // We update the camera once in advance so that the rotation (theta) for the movement vector is current.
    this.camera.update(this.camera.target, dx, dy, deltaTime);

    // 2. Process movement from keyboard
    const moveZ: number = Input.getAxis(Keys.W, Keys.S);
    const moveX: number = Input.getAxis(Keys.A, Keys.D);

    if (0 !== moveZ || 0 !== moveX) {
      const sin: number = Math.sin(this.camera.theta);
      const cos: number = Math.cos(this.camera.theta);

      const dirX: number = moveX * cos + moveZ * sin;
      const dirZ: number = -moveX * sin + moveZ * cos;

      this.camera.position.x += dirX * this._moveSpeed * deltaTime;
      this.camera.position.z += dirZ * this._moveSpeed * deltaTime;
    }

    // 3. Process vertical movement (Q = down, E = up)
    if (true === Input.isPressed(Keys.Q)) {
      this.camera.position.y -= this._moveSpeed * deltaTime;
    }
    if (true === Input.isPressed(Keys.E)) {
      this.camera.position.y += this._moveSpeed * deltaTime;
    }

    // 4. Collision / Floor Clamp
    this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);

    // 5. Update Skydome & Floor Position
    // The skydome must always be exactly on the camera.
    if (undefined !== this._skydome) {
      this._skydome.position.copyFrom(this.camera.position);
    }

    // The floor must also follow the camera (on the X and Z axes),
    // otherwise it "ends" if you walk too far!
    if (undefined !== this._floor) {
      this._floor.position.x = this.camera.position.x;
      this._floor.position.z = this.camera.position.z;
    }
  }

  protected override getDebugInfo(): Record<string, string | number> {
    const base: Record<string, string | number> = super.getDebugInfo();
    return {
      ...base,
      Example: "09 - Skydome Implementation",
      "Pointer Locked": true === Input.isPointerLocked ? "Yes" : "No",
      "Cam X": this.camera.position.x.toFixed(2),
      "Cam Y": this.camera.position.y.toFixed(2),
      "Cam Z": this.camera.position.z.toFixed(2),
    };
  }
}

const app: Example9 = new Example9();
app
  .start()
  .then((): void => {
    console.log("Example 9 running");
  })
  .catch((err: Error): void => {
    console.error("Error starting engine:", err);
  });
