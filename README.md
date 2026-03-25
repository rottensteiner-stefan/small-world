# Small World Engine

**Small World** ist eine leichtgewichtige, modulare 3D-Game-Engine für den Browser, entwickelt in TypeScript. Sie bietet eine einfache API, um 3D-Szenen, Kameras, Lichter und Geometrien zu verwalten und darzustellen – mit speziellem Fokus auf eine flexible Kamera-Steuerung und 2.5D/2D-Features.

## 🚀 Features

- **Rendering:** Leistungsstarker Renderer (WebGL 1/2 und WebGPU) mit Support für Skyboxen, Sprites und Post-Processing.
- **Szenen-Management:** Strukturierter Szenen-Graph mit `Object3D`-Hierarchien.
- **Materialien & Licht:** Unterstützung für Standard-Materialien (Phong, Lambert, Wireframe, SpriteMaterial) und diverse Lichtquellen (Ambient, Directional, Point, Spot, Area).
- **Kamera-System:** Flexible Kamera-Strategien (Smooth, Stiff, Fixed, FPS, Isometric) mit optionalen Constraints (Min/Max-Grenzen).
- **2D/2.5D Support:** Integriertes Sprite-System, Billboard-Rendering und Isometrische Kamera-Perspektiven.
- **Geometrie:** Integrierte Primitive (Würfel, Kugel, Pyramide, Torus, Ebene etc.) und Terrain-Generierung.
- **Loader:** Eingebaute Loader für OBJ-Modelle, Texturen und Shader.
- **Mathematik:** Eigene Implementierung für Vektoren (`Vector3D`), Matrizen (`Matrix4`) und diverse Projektionsarten.

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
  "renderer": "webgpu",
  "projection": "perspective",
  "fullscreen": true
}
```

### 2. Code-Beispiel

```typescript
import { Application, Cube, Vector3D, Color } from "smallworld-engine";

class MyGame extends Application {
  protected async setupScene(): Promise<void> {
    // 1. Objekt erstellen
    const cube = new Cube(2);
    cube.position.set(0, 1, 0);
    
    // 2. Zur Szene hinzufügen
    this.scene.add(cube);
    
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

2.  **Dev-Server starten (mit Hot-Reload):**

    ```bash
    npm run dev
    ```

3.  **Library bauen:**
    ```bash
    npm run build:lib
    ```

## 📂 Struktur

- `src/core`: Kernklassen (Engine, Application, Kamera, Renderer-Interface).
- `src/geometry`: Geometrische Formen und Primitive.
- `src/materials`: Shader-Definitionen und Material-Eigenschaften.
- `src/math`: Mathematische Hilfsfunktionen, Vektoren und Projektionen.
- `src/loaders`: Asset-Loader (OBJ, Texturen, JSON).
- `src/renderers`: Implementierungen der WebGL/WebGPU Renderer.
- `src/physics`: Kollisionserkennung und Bounding-Volumes.
