/// examples/demo1.ts

import {
  Color,
  Cube,
  DirectionalLight,
  Object3D,
  PerspectiveProjection,
  PhongMaterial,
  ProjectionType,
} from "../src/index.js";
import { AbstractDemo } from "./AbstractDemo.js";

class Demo1 extends AbstractDemo {
  private _myCube!: Object3D;

  protected override async setupScene(): Promise<void> {
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect: number = window.innerWidth / window.innerHeight;
      // Convert 75 degrees to radians: 75 * (Math.PI / 180) = approx. 1.309
      this.camera.projection = new PerspectiveProjection({
        fov: (75 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }

    // 1. Light: A gentle sun
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);

    // 2. Object: A single cube
    this._myCube = new Object3D("RotatingCube");
    this._myCube.geometry = new Cube({ size: 2 }).getGeometryData();

    // 3. Material: Glowing blue
    this._myCube.material = new PhongMaterial({
      color: Color.DODGERBLUE,
      shininess: 60,
    });
    this.scene.add(this._myCube);

    // 4. Position camera rigidly (looks at 0,0,0 by default)
    this.camera.position.set(0, 3, 6);
  }

  protected override update(deltaTime: number): void {
    // Rotate the cube around all axes every frame
    this._myCube.rotation.x += 1.0 * deltaTime;
    this._myCube.rotation.y += 1.5 * deltaTime;

    // We have completely removed the call to this.scene.update() here!
  }
}

// === START THE ENGINE ===
const app: Demo1 = new Demo1();
app
  .start()
  .then((): void => {
    console.log("Engine running");
  })
  .catch((err: Error): void => {
    console.error("Error while starting the engine: ", err);
  });
