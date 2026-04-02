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

  protected async setupScene(): Promise<void> {
    if (this.camera.projection.type === ProjectionType.PERSPECTIVE) {
      const aspect = window.innerWidth / window.innerHeight;
      // 75 Grad in Radianten umrechnen: 75 * (Math.PI / 180) = ca. 1.309
      this.camera.projection = new PerspectiveProjection({
        fov: (75 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }

    // 1. Licht: Eine sanfte Sonne
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);

    // 2. Objekt: Ein einzelner Würfel
    this._myCube = new Object3D("RotatingCube");
    this._myCube.geometry = new Cube({ size: 2 }).getGeometryData();

    // 3. Material: Leuchtendes Blau
    this._myCube.material = new PhongMaterial({
      color: Color.DODGERBLUE,
      shininess: 60,
    });
    this.scene.add(this._myCube);

    // 4. Kamera starr positionieren (schaut standardmäßig auf 0,0,0)
    this.camera.position.set(0, 3, 6);
  }

  protected update(deltaTime: number): void {
    // Den Würfel jeden Frame um alle Achsen drehen lassen
    this._myCube.rotation.x += 1.0 * deltaTime;
    this._myCube.rotation.y += 1.5 * deltaTime;

    // Den Aufruf von this.scene.update() haben wir hier komplett gelöscht!
  }
}

// === START DES PROGRAMMS ===
const app = new Demo1();
app
  .start()
  .then(() => {
    console.log("Engine läuft! Aktiver Renderer: " + app.config.rendererType);
  })
  .catch((err: Error) => {
    console.error("Fehler beim Starten der Engine:", err);
  });
