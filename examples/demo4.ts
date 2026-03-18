import {
  AmbientLight,
  CameraStrategyType,
  Color,
  DirectionalLight,
  HeightmapGenerator,
  Input,
  Keys,
  Object3D,
  ObjLoader,
  PerspectiveProjection,
  ProjectionType,
  Terrain,
  TerrainMaterial,
  Texture,
  TextureGenerator,
  Vector3D,
} from "../src/index.js";
import { AbstractDemo } from "./AbstractDemo.js";

const CAR_SPEED = 10.0; // Geschwindigkeit des Autos

export class Demo4 extends AbstractDemo {
  private targetPos = new Vector3D(0, 0, 0);
  private _car: Object3D | null = null; // Das Auto-Objekt

  protected async setupScene(): Promise<void> {
    Input.init();

    this.canvas.addEventListener("click", () => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });

    if (this.camera.projection.type === ProjectionType.PERSPECTIVE) {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection((75 * Math.PI) / 180, aspect, 0.1, 1000);
      this.camera.updateProjectionMatrix();
    }

    this.camera.setStrategy(CameraStrategyType.SMOOTH);
    this.camera.position.set(0, 5, 15);

    const ambientLight = new AmbientLight(Color.WHITE, 0.3);
    this.scene.add(ambientLight);

    const sun = new DirectionalLight(Color.WHITE, 0.8);
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);

    // ---------------------------------------------------------
    // TERRAIN (Der Sweet-Spot)
    // ---------------------------------------------------------
    console.log("[Demo 4] Generiere Terrain...");

    // 0.55 für eine organische, aber nicht zu gezackte Landschaft
    const heightmap = await HeightmapGenerator.generateDiamondSquare(7, 0.55);

    // 4-fache Fläche (80x80) und eine moderate Höhe von 6.0
    // (Schwankt zwischen Y = -3.0 und Y = +3.0)
    const terrainGeo = new Terrain(heightmap, 80, 80, 6.0, 128, 128);

    const terrainMat = new TerrainMaterial();
    terrainMat.sandMap = Texture.fromImage(await TextureGenerator.createSand());
    terrainMat.grassMap = Texture.fromImage(await TextureGenerator.createGrass());
    terrainMat.rockMap = Texture.fromImage(await TextureGenerator.createRock());
    terrainMat.snowMap = Texture.fromImage(await TextureGenerator.createSnow());

    terrainMat.texRepeat = [25, 25];

    // Biome an die Höhe anpassen
    terrainMat.thresholds = [-2.0, 0.0, 2.0, 1.0];

    const terrainObj = new Object3D("Boden");
    terrainObj.geometry = terrainGeo.getGeometryData();
    terrainObj.material = terrainMat;

    // Leicht absenken, damit das Auto schön mittig auf der Wiese steht
    terrainObj.position.set(0, -1.0, 0);
    this.scene.add(terrainObj);

    // ---------------------------------------------------------
    // OBJ LADEN
    // ---------------------------------------------------------
    const loader = new ObjLoader();
    loader.setBasePath("/resources/models/");

    try {
      const model = await loader.load("vehicle-racer.obj");
      const carScale = 5;
      model.scale.set(carScale, carScale, carScale);
      model.position.set(0, 0.0, 0);

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

    this.camera.update(this.targetPos, dx, dy);

    // --- WASD Steuerung ---
    if (this._car) {
      if (Input.isPressed(Keys.W)) {
        // Die Vorwärtsrichtung des Autos ist typischerweise die negative Z-Achse im lokalen Raum.
        // Diese muss mit der Weltmatrix des Autos transformiert werden, um die Weltrichtung zu erhalten.
        const forward = new Vector3D(0, 0, -1); // Lokale Vorwärtsrichtung
        forward.transformDirection(this._car.worldMatrix); // In Weltkoordinaten transformieren
        forward.normalize(); // Sicherstellen, dass es ein Einheitsvektor ist

        // Position des Autos aktualisieren
        this._car.position.add(forward.multiplyScalar(CAR_SPEED * deltaTime));
      }
    }
  }

  protected getDebugInfo(): Record<string, string | number> {
    const baseInfo = super.getDebugInfo();
    return {
      ...baseInfo,
      Demo: "04 - Terrain & Auto",
      "Objekte in Szene": this.scene.objects.length,
      "Auto Position": this._car ? this._car.position.toString() : "N/A",
    };
  }
}

const app = new Demo4();
app.start().catch((err: Error) => {
  console.error("Fehler beim Starten:", err);
});
