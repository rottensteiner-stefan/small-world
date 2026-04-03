import {
  AmbientLight,
  CameraStrategyType,
  Color,
  DirectionalLight,
  Input,
  Keys,
  Object3D,
  ObjLoader,
  PerspectiveProjection,
  ProjectionType,
  TerrainManager,
  TerrainMaterial,
  Texture,
  TextureGenerator,
  Vector3D,
} from "../src/index.js";
import { AbstractDemo } from "./AbstractDemo.js";

const CAR_SPEED = 10.0; // Geschwindigkeit des Autos

export class Demo4 extends AbstractDemo {
  private _targetPos = new Vector3D(0, 0, 0);
  private _car: Object3D | null = null; // Das Auto-Objekt
  private _terrainManager: TerrainManager | null = null;

  protected async setupScene(): Promise<void> {
    this.canvas.addEventListener("click", () => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });

    if (this.camera.projection.type === ProjectionType.PERSPECTIVE) {
      const aspect = window.innerWidth / window.innerHeight;
      // Korrektur: 75 Grad in Radianten umrechnen
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

    const ambientLight = new AmbientLight({ color: Color.WHITE, intensity: 0.3 });
    this.scene.add(ambientLight);

    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);

    // Terrain-Material vorbereiten
    const terrainMat = new TerrainMaterial({
      sandMap: Texture.fromImage(await TextureGenerator.createSand()),
      grassMap: Texture.fromImage(await TextureGenerator.createGrass()),
      rockMap: Texture.fromImage(await TextureGenerator.createRock()),
      snowMap: Texture.fromImage(await TextureGenerator.createSnow()),
    });

    // Konfiguration für Infinite Terrain
    this._terrainManager = new TerrainManager(this.scene, {
      chunkSize: 80,
      meshSegments: 64,
      heightmapDetail: 7, // 128x128
      heightmapRoughness: 0.55,
      maxHeight: 6.0,
      gridSize: 3, // 3x3 Chunks aktiv
      material: terrainMat,
    });

    await this._terrainManager.init();

    const loader = new ObjLoader();
    loader.setBasePath("/resources/models/");

    try {
      const model = await loader.load("vehicle-racer.obj");
      const carScale = 5;
      model.scale.set(carScale, carScale, carScale);
      // Position leicht über 0, da das Terrain um 0 schwankt
      model.position.set(0, 2.0, 0);

      this.scene.add(model);
      this._car = model; // Auto-Objekt speichern
    } catch (error) {
      console.error("[Demo 4] Fehler beim Laden:", error);
    }
  }

  protected update(deltaTime: number): void {
    if (Input.isPressed(Keys.I)) {
      this.printDebug();
    }

    const dx = Input.isPointerLocked ? Input.mouse.dx : 0;
    const dy = Input.isPointerLocked ? Input.mouse.dy : 0;

    Input.mouse.dx = 0;
    Input.mouse.dy = 0;

    this.camera.update(this._targetPos, dx, dy);

    // --- WASD Steuerung ---
    if (this._car) {
      if (Input.isPressed(Keys.W)) {
        // Die Vorwärtsrichtung des Autos ist typischerweise die negative Z-Achse im lokalen Raum.
        // Diese muss mit der Weltmatrix des Autos transformiert werden, um die Weltrichtung zu erhalten.
        const forward = new Vector3D(0, 0, -1); // Lokale Vorwärtsrichtung
        forward.transformDirection(this._car.worldMatrix); // In Weltkoordinaten transformieren
        forward.normalize(); // Sicherstellen, dass es ein Einheitsvektor ist

        // Position des Autos aktualisieren (Forward wird hier in-place skaliert, was okay ist)
        this._car.position.add(forward.scale(CAR_SPEED * deltaTime));
      }

      // Terrain-Update basierend auf Auto-Position
      if (this._terrainManager) {
        this._terrainManager.update(this._car.position);
      }

      // Kamera folgt dem Auto
      // Einfache Verfolgung: Wir setzen das Kamera-Target auf das Auto
      this._targetPos.copyFrom(this._car.position);
      // Optional: Kamera-Position sanft nachziehen, aber das macht der CameraStrategyType.SMOOTH schon relativ gut,
      // wenn wir _targetPos aktualisieren.
    }
  }

  protected override getDebugInfo(): Record<string, string | number> {
    const baseInfo = super.getDebugInfo();
    return {
      ...baseInfo,
      Demo: "04 - Infinite Terrain & Auto",
      "Objekte in Szene": this.scene.objects.length,
      "Auto Position": this._car
        ? `(${this._car.position.x.toFixed(1)}, ${this._car.position.y.toFixed(1)}, ${this._car.position.z.toFixed(1)})`
        : "N/A",
    };
  }
}

// === START THE ENGINE ===
const app = new Demo4();
app
  .start()
  .then(() => {
    console.log("Engine running");
  })
  .catch((err: Error) => {
    console.error("Error while starting the engine: ", err);
  });
