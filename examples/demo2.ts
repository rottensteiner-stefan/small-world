/// examples/demo2.ts

import {
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  Input,
  Keys,
  Object3D,
  PerspectiveProjection,
  PhongMaterial,
  Plane,
  ProjectionType,
  Vector3D,
  WireframeMaterial,
} from "../src/index.js";
import { AbstractDemo } from "./AbstractDemo.js";

/**
 * Demo 2: Interaktive Kamera (FPS-Style) und Keyboard-Input.
 * Zeigt, wie man die Kamera mit Maus und Tastatur bewegt.
 */
export class Demo2 extends AbstractDemo {
  private _targetPos: Vector3D = new Vector3D(0, 2, 0);
  private _moveSpeed: number = 10.0;

  /** @inheritdoc */
  protected async setupScene(): Promise<void> {
    console.log("=== LEVEL 2: SETUP GESTARTET ===");

    // 1. Eingabe initialisieren (Keyboard & Mouse)
    Input.init();

    // Event-Listener direkt ans Canvas hängen, um PointerLock (Maus einfangen) zu aktivieren
    this.canvas.addEventListener("click", () => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });

    // 2. Kamera konfigurieren (FPS Modus)
    if (this.camera.projection.type === ProjectionType.PERSPECTIVE) {
      const aspect: number = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (75 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }
    // Wir wechseln auf die First-Person-Strategy
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 2, 0); // Startposition

    // 3. Licht hinzufügen
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Einen großen Boden erstellen (Plane)
    const floor: Object3D = new Object3D("Floor");
    floor.geometry = new Plane({
      width: 50,
      depth: 50,
      widthSegments: 10,
      depthSegments: 10,
    }).getGeometryData();

    // Wir nutzen ein Wireframe-Material, damit man die Bewegung besser spürt
    const floorMat: WireframeMaterial = new WireframeMaterial();
    floorMat.color = Color.DARKSLATEGRAY;
    floor.material = floorMat;

    // Die Plane wird standardmäßig XY-ausgerichtet erstellt (stehend).
    // Wir kippen sie um 90 Grad auf der X-Achse, damit sie liegt.
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // 5. Ein paar Hindernisse (Würfel) verteilen
    const boxMat: PhongMaterial = new PhongMaterial({
      color: Color.RED,
      shininess: 30,
    });

    for (let i: number = 0; i < 20; i++) {
      const box: Object3D = new Object3D(`Box_${i}`);
      box.geometry = new Cube({ size: Math.random() * 2 + 1 }).getGeometryData();
      box.material = boxMat;

      // Zufällige Position auf dem Boden
      const px: number = (Math.random() - 0.5) * 40;
      const pz: number = (Math.random() - 0.5) * 40;
      box.position.set(px, 1, pz);

      // Zufällige Rotation
      box.rotation.y = Math.random() * Math.PI;

      this.scene.add(box);
    }

    console.log("=== LEVEL 2: SETUP ABGESCHLOSSEN ===");
    console.log("Steuerung: W,A,S,D zum Bewegen. Klicken für Kamera-Rotation (PointerLock).");
  }

  /**
   * Wird aufgerufen, wenn das Canvas-Element (z.B. wegen Renderer-Wechsel) neu erstellt wurde.
   */
  protected override onCanvasRecreated(): void {
    // Da wir das Canvas neu erstellt haben, müssen wir den Click-Listener wieder anhängen!
    this.canvas.addEventListener("click", () => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });
    console.log("[Demo2] Canvas neu erstellt, Click-Listener wiederhergestellt.");
  }

  /** @inheritdoc */
  protected update(deltaTime: number): void {
    // 1. Maus-Deltas abfragen (nur wenn Pointer gelockt ist)
    const dx: number = Input.isPointerLocked ? Input.mouse.dx : 0;
    const dy: number = Input.isPointerLocked ? Input.mouse.dy : 0;

    // Deltas zurücksetzen, damit sie im nächsten Frame nicht nochmal angewandt werden
    Input.mouse.dx = 0;
    Input.mouse.dy = 0;

    // 2. Keyboard-Input für Bewegung (W,A,S,D)
    // Wir ermitteln die Achsen: -1, 0, oder 1
    const moveZ: number = Input.getAxis(Keys.W, Keys.S); // Vor / Zurück
    const moveX: number = Input.getAxis(Keys.A, Keys.D); // Links / Rechts

    // 3. Bewegungsrichtung relativ zur Kamera-Rotation berechnen
    // Die Kamera rotiert um die Y-Achse (theta).
    if (0 !== moveZ || 0 !== moveX) {
      const sin: number = Math.sin(this.camera.theta);
      const cos: number = Math.cos(this.camera.theta);

      // Richtungsvektor drehen (2D Rotation Matrix)
      const dirX: number = moveX * cos + moveZ * sin;
      const dirZ: number = -moveX * sin + moveZ * cos;

      // Position aktualisieren
      this._targetPos.x += dirX * this._moveSpeed * deltaTime;
      this._targetPos.z += dirZ * this._moveSpeed * deltaTime;
    }

    // 4. Kamera-Update aufrufen
    // Die Kamera-Strategie (FPS) kümmert sich intern darum,
    // wie die Rotation (dx, dy) auf die Target-Position angewandt wird.
    this.camera.update(this._targetPos, dx, dy, deltaTime);
  }

  /** @inheritdoc */
  protected override getDebugInfo(): Record<string, string | number> {
    const base: Record<string, string | number> = super.getDebugInfo();
    return {
      ...base,
      Demo: "02 - FPS Kamera",
      PointerLocked: Input.isPointerLocked ? "Ja" : "Nein",
    };
  }
}

// === START DES PROGRAMMS ===
const app: Demo2 = new Demo2();
app
  .start()
  .then(() => {
    console.log("Level 2 gestartet!");
  })
  .catch((err: Error) => {
    console.error("Fehler beim Starten von Level 2:", err);
  });
