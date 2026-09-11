# Modulares Ökosystem & Domänen-Schichtung

Gemäß **ADR 0014** folgt Small World einer strikten 4-Schichten-Domänenarchitektur statt generischer Sammel-Ordner.

## Domänenstruktur

1. **Ebene 1 — Kern-Engine (`src/core/`, `src/renderers/`, `src/geometry/`, `src/math/`):**
   Mathematik, Szenengraph, Kameras, Renderer, Passes, Shader und Kern-Primitive (inklusive `BillboardInstancer` und `ImposterBaker`).
2. **Ebene 2 — Umgebung & Atmosphäre (`src/environment/`):**
   Wetter, atmosphärische Partikelsysteme (`WeatherEmitter`), Himmelssysteme und Flüssigkeitsoberflächen.
3. **Ebene 3 — Behaviors & Simulation (`src/core/behaviors/`):**
   Controller, Sensoren, Animationsschleifen und ambientes Kreaturenleben (`RatGroomingBehavior`, `GroomingRat`).
4. **Ebene 4 — Werkzeuge & ProcGen (`src/tools/`, `src/tools/procgen/`):**
   Autoring-Werkzeuge (`MakerApp`, `MapGenerator`, `Pixler`, `Xtractor`, `Forge`) und prozedurale Level-Generatoren (`GridLevelBuilder`).

## Beispiel: Prozedurale Raster-Generierung (`GridLevelBuilder`)

`GridLevelBuilder` liegt in `src/tools/procgen/` (exportiert über die `small-world`-Tooling-Oberfläche) und erlaubt es, 3D-Level aus ASCII-Rastern zu definieren.

### Verwendung

```typescript
import { GridLevelBuilder, GridLevelConfig, Object3D } from "small-world";

const builder = new GridLevelBuilder();

// Die Legende definieren, die ASCII-Zeichen auf Meshes oder Logik abbildet
const config: GridLevelConfig = {
  gridSize: 2.0,
  legend: {
    "#": {
      type: "custom",
      onBuild: (x, y, worldX, worldZ) => {
        const wall = new Object3D(`Wall_${x}_${y}`);
        // Geometrie, Materialien hinzufügen...
        wall.position.set(worldX, 1.0, worldZ);
        return wall; // Zurückgegebenes Objekt wird automatisch zur Szene hinzugefügt
      },
    },
    "P": {
      type: "custom",
      onBuild: (x, y, worldX, worldZ) => {
        this.camera.position.set(worldX, 1.0, worldZ);
        return undefined; // Wir fügen kein Objekt hinzu, wir bewegen nur die Kamera
      },
    },
  },
};

// Die Karte als einzelnen, zeilenumbruch-getrennten String definieren
const myMap = ["#######", "#P    #", "#######"].join("\n");

// Die Karte bauen (async — löst zur Weltposition des ersten "P"-Spawns auf, oder zur Kartenmitte)
await builder.build(this.scene, myMap, config);
```
