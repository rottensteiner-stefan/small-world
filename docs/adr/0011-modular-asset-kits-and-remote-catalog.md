# Modulare Asset-Kits & Out-of-Tree-Asset-Bibliotheks-Architektur

## Kontext & Problem

Während das Small-World-Ökosystem um reichhaltigere Diorama-Szenen, Charaktere, Animationen und 3D-Requisiten wächst (etwa die per Tripo3D generierten Industrie-Schott-Wandlampen, Holzkisten, Wellblech-Ölfässer, polygonalen Schutthaufen und humanoiden Biped-Rigs), wächst das Volumen binärer Assets rasant.

Große Binär-Assets (`.glb`-Modelle, 2K/4K-PBR-Texturkarten, Skelett-Bewegungsclips, Audio) direkt in das Git-Repository des Kern-Engines einzuchecken, verursacht grundlegende Probleme:
1. **Repository-Aufblähung:** Git verfolgt binäre Delta-Historien ineffizient. Die Größe des `.git`-Repositorys wächst monoton und verlangsamt `git clone`, CI-Builds und `npm install` für Entwickler, die nur die TypeScript-Rendering-/Mathe-Laufzeit benötigen.
2. **Kopplung von Engine & Inhalt:** Beispiel-Assets und app-spezifische Requisiten verheddern sich mit den Kernmodulen der Engine.
3. **Auffindbarkeit & Wiederverwendbarkeit:** Assets, die für eine App erstellt wurden (z. B. `and-now`), sind schwer zu durchsuchen, zu betrachten und in anderen Apps oder Werkzeugen (wie `MaterialStudio` oder `Maker`) wiederzuverwenden.

## Entscheidung

Wir etablieren einen 3-phasigen Architekturstandard für modulare Asset-Kits und Out-of-Tree-Asset-Distribution:

### 1. Phase 1: Semantische Kit-Struktur & Metadaten-Standard
Alle wiederverwendbaren Assets folgen einer standardisierten Kit-Hierarchie:
- **Ort:** `public/assets/kits/<kit-name>/` (z. B. `industrial/`, `characters/`, `materials/`, `urban/`).
- **Standard-Asset-Bündel:**
  - `model.glb`: Optimiertes, in sich geschlossenes binäres glTF mit eingebetteten PBR-Texturen ($\le 25.000$ Dreiecke, $\le 2\text{K}$-Texturen).
  - `preview.webp`: Quadratisches 512×512-Thumbnail für UI-Inspektoren und Kataloge.
  - `meta.json`: Semantische Deskriptoren, Bounding-Box-Ausmaße, Material-Slots, Dreieckszahlen und Lizenz-/Attributionsangaben.
- **Metrischer Einheiten-Standard:** Alle Kits halten sich strikt an $1{,}0\text{ Einheit} = 1{,}0\text{ Meter}$.

**Status:** umgesetzt, mit kleinen Abweichungen -- das reale `industrial/`-Kit unter
`public/assets/kits/` nutzt `preview.jpg` statt `.webp`, und führt zusätzlich eine `kit.json` pro
Kit, die dieser Standard nicht vorsieht.

### 2. Phase 2: Out-of-Tree-Repository & CDN-Distribution
- **Dediziertes Asset-Repository (`small-world-assets`):** Binäre Produktions-Assets, rohe DCC-Dateien und Kit-Bündel werden in einem dedizierten Repository oder Git-LFS-Speicher untergebracht.
- **CDN-Distribution:** Assets werden auf ein schnelles CDN veröffentlicht (über GitHub Releases, jsDelivr oder Cloudflare), sodass Szenen Standard-Assets über Remote-URIs referenzieren können, ohne den lokalen Datenträger aufzublähen.

**Status:** nicht umgesetzt. Kit-Binärdateien (z. B. `model.glb` mit 1,2 MB) liegen aktuell direkt
im Haupt-Repository, ohne Git-LFS-Filter und ohne dediziertes `small-world-assets`-Repo -- exakt
das Anti-Pattern aus dem Kontext-Abschnitt oben, das diese Phase verhindern sollte.

### 3. Phase 3: Laufzeit-Katalog-Ingest & CLI-Tooling
- **`GltfLoader`-Katalog-Auflösung:** `GltfLoader` um Katalog-Alias-Auflösung erweitern:
  ```typescript
  // Löst zum lokalen Cache oder CDN-Fallback auf:
  const lamp = await GltfLoader.loadFromCatalog("industrial/wall_lamp");
  ```
- **CLI-Download-Hilfsprogramm:** Entwickler können Kit-Bündel optional bei Bedarf in ihren lokalen Arbeitsbereich herunterladen:
  ```bash
  npx small-world add kit industrial
  npx small-world add prop industrial/wall_lamp
  ```

**Status:** nicht umgesetzt. Weder `GltfLoader.loadFromCatalog()` noch die `small-world`-CLI
existieren im Code -- setzt ohnehin Phase 2 (ein echtes Remote-Katalog-Ziel) voraus.

## Konsequenzen

- **Leichtgewichtiger Kern-Engine:** Das Kern-Repository von `small-world` bleibt schlank, schnell zu klonen und frei von schwerem binärem Ballast.
- **Modularität:** Ersteller können in sich geschlossene, thematische Asset-Pakete veröffentlichen und konsumieren (z. B. *Graphic Noir Sewer Kit*, *Industrial Bunker Kit*, *Character Starter Kit*).
- **Tooling-Kompatibilität:** `Maker` (Nachfolger von `GadgetInspector`, siehe ADR 0010),
  `MaterialStudio` und künftige In-Game-Szeneneditoren können Asset-Auswahl-Paletten dynamisch
  direkt aus Kit-Manifesten befüllen.
