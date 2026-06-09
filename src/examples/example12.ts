/// src/examples/example12.ts

import {
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  Object3D,
  PerspectiveProjection,
  Plane,
  PointLight,
  ProjectionType,
  StandardMaterial,
  Texture,
} from "../index.js";
import { AbstractExample } from "../core/index.js";

class AbyssalDecoExample extends AbstractExample {
  private _flickerLight!: PointLight;
  private _time: number = 0;

  protected override async setupScene(): Promise<void> {
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

    // Load the generated textures
    let texture: Texture | undefined = undefined;
    let normalTexture: Texture | undefined = undefined;
    try {
      texture = await Texture.fromUrl("textures/abyssal_metal.png");
      normalTexture = await Texture.fromUrl("textures/abyssal_metal_normal.png");
    } catch (e) {
      console.warn("Could not load textures:", e);
    }

    // Common Material for Floor and Walls
    // Highly metallic, low roughness for wet look
    const metalMaterial = new StandardMaterial({
      color: new Color(0.1, 0.25, 0.25), // Dark teal base
      metallic: 0.8,
      roughness: 0.15,
      diffuseMap: texture,
      normalMap: normalTexture,
    });

    // 1. Floor
    const floor = new Object3D("Floor").setPosition(0, 0, 0);
    floor.geometry = new Plane({ width: 20, depth: 40 }).getGeometryData();
    floor.material = metalMaterial;
    this.scene.add(floor);

    // 2. Ceiling
    const ceiling = new Object3D("Ceiling").setPosition(0, 6, 0);
    ceiling.geometry = new Plane({ width: 20, depth: 40 }).getGeometryData();
    ceiling.rotation.x = Math.PI; // Face downwards
    ceiling.material = metalMaterial;
    this.scene.add(ceiling);

    // 3. Walls (Left & Right)
    const leftWall = new Object3D("LeftWall").setPosition(-10, 3, 0).setScale(1, 6, 40);
    leftWall.geometry = new Cube({ size: 1 }).getGeometryData();
    leftWall.material = metalMaterial;
    this.scene.add(leftWall);

    const rightWall = new Object3D("RightWall").setPosition(10, 3, 0).setScale(1, 6, 40);
    rightWall.geometry = new Cube({ size: 1 }).getGeometryData();
    rightWall.material = metalMaterial;
    this.scene.add(rightWall);

    // 4. Lighting: Deep Sea Ambient
    this.scene.add(new AmbientLight({ color: new Color(0.0, 0.1, 0.15), intensity: 0.3 }));

    // 5. Lighting: Moon/Ocean rays coming from above/side
    const oceanLight = new DirectionalLight({ color: new Color(0.1, 0.5, 0.4), intensity: 0.5 });
    oceanLight.direction.set(1, -1, 0);
    this.scene.add(oceanLight);

    // 6. Lighting: Flickering orange neon/broken lamp
    this._flickerLight = new PointLight({ color: new Color(1.0, 0.6, 0.0), intensity: 2.0 });
    this._flickerLight.position.set(0, 5, -5);
    this.scene.add(this._flickerLight);

    // 7. Camera & Controls (FPS)
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 2, 10);
    this.camera.target.set(0, 2, 0);
    this.camera.updateViewMatrix();

    // Add WASD/Mouse controller
    this.controllers.push(new FPSController(this.camera, { moveSpeed: 5.0 }));
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;

    // Flickering logic: using Math.random combined with sine wave for an irregular pattern
    const flicker = Math.abs(Math.sin(this._time * 10)) * (Math.random() > 0.8 ? 0.2 : 1.0);
    this._flickerLight.intensity = 2.0 * flicker;

    this.scene.update();
  }
}

// === START THE ENGINE ===
const app: AbyssalDecoExample = new AbyssalDecoExample();
app
  .start()
  .then((): void => {
    console.log("AbyssalDeco Example running");
  })
  .catch((err: Error): void => {
    console.error("Error while starting the engine: ", err);
  });
