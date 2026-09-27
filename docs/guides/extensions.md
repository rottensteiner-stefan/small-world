# Modulares Ökosystem & Domänen-Schichtung

Gemäß **ADR 0014** folgt Small World einer strikten 4-Schichten-Domänenarchitektur statt generischer Sammel-Ordner.

## Paket-Landschaft

Seit der npm-Workspaces-Restrukturierung lebt die Engine in einem einzigen Paket (`@small-world/engine`, `packages/engine/`), und optionaler, domänenspezifischer Code wird in **separate Ökosystem-Pakete** ausgelagert, die ausschließlich von `@small-world/engine` abhängen — nie umgekehrt. Dadurch bleibt der Kern schlank und Dritt-Entwickler können eigene Pakete nach demselben Muster beisteuern.

| Paket | Verzeichnis | Zweck |
| --- | --- | --- |
| `@small-world/gltf-extensions` | `packages/gltf-extensions/` | Datenebenen-gltF-Extensions (Draco, BasisU/KTX2) — siehe ADR 0017/0018 |
| `@small-world/geometry-extras` | `packages/geometry-extras/` | Exotische & prozedurale Geometrien (Supershapes, Torus-Knoten, Lathe, Platonische Körper, parametrische Flächen, gefüllte Polygone, Voronoi-Zellen, Marching Cubes) außerhalb des Kern-Primitiven-Katalogs |
| `@small-world/physics-extras` | `packages/physics-extras/` | Höherstufige Physik-Bausteine (z.B. Voronoi-Frakturen mit `ConvexHull`-Kollidern) |
| `@small-world/tools` | `packages/tools/` | Entwicklungswerkzeuge (Maker, Material Studio, Pixler, Xtractor, Map Generator, Forge) — siehe [ADR 0024](/adr/0024-tools-ecosystem-package) |

Jedes Extras-Paket extended zentrale öffentliche Verträge der Engine (`AbstractGeometry`, `GltfExtensionPlugin`, ...) und ist eigenständig testbar — dasselbe Erweiterungsprinzip, das ADR 0018 für die gltf-Datenebene und ADR 0021 für Geometrie/Physik festlegen.

## Domänenstruktur

1. **Ebene 1 — Kern-Engine (`packages/engine/src/core/`, `packages/engine/src/renderers/`, `packages/engine/src/geometry/`, `packages/engine/src/math/`):**
   Mathematik, Szenengraph, Kameras, Renderer, Passes, Shader und Kern-Primitive (inklusive `BillboardInstancer` und `ImposterBaker`).
2. **Ebene 2 — Umgebung & Atmosphäre (`packages/engine/src/environment/`):**
   Wetter, atmosphärische Partikelsysteme (`WeatherEmitter`), Himmelssysteme und Flüssigkeitsoberflächen.
3. **Ebene 3 — Behaviors & Simulation (`packages/engine/src/core/behaviors/`, `packages/engine/src/behaviors/`):**
   Controller, Sensoren, Animationsschleifen und ambientes Kreaturenleben (`RatGroomingBehavior`, `GroomingRat`).
4. **Ebene 4 — ProcGen & Werkzeug-Erweiterungspunkt (`packages/engine/src/tools/procgen/`, `packages/engine/src/tools/forge/ForgeTool.ts`):**
   Prozedurale Level-Generatoren (`GridLevelBuilder`) und die `ForgeTool`-Schnittstelle. Die konkreten Autoring-Werkzeuge selbst (`MakerApp`, `MapGenerator`, `Pixler`, `Xtractor`, `Forge`) leben seit [ADR 0024](/adr/0024-tools-ecosystem-package) im eigenen Paket `@small-world/tools`, nicht mehr im Kern.

## Beispiel: Prozedurale Raster-Generierung (`GridLevelBuilder`)

`GridLevelBuilder` liegt in `packages/engine/src/tools/procgen/` (exportiert über die `@small-world/engine`-Tooling-Oberfläche, ein echtes Laufzeit-Feature statt eines Entwicklungswerkzeugs) und erlaubt es, 3D-Level aus ASCII-Rastern zu definieren.

### Verwendung

```typescript
import { GridLevelBuilder, GridLevelConfig, Object3D } from "@small-world/engine";

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
