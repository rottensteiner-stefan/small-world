# Small World Engine

**Small World** ist eine leichtgewichtige, modulare 3D-Game-Engine für den Browser, entwickelt in TypeScript. Sie bietet eine einfache API, um 3D-Szenen, Kameras, Lichter und Geometrien zu verwalten und darzustellen – mit speziellem Fokus auf eine flexible Kamera-Steuerung und 2.5D/2D-Features.

## 🚀 Features

- **Rendering:** Leistungsstarker Renderer (WebGL 1/2 und WebGPU) mit dynamischem Wechsel zur Laufzeit und Fallback-Mechanismus. Unterstützt Skyboxen, Sprites und Post-Processing.
- **Szenen-Management:** Strukturierter Szenen-Graph mit `Object3D`-Hierarchien.
- **Materialien & Licht:** Unterstützung für Standard-Materialien (Phong, Lambert, Wireframe, SpriteMaterial, TerrainMaterial) und diverse Lichtquellen (Ambient, Directional, Point, Spot, Area).
- **Kamera-System:** Flexible Kamera-Strategien (Smooth, Stiff, Fixed, FPS, Isometric) mit optionalen Constraints (Min/Max-Grenzen) und Kamera-Effekten (Shake, Flash).
- **2D/2.5D Support:** Integriertes Sprite-System, Billboard-Rendering und Isometrische Kamera-Perspektiven.
- **Geometrie:** Umfassende integrierte Primitive (Würfel, Kugel, Pyramide, Torus, Zylinder, Plane, Circle, Triangle etc.) und Terrain-Generierung via Splatmapping.
- **Farben:** Umfangreiche `Color`-Klasse mit Unterstützung für CSS/X11-Standardfarben und Konvertierungen (RGB, HEX, HSL, HSV).
- **Loader:** Eingebaute Loader für OBJ-Modelle, Texturen und Konfigurationen.
- **Eingabe:** Integriertes Input-System für Tastatur und Maus (inklusive Pointer Lock).
- **Mathematik:** Eigene Implementierung für Vektoren (`Vector3D`, `Vector2D`), Matrizen (`Matrix4`) und diverse Projektionsarten (Perspektivisch, Orthografisch, Oblique).

## 📦 Installation

Das Projekt kann über NPM installiert werden:

```bash
npm install smallworld-engine
```

## 🎮 Verwendung

Die Engine bietet eine `Application`-Basisklasse, die den Loop und die Initialisierung übernimmt.

### 1. Konfiguration (`small-world.json`)

Die Konfiguration wird standardmäßig unter `/config/small-world.json` gesucht.

```json
{
  "canvasId": "render-canvas",
  "rendererType": "WEB_GPU",
  "projection": "PERSPECTIVE",
  "fullscreen": true,
  "renderer": [
    {
      "type": "WEB_GPU",
      "attributes": {
        "antialias": true
      }
    }
  ]
}
```

### 2. Code-Beispiel

```typescript
import { Application, Cube, Vector3D, Color, PhongMaterial, Object3D } from "smallworld-engine";

class MyGame extends Application {
  protected async setupScene(): Promise<void> {
    // 1. Objekt erstellen
    const cubeObj = new Object3D("MyCube");
    cubeObj.geometry = new Cube({ size: 2 }).getGeometryData();
    cubeObj.material = new PhongMaterial({ color: Color.DODGERBLUE });
    cubeObj.position.set(0, 1, 0);

    // 2. Zur Szene hinzufügen
    this.scene.add(cubeObj);

    // 3. Kamera einstellen
    this.camera.position.set(5, 5, 5);
    this.camera.target.set(0, 0, 0);
  }

  protected update(deltaTime: number): void {
    // Spiellogik pro Frame
  }
}

// Starten
const game = new MyGame({ canvasId: "render-canvas" });
game.start();
```

## 🛠 Entwicklung

Um am Projekt selbst zu arbeiten:

1.  **Abhängigkeiten installieren:**

    ```bash
    npm install
    ```

2.  **Dev-Server starten (mit Hot-Reload für die Demos):**

    ```bash
    npm run dev
    ```

3.  **Library bauen:**
    ```bash
    npm run build:lib
    ```

## 📂 Struktur

- `src/core`: Kernklassen (Engine, Application, Object3D, Scene, Input, Color).
- `src/core/cameras`: Kameras, Projektionen, Strategien und Effekte.
- `src/geometry`: Geometrische Formen und Primitive.
- `src/core/materials`: Material-Eigenschaften.
- `src/core/lights`: Lichtquellen.
- `src/math`: Mathematische Hilfsfunktionen, Vektoren und Matrizen.
- `src/loaders`: Asset-Loader (OBJ, Texturen, Config).
- `src/renderers`: Implementierungen der WebGL1/WebGL2/WebGPU Renderer.
- `src/interfaces`: TypeScript-Schnittstellen.
- `src/enums`: Enumerationen.
- `examples`: Interaktive Demos zur Veranschaulichung der Engine-Features.
- `public`: Statische Assets wie index.html, Konfigurationen und Demo-Ressourcen.
