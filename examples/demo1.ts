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
    console.log("=== LEVEL 1: SETUP GESTARTET ===");

    // --- DEBUG AUSGABEN ---
    console.log(`[DEBUG] Aktiver Renderer: ${this.config.renderer}`);
    console.log(`[DEBUG] Projektions-Typ: ${this.config.projection}`);
    console.log(`[DEBUG] Aktive Kamera-Strategie: ${this.camera.activeStrategyType}`);

    // FIX 1: FOV Bug in der Application überschreiben (Radianten statt Grad)
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
      console.log("[DEBUG] FOV (Sichtfeld) auf 75 Grad (Radianten) korrigiert.");
    }

    // 1. Licht: Eine sanfte Sonne
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);
    console.log("[DEBUG] Sonne hinzugefügt.");

    // 2. Objekt: Ein einzelner Würfel
    this._myCube = new Object3D("RotatingCube");
    this._myCube.geometry = new Cube(2).getGeometryData();

    // 3. Material: Leuchtendes Blau
    this._myCube.material = new PhongMaterial({
      color: Color.DODGERBLUE,
      shininess: 60,
    });

    this.scene.add(this._myCube);
    console.log("[DEBUG] Würfel generiert und der Szene hinzugefügt.");

    // 4. Kamera starr positionieren (schaut standardmäßig auf 0,0,0)
    this.camera.position.set(0, 3, 6);
    console.log(
      `[DEBUG] Kamera positioniert auf: X:${this.camera.position.x}, Y:${this.camera.position.y}, Z:${this.camera.position.z}`,
    );

    console.log("=== LEVEL 1: SETUP ABGESCHLOSSEN ===");
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
    console.log("Engine läuft!");
  })
  .catch((err: Error) => {
    console.error("Fehler beim Starten der Engine:", err);
  });
