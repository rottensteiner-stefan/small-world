/// src/examples/example8.ts

import {
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  ZoomController,
  MathUtils,
  Object3D,
  PerspectiveProjection,
  PhongMaterial,
  Skydome,
  Texture,
} from "../index.js";
import { AbstractExample } from "../core/index.js";

/**
 * Example 8: Clean rebuild with Skydome, Reference Cubes, WASD/QE movement.
 */
export class Example8 extends AbstractExample {
  private readonly _moveSpeed: number = 15.0;
  private readonly _eyeHeight: number = 2.0;

  private _skydome: Skydome | undefined = undefined;
  private _time: number = 0;

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

    this.camera.addBehavior(
      new FPSController({
        moveSpeed: this._moveSpeed,
      }),
    );
    this.camera.addBehavior(new ZoomController());

    // 2. Lighting
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.5 }));
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 3. Skydome
    const skyTexture: Texture = await Texture.fromUrl("/resources/examples/8/skydome-1.jpg");

    const skydome: Skydome = new Skydome({
      texture: skyTexture,
      radius: 1000, // Large enough to cover the visible space without clipping
      widthSegments: 64,
      heightSegments: 64,
    });
    this.scene.add(skydome);
    this._skydome = skydome;

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
    this._time += deltaTime;

    // The FPSController handles Mouse Look, WASD movement and Zoom.

    // 4. Collision / Floor Clamp
    this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);

    // 5. Update Skydome & Floor Position
    // The skydome must always be exactly on the camera.
    if (undefined !== this._skydome) {
      this._skydome.position.copyFrom(this.camera.position);
    }
  }
}

const app: Example8 = new Example8();
app
  .start()
  .then((): void => {
    console.log("Example 8 running");
  })
  .catch((err: Error): void => {
    console.error("Error starting engine:", err);
  });
