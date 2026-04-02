/// examples/demo3.ts
import {
  AmbientLight,
  CameraStrategyType,
  Color,
  DirectionalLight,
  Grid,
  Input,
  Object3D,
  ObjLoader,
  PerspectiveProjection,
  ProjectionType,
  Vector3D,
  WireframeMaterial,
} from "../src/index.js";
import { AbstractDemo } from "./AbstractDemo.js";

class Demo3 extends AbstractDemo {
  // Der Punkt, um den sich die Kamera dreht (Zentrum des Modells)
  private _targetPos = new Vector3D();

  protected async setupScene(): Promise<void> {
    this.canvas.addEventListener("click", () => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });

    if (this.camera.projection.type === ProjectionType.PERSPECTIVE) {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (75 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }

    this.camera.setStrategy(CameraStrategyType.SMOOTH);
    this.camera.position.set(0, 5, 15);

    // Licht-Setup: Ambient für weiche Schatten, Directional für Highlights
    const ambientLight = new AmbientLight({ color: Color.WHITE, intensity: 0.3 });
    this.scene.add(ambientLight);

    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);

    const gridObj = new Object3D("Boden");
    gridObj.geometry = new Grid({ size: 20, divisions: 20 }).getGeometryData();
    const gridMat = new WireframeMaterial();
    gridMat.color = Color.DARKSLATEGRAY;

    gridObj.material = gridMat;
    this.scene.add(gridObj);

    const loader = new ObjLoader();
    loader.setBasePath("/resources/models/");

    try {
      const model = await loader.load("vehicle-racer.obj");
      const carScale = 5;
      model.scale.set(carScale, carScale, carScale);
      model.position.set(0, 0.0, 0);

      this.scene.add(model);
    } catch (error) {
      console.error("[Demo 3] Fehler beim Laden des Modells:", error);
    }
  }

  protected update(_deltaTime: number): void {
    let dx = 0;
    let dy = 0;

    // Mausbewegung auslesen, wenn der Pointer gesperrt ist
    if (Input.isPointerLocked) {
      dx = Input.mouse.dx;
      dy = Input.mouse.dy;
    }

    // Deltas sofort zurücksetzen
    Input.mouse.dx = 0;
    Input.mouse.dy = 0;

    // Kamera-Orbit aktualisieren
    this.camera.update(this._targetPos, dx, dy);
  }
}

// === START DES PROGRAMMS ===
const app = new Demo3();
app
  .start()
  .then(() => {
    console.log("Engine läuft!");
  })
  .catch((err: Error) => {
    console.error("Fehler beim Starten der Engine:", err);
  });
