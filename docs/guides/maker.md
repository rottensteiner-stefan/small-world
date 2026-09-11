# Maker (Welten- & Szeneneditor) — Profi-Anleitung & Referenz

**Maker** ist der eigenständige, browserbasierte 3D-Szenen- und Umgebungseditor von Small World (`/tools/maker.html`). Speziell für digitale Künstler und Power-User zugeschnitten, schließt Maker die Lücke zwischen prozeduraler Engine-Entwicklung und visueller Szenenkomposition — keine handgeschriebenen Szenen-Layout-Dateien mehr nötig, dafür ein latenzfreier, tastaturgetriebener Workflow.

```
+-------------------------------------------------------------------------------------------------------+
|  Header: [Maker - Small World]   [📷1][📷2]..[📷9]   [🧲 0.50m][[][]]   [⬇ Boden]   [Speichern/Status] |
+-------------------+---------------------------------------------------------------+-------------------+
| Hierarchie & Add  | Viewport & interaktive Werkzeuge                              | Inspector         |
| - Szenenbaum      | - Orbit-Kamera & 9 schnelle View-Bookmarks (1-9 / Strg+1-9)   | - Transform       |
| - Primitive       | - Immer-obenauf-Transform-Gizmo (W: Move / E: Rotate / R: Sc) |   (X/Y/Z Nudge)   |
| - Lichter         | - Kamera-kardinales Tastatur-Nudging (Pfeile / BildAuf/-Ab)   | - Materialien(PBR)|
| - Prefabs (Thumb) | - Dynamisches Snapping (0,1m - 2,0m / 15° / 0,25)             |   (Rough/Metal/α) |
| - ASCII-Map-Impt  | - 2D-Auswahlrechteck & Cyan/Bernstein-Cluster-Hervorhebung    | - Behaviors       |
|                   | - Pivot-relative Multi-Objekt-Gruppentransformationen         |   (Factory Batch) |
+-------------------+---------------------------------------------------------------+-------------------+
| Footer: Autosave-Status (Alle Änderungen in scene.gltf gespeichert / 500ms Debounce)                  |
+-------------------------------------------------------------------------------------------------------+
```

---

## 1. Power-User-Ergonomie & schnelles Tastatur-Nudging

Maker ist um eine "Hände-auf-der-Tastatur"-Philosophie herum gebaut, stark inspiriert von professionellen Digital-Art- und 3D-Modeling-Paketen (Blender, Photoshop, Unreal Engine).

### Kamera-kardinales Richtungs-Nudging
Das Verschieben von Objekten über die Pfeiltasten ist **kamera-perspektiven-bewusst**:
- **XZ-Ebenen-Bodenbewegung:** Drücken von $\uparrow$, $\downarrow$, $\leftarrow$ oder $\rightarrow$ berechnet in Echtzeit die dominante kardinale Ausrichtung der Kamera im Weltraum (Nord, Ost, Süd, West).
  - $\uparrow$ verschiebt die Auswahl immer **vom Betrachter weg** (in die Bildtiefe).
  - $\downarrow$ verschiebt die Auswahl immer **zum Betrachter hin**.
  - $\rightarrow$ verschiebt die Auswahl immer **visuell nach rechts**.
  - $\leftarrow$ verschiebt die Auswahl immer **visuell nach links**.
- **Höhenbewegung (Y-Achse):**
  - `Shift` + $\uparrow$ oder `Bild auf`: Bewegt ausgewählte Objekte um das aktive Raster-Snap-Inkrement **nach oben (+Y)**.
  - `Shift` + $\downarrow$ oder `Bild ab`: Bewegt ausgewählte Objekte um das aktive Raster-Snap-Inkrement **nach unten (-Y)**.

### Modale Transformations-Hotkeys
Die Pfeiltasten passen sich dynamisch an den aktiven Gizmo-Modus oder Tastatur-Modifikator an:
| Modus / Modifikator | Aktion der Pfeiltasten | Schrittgröße |
|---|---|---|
| **Move-Modus (<kbd>W</kbd>)** (Standard) | Position verschieben (XZ / Y mit Shift) | Aktueller Raster-Snap (`0,1m` – `2,0m`) |
| **Rotate-Modus (<kbd>E</kbd>)** oder <kbd>Alt + Pfeile</kbd> | Rotation um Yaw (Y) / Pitch (X) | Winkel-Snap ($15^\circ$ / $\pi / 12$) |
| **Scale-Modus (<kbd>R</kbd>)** oder <kbd>Alt + Shift + Pfeile</kbd> | Objekt skalieren (Uniform / Achse) | Skalierungs-Snap ($0,25$) |

### Am Boden einrasten (<kbd>Ende</kbd> / `⬇ Boden`)
Drücken von <kbd>Ende</kbd> (oder Klick auf `⬇ Boden`) berechnet die exakte untere Weltraum-Bounding-Box-Grenze (`min.y`) für die gesamte aktuelle Auswahl (Einzelobjekt oder Multi-Selektions-Cluster) und verschiebt sie vertikal so, dass die Unterkante exakt bündig bei `Y = 0` (der Weltboden-Ebene) sitzt.

---

## 2. Dynamisches Snapping-System & Rasterauflösungs-Stufung

Snapping ist in Maker **standardmäßig aktiviert**, um sauberen, modularen Szenenaufbau ohne mikroskopische Lücken oder Fehlausrichtungen zu gewährleisten.

- **Soforttoggle:** <kbd>X</kbd> drücken oder auf `🧲 Snap` klicken, um Snapping spontan ein-/auszuschalten.
- **Schnelle Raster-Stufungs-Hotkeys:**
  - <kbd>[</kbd> : **Feineres Raster** — stuft durch die Auflösungen abwärts (`2,0m` $\rightarrow$ `1,0m` $\rightarrow$ `0,5m` $\rightarrow$ `0,25m` $\rightarrow$ `0,1m`).
  - <kbd>]</kbd> : **Gröberes Raster** — stuft durch die Auflösungen aufwärts (`0,1m` $\rightarrow$ `0,25m` $\rightarrow$ `0,5m` $\rightarrow$ `1,0m` $\rightarrow$ `2,0m`).
- **Präzisions-Parameter:**
  - **Translations-Snap:** Standard `0,5m` (einstellbar von `0,1m` bis `2,0m`).
  - **Rotations-Snap:** Feste $15^\circ$ ($0,2618\text{ rad}$) Winkel-Quantisierung.
  - **Skalierungs-Snap:** Feste `0,25`-Schrittmultiplikatoren.

---

## 3. Mehrfachauswahl, Auswahlrechteck & pivot-relative Cluster

Maker unterstützt vollständige Multi-Objekt-Workflows mit voller Parität zwischen Viewport- und Hierarchie-Interaktionen.

```
                    [Primär: Cyan-Wireframe] (Aktiver Inspector & Pivot-Anker)
                              |
                              +--- [Sekundär: Bernstein-Wireframe]
                              +--- [Sekundär: Bernstein-Wireframe]
```

### Auswahl-Mechanik
- **Einzelauswahl:** Linksklick auf ein Objekt im Viewport oder Klick auf eine Zeile im Hierarchie-Panel.
- **Additive Mehrfachauswahl:** <kbd>Shift</kbd>, <kbd>Strg</kbd> oder <kbd>Cmd</kbd> gedrückt halten und dabei Objekte im Viewport oder Zeilen im Hierarchie-Panel anklicken, um sie zur Auswahlmenge hinzuzufügen/zu entfernen.
- **2D-Auswahlrechteck:** Klicken und Ziehen über einen leeren Bereich des Viewports zeichnet ein 2D-Auswahlrechteck (`.maker-marquee-box`). Maker projiziert alle Bounding-Volumes der Szenenobjekte über die View-Projection-Matrix der Kamera in den Bildschirmraum, um alles innerhalb des Rechtecks auszuwählen. <kbd>Shift</kbd> während des Ziehens gedrückt halten, um die aktuelle Auswahl additiv zu erweitern.

### Primäre vs. sekundäre Objekte
- **Primärobjekt (Cyan-Hervorhebung):** Der Hauptanker der Auswahl. Es bestimmt, was im Property-Inspector erscheint, und dient als 3D-Mittelpunkt-Pivot für Gizmo-Transformationen.
- **Sekundärobjekte (Bernstein-Hervorhebung):** Weitere Mitglieder des Multi-Selektions-Clusters.

### Pivot-relative Cluster-Transformationen
Beim Rotieren oder Skalieren einer Mehrfachauswahl mit dem Gizmo werden Transformationen **relativ zum Weltraum-Pivotpunkt des Primärobjekts** durchgeführt — die räumliche Beziehung des Clusters bleibt dabei intakt, statt jedes Objekt um seine eigene lokale Achse zu drehen.

### Batch-Operationen
- **Batch-Duplizieren (<kbd>Strg+D</kbd>):** Klont alle ausgewählten Objekte, Materialeigenschaften und angehängten Behaviors tief, versetzt sie sauber in der Szene und fasst dies in einer einzigen Undo-Transaktion zusammen.
- **Batch-Löschen (<kbd>Entf</kbd> / <kbd>Rücktaste</kbd>):** Verschiebt alle ausgewählten Objekte in einem reversiblen Schritt in den Soft-Delete-Papierkorb.
- **Batch-Gruppierung (<kbd>Strg+G</kbd>):** Berechnet den 3D-Schwerpunkt aller ausgewählten Objekte, erstellt an diesem Schwerpunkt eine neue übergeordnete `Object3D`-Gruppe und ordnet die Kinder unter, während ihre exakten Weltmatrizen erhalten bleiben.
- **Batch-Behaviors:** Das Hinzufügen eines Behaviors aus der Palette instanziiert und hängt automatisch frische, isolierte Behavior-Instanzen an alle ausgewählten Objekte in einer atomaren Operation.

---

## 4. Immer-obenauf-Transform-Gizmo

Das Maker-Transform-Gizmo bietet Standard-**Translation** (<kbd>W</kbd>), **Rotation** (<kbd>E</kbd>) und **Skalierung** (<kbd>R</kbd>) direkt im 3D-Viewport.

- **Verdeckungssicheres Rendering:** Gerendert mit `depthTest: false` und `depthWrite: false`, sodass Transform-Handles, Rotationsringe und Skalierungsboxen auch dann vollständig sichtbar bleiben, wenn Objekte innerhalb dichter Geometrie oder hinter großen Meshes positioniert sind.
- **Interaktive Hervorhebung:** Handles heben sich beim Hovern hervor und rasten auf aktive Ziehachsen ein.
- **Dynamische Ausrichtung:** Bleibt an der Weltposition des primär ausgewählten Objekts verankert.

---

## 5. 3D-Licht-Gizmos & Auswahl-Reichweitenvolumen

Abstrakte Szenen-Emitter (`PointLight`, `DirectionalLight`, `SpotLight`, `AmbientLight`) besitzen dedizierte visuelle Marker im 3D-Viewport nach Industriestandard:

- **Pickbare visuelle Glyphen (Billboards):**
  - 💡 **PointLight:** Leuchtender Oktaeder-Kern in der Farbe von `light.color` (oder gelb). Immer als Billboard zur Kamera ausgerichtet.
  - ☀️ **DirectionalLight:** Sonnenscheibe mit Richtungspfeil, der den Lichtwinkel zeigt.
  - 🔦 **SpotLight:** Mini-Emitter-Kegel entlang des Zielvektors des Spotlights.
  - 🌐 **AmbientLight:** Wireframe-Kugel, die die Umgebungslicht-Beleuchtung des Himmels darstellt.
- **Direktes 3D-Raycasting:** Klick auf eine Licht-Glyphe im 3D-Viewport wählt das Licht aus, hängt das Transform-Gizmo an und öffnet dessen Eigenschaften (`Color`, `Intensity`, `Distance`, `Decay`, `Angle`) im Property-Inspector.
- **Dynamische Auswahl-Reichweitenvolumen:**
  - Ist ein `PointLight` ausgewählt, zeichnet Maker eine Wireframe-Kugel, die dessen Abschwächungsreichweite (`distance`) zeigt.
  - Ist ein `SpotLight` ausgewählt, rendert Maker einen Wireframe-Kegel, der dessen exakten Öffnungswinkel (`angle`) und Reichweite (`distance`) zeigt. Das Anpassen der Parameter im Inspector skaliert den visuellen Kegel in Echtzeit!
- **Kein Export-Ballast:** Alle Licht-Hilfsobjekte leben in einem isolierten, editor-exklusiven Container und werden automatisch aus Szenen-Speicherungen und Runtime-Builds ausgeschlossen.

---

## 6. Prefab-Pipeline & isolierte 3D-Thumbnail-Renders

Maker bietet eine vollständige, in sich geschlossene Pipeline zum Erstellen und Platzieren von Prefabs.

```
[Hierarchie-Auswahl] ---> [Prefab speichern] ---> 1. Objekt-Teilbaum isolieren
                                                   2. 3/4-Kamerawinkel neu einrahmen
                                                   3. Isoliertes Thumbnail rendern (.thumb.json)
                                                   4. glTF-Szenengraph speichern (.gltf)
```

1. **Prefabs erstellen:** Ein beliebiges Objekt oder eine gruppierte Hierarchie in der Szene auswählen, einen Prefab-Namen in der Prefab-Palette eingeben und auf **Auswahl speichern** klicken.
2. **Automatisierte isolierte Thumbnail-Erzeugung:**
   - Maker blendet vorübergehend das Transform-Gizmo, Hervorhebungs-Boxen und alle nicht zugehörigen Szenenobjekte aus, während die Szenenbeleuchtung (`AbstractLight`) erhalten bleibt.
   - Berechnet rekursiv die Bounding-Sphere des Prefab-Teilbaums.
   - Positioniert die Snapshot-Kamera automatisch in einer optimalen $3/4$-isometrischen Perspektive `(1, 0,75, 1)`, eng um das Objekt gerahmt.
   - Erfasst ein Offscreen-Rendering in ein begleitendes Thumbnail (`prefabs/<name>.thumb.json`).
   - Stellt Viewport-Kamera, Orbit-Controller-Zustand und Szenensichtbarkeit vollständig wieder her, ohne den Nutzer zu unterbrechen.
3. **Prefab-Platzierung:** Klick auf ein beliebiges Prefab-Thumbnail oder einen Namen in der Prefab-Palette platziert eine frische Instanz direkt an der Viewport-Fokusmitte in der Szene.

---

## 6. Kamera-Bookmarks & Viewport-Navigation

### 9 sofortige Sitzungs-Bookmarks (<kbd>1</kbd>–<kbd>9</kbd> & <kbd>Strg+1</kbd>–<kbd>9</kbd>)
- **Ansicht abrufen:** Zifferntasten <kbd>1</kbd> bis <kbd>9</kbd> drücken (oder Toolbar-Buttons `📷1`–`📷9` klicken), um die Kamera sofort zu einem gespeicherten Blickpunkt zu animieren.
- **Ansicht speichern:** <kbd>Strg+1</kbd> bis <kbd>Strg+9</kbd> drücken (oder **Rechtsklick** auf einen Bookmark-Button `📷1`–`📷9`), um aktuelle Kameraposition, Pitch, Yaw und Orbit-Ziel in diesem Slot zu speichern. Slots mit gespeicherten Ansichten werden mit einem aktiven Rahmen hervorgehoben.

### Navigation mit mehreren Maustasten (Orbit & Pan)
- **Ansicht drehen (Orbit):** Rechtsklick + Ziehen, Mittelklick + Ziehen, <kbd>Alt</kbd> + Linksziehen, oder macOS <kbd>Strg</kbd> + Linksziehen.
- **Ansicht verschieben (Pan):** <kbd>Shift</kbd> + Rechts-/Mittelziehen.
- **Ansicht zoomen:** Mausrad oder <kbd>Strg</kbd> + Mausrad.
- **Scroll-Zoom-Entkopplung:** Scrollen innerhalb von Hierarchie, Objekt-Palette oder Property-Inspector ist strikt isoliert (`stopPropagation()`), was unbeabsichtigtes Viewport-Zoomen beim Navigieren langer UI-Listen verhindert.

---

## 7. ASCII-Level- & Dungeon-Map-Import

Maker enthält einen eingebauten ASCII-Tilemap-Konverter (`MapImportPanel.ts`) für schnelles Retro-Level-Design und Dungeon-Blocking.

```
ASCII-Quelle:             3D-Welt-Erzeugung:
############              #  -> Modulare Wand-Prefabs (Höhe: 2m)
#.@...T...D#              .  -> Bodenkacheln
#..PP......#              D  -> Türdurchgangs-Prefabs / Portale
############              T  -> Fackel / Punktlicht mit Umgebungsglühen
                          P  -> Struktureller Säulen-Prefab
                          @  -> Spieler-Start-Spawnpunkt
```

Euer Text-Layout in den ASCII-Import-Dialog einfügen, um sofort ein 3D-Level mit ausgerichteten modularen Wänden, Bodenkacheln, Säulen, Lichtern und Spawn-Markern zu erzeugen.

---

## 8. Persistenz & glTF-2.0-`SW_*`-Erweiterungs-Engine

Maker nutzt die native **File System Access API** des Browsers (`showDirectoryPicker`) für direkte lokale Arbeitsbereichs-Bindung, ohne Daten auf externe Server hochzuladen.

- **Reibungslose Autosave:** Jede Bearbeitung (Transform-Änderung, Farbanpassung, Hierarchie-Umsortierung, Prefab-Erstellung) löst ein entprelltes (~500ms) Write-Through direkt nach `scene.gltf` aus.
- **`SW_*`-glTF-Metadaten-Erweiterungen:** Nicht-standardmäßige Engine-Daten werden sauber im `extras`-/`extensions`-Vendor-Namespace von glTF 2.0 gespeichert:
  - `SW_behaviors`: Serialisiertes Array angehängter Behaviors und ihrer konfigurierten Parameter.
  - `SW_physics`: RigidBody-Typen, Collider-Abmessungen, Masse, Restitution und Reibung.
  - `SW_material`: Eigene Shader-Eigenschaften, Roughness, Metallic, Emissive und Alpha-Test-Schwellenwerte.
- **Portabilität:** Erzeugte `scene.gltf`-Dateien lassen sich direkt in Blender, Babylon.js, Three.js öffnen oder über `GltfLoader` direkt in die Small-World-Spiel-Runtime laden.

---

## 9. Zerstörungsfreies Undo/Redo & Soft-Delete-Engine

Alle Szenen-Mutationen werden auf einem atomaren `UndoStack` nachverfolgt:
- **Undo / Redo:** <kbd>Strg+Z</kbd> zum Rückgängigmachen, <kbd>Strg+Shift+Z</kbd> (oder <kbd>Strg+Y</kbd>) zum Wiederholen.
- **Soft-Delete-Architektur:** Das Löschen eines Objekts oder Hierarchie-Zweigs verschiebt ihn in einen szenenexternen `_trashBin`-Container, statt seine WebGL-/WebGPU-Puffer sofort freizugeben. Das garantiert eine sofortige, ruckelfreie Wiederherstellung bei Undo ohne GPU-Stottern.

---

## 10. Master-Tastaturkürzel-Kurzreferenz

| Kategorie | Shortcut | Aktion |
|---|---|---|
| **Werkzeuge & Modi** | <kbd>W</kbd> | Move-/Translations-Werkzeug |
| | <kbd>E</kbd> | Rotations-Werkzeug |
| | <kbd>R</kbd> | Skalierungs-Werkzeug |
| | <kbd>X</kbd> | Snapping Ein/Aus umschalten |
| | <kbd>[</kbd> | Raster-Snap-Schritt verringern (feiner: $0,1\text{m}$) |
| | <kbd>]</kbd> | Raster-Snap-Schritt erhöhen (gröber: $2,0\text{m}$) |
| **Transform & Nudge** | $\leftarrow$ $\rightarrow$ $\uparrow$ $\downarrow$ | Auswahl entlang der kamera-kardinalen XZ-Ebene verschieben |
| | <kbd>Shift</kbd> + $\uparrow$ / $\downarrow$ oder <kbd>BildAuf</kbd> / <kbd>BildAb</kbd> | Auswahl entlang der Y-Achse (Höhe) verschieben |
| | <kbd>Alt</kbd> + Pfeile | Auswahl um Winkel-Snap rotieren ($15^\circ$) |
| | <kbd>Alt</kbd> + <kbd>Shift</kbd> + Pfeile | Auswahl um Skalierungs-Snap skalieren ($0,25$) |
| | <kbd>Ende</kbd> | **Am Boden einrasten:** Auswahl bündig auf $Y = 0$-Boden ablegen |
| **Auswahl & Graph** | <kbd>Linksklick</kbd> | Einzelobjekt auswählen |
| | <kbd>Shift</kbd> / <kbd>Strg</kbd> / <kbd>Cmd</kbd> + Klick | Toggle-/additive Mehrfachauswahl |
| | <kbd>Ziehen ins Leere</kbd> | 2D-Auswahlrechteck |
| | <kbd>Strg+F</kbd> / <kbd>Cmd+F</kbd> | **Hierarchie-Filter fokussieren:** Live-Suche & Filterung von Szenenobjekten nach Name (<kbd>Enter</kbd> wählt aus, <kbd>Esc</kbd> löscht) |
| | <kbd>F2</kbd> / Hierarchie-<kbd>Doppelklick</kbd> | **Objekt inline umbenennen:** Name in Hierarchie-Zeile bearbeiten (<kbd>Enter</kbd> übernimmt, <kbd>Esc</kbd> bricht ab) |
| | Property-Panel <kbd>Namensfeld</kbd> / Titel-<kbd>Doppelklick</kbd> | **Direktes Umbenennen:** Objektname oben im Property-Inspector bearbeiten |
| | <kbd>Strg+D</kbd> | Auswahl duplizieren (atomarer Batch) |
| | <kbd>Strg+G</kbd> | Auswahl am Schwerpunkt gruppieren |
| | <kbd>Entf</kbd> / <kbd>Rücktaste</kbd> | Auswahl löschen |
| **Verlauf** | <kbd>Strg+Z</kbd> | Rückgängig |
| | <kbd>Strg+Shift+Z</kbd> / <kbd>Strg+Y</kbd> | Wiederholen |
| **Kamera-Bookmarks** | <kbd>1</kbd> – <kbd>9</kbd> | Kamera-Bookmark 1–9 abrufen |
| | <kbd>Strg+1</kbd> – <kbd>Strg+9</kbd> / Rechtsklick-Button | Kamera-Bookmark 1–9 speichern |
| **Viewport-Navigation** | <kbd>Rechtsklick-Ziehen</kbd> / <kbd>Mittelziehen</kbd> | Ansicht drehen (Orbit) |
| | <kbd>Alt</kbd> + Linksziehen / macOS <kbd>Strg</kbd> + Linksziehen | Ansicht drehen (künstlerfreundlich) |
| | <kbd>Shift</kbd> + Rechts-/Mittelziehen | Ansicht verschieben (Pan) |
| | <kbd>Mausrad</kbd> | Rein-/Rauszoomen |
