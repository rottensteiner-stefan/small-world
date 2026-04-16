/// examples/example7.ts

import {
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  CubeTexture,
  DirectionalLight,
  Input,
  Keys,
  MathUtils,
  Object3D,
  PerspectiveProjection,
  PhongMaterial,
  Plane,
  SkyboxMaterial,
  FPSController,
} from "../src/index.js";
import { AbstractExample } from "../src/core/example/AbstractExample.js";

/**
 * Example 7: Clean rebuild with Skybox, Green Floor, WASD/QE movement.
 */
export class Example7 extends AbstractExample {
  private _moveSpeed: number = 15.0;
  private _eyeHeight: number = 2.0;

  protected override onCanvasRecreated(): void {
    super.onCanvasRecreated();
    this.canvas.addEventListener("click", (): void => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });
  }

  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // 1. Camera
    const aspect: number = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect,
      near: 0.1,
      far: 2000, // Make sure far plane is large enough for the skybox
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, this._eyeHeight, 0);

    this.controllers.push(
      new FPSController(this.camera, {
        moveSpeed: this._moveSpeed,
        enableZoom: true,
      }),
    );

    // 2. Lighting
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.5 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 3. Skybox
    const skyTexture = new CubeTexture();
    await skyTexture.loadFrom("/resources/models/textures/skybox-1.jpg");

    const skybox = new Object3D("Skybox");
    skybox.geometry = new Cube({ size: 1000 }).getGeometryData();
    skybox.material = new SkyboxMaterial({ cubeMap: skyTexture });
    skybox.frustumCulled = false;
    this.scene.add(skybox);

    // 4. Floor
    const floor = new Object3D("Floor");
    // Der Boden muss nicht gigantisch sein, solange er immer mit der Kamera wandert.
    // Er muss nur den Bereich bis zur Clipping-Ebene abdecken.
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

    // 5. Orientierungspunkte (Illusion Breaker)
    const referenceCube = new Object3D("ReferenceCube");
    referenceCube.geometry = new Cube({ size: 2 }).getGeometryData();
    referenceCube.material = new PhongMaterial({ color: Color.BLUE, shininess: 50 });
    referenceCube.position.set(0, 1, -10); // Genau vor unserer Startposition
    this.scene.add(referenceCube);

    const redCube = new Object3D("RedCube");
    redCube.geometry = new Cube({ size: 2 }).getGeometryData();
    redCube.material = new PhongMaterial({ color: Color.RED, shininess: 50 });
    redCube.position.set(10, 1, 0); // Rechts von uns
    this.scene.add(redCube);
  }

  protected override update(deltaTime: number): void {
    // The FPSController handles Mouse Look, WASD movement and Zoom.

    // 4. Collision / Floor Clamp
    this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);

    // 5. Update Skybox & Floor Position
    // Die Skybox muss immer exakt auf der Kamera liegen.
    const skybox = this.scene.objects.find((o) => o.name === "Skybox");
    if (skybox) {
      skybox.position.copyFrom(this.camera.position);
    }

    // Auch der Boden muss der Kamera folgen (auf der X- und Z-Achse),
    // da er sonst "aufhört", wenn man zu weit läuft!
    const floor = this.scene.objects.find((o) => o.name === "Floor");
    if (floor) {
      floor.position.x = this.camera.position.x;
      floor.position.z = this.camera.position.z;
    }
  }

  protected override getDebugInfo(): Record<string, string | number> {
    const base = super.getDebugInfo();
    return {
      ...base,
      Example: "07 - Illusion Breaker",
      "Pointer Locked": Input.isPointerLocked ? "Yes" : "No",
      "Cam X": this.camera.position.x.toFixed(2),
      "Cam Y": this.camera.position.y.toFixed(2),
      "Cam Z": this.camera.position.z.toFixed(2),
    };
  }
}

const app = new Example7();
app
  .start()
  .then((): void => {
    console.log("Example 7 running");
  })
  .catch((err: Error): void => {
    console.error("Error starting engine:", err);
  });
