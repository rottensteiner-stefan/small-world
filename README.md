# Small World Engine

**Small World** ist eine leichtgewichtige, modulare 3D-Game-Engine für den Browser, entwickelt in TypeScript. Sie bietet eine einfache API, um 3D-Szenen, Kameras, Lichter und Geometrien zu verwalten und darzustellen.

## 🚀 Features

- **Rendering:** Leistungsstarker Renderer (WebGPU-Support vorbereitet) mit Support für Skyboxen und Post-Processing.
- **Szenen-Management:** Einfacher Szenen-Graph mit `Object3D`-Hierarchien.
- **Materialien & Licht:** Unterstützung für Standard-Materialien (Phong, Lambert, Wireframe) und diverse Lichtquellen (Ambient, Directional, Point, Spot, Area).
- **Geometrie:** Integrierte Primitive (Würfel, Kugel, Pyramide, Torus, etc.) und Terrain-Generierung.
- **Loader:** Eingebaute Loader für OBJ-Modelle, Texturen und Shader.
- **Mathematik:** Eigene Implementierung für Vektoren (`Vector3D`) und Matrizen (`Matrix4`).

## 📦 Installation

Das Projekt kann über NPM installiert werden:

```bash
npm install smallworld-engine
```

## 🎮 Verwendung

Die Engine wird über die Klasse `SmallWorld` initialisiert. Sie benötigt eine Konfiguration (meist eine JSON-Datei), die den Canvas und Render-Einstellungen definiert.

### 1. Konfiguration (`world-config.json`)

```json
{
  "canvasId": "render-canvas",
  "rendererType": "webgpu",
  "skyColor": "#202020",
  "debug": true,
  "showHUD": true
}
```

### 2. Code-Beispiel

```typescript
import { SmallWorld, Scene, Cube, Vector3D } from "smallworld-engine";

// 1. Engine Instanz erzeugen
const engine = new SmallWorld();

async function main() {
  // 2. Initialisieren
  await engine.init("./world-config.json");

  // 3. Zugriff auf die aktive Szene (wird vom Renderer verwaltet oder manuell erstellt)
  // Hinweis: Die genaue Szenen-API hängt von der Implementierung in deiner 'main' ab.

  console.log("Small World Engine gestartet!");
}

main();
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

- `src/core`: Kernklassen (Engine, Renderer-Interface, Events).
- `src/geometry`: Geometrische Formen (Mesh-Daten).
- `src/materials`: Shader-Konfigurationen und Material-Eigenschaften.
- `src/math`: Mathematische Hilfsfunktionen.
- `src/loaders`: Import-Logik für Assets.
