# Maker — Development Log

> Dieses Log ist das primäre Gedächtnis für das Maker-Tool.
> Vor jeder Session lesen, nach jeder Session einen Eintrag anhängen.

---

## 2026-09-01 — Nachtrag: Multi-Selektion (letzter offener Roadmap-Punkt)

Größter Umbau bisher — betrifft Selection-State, Gizmo, Hierarchy-Panel, Property-Panel und
Undo für Duplicate/Delete/Group gleichzeitig.

- **Selection-Modell:** `_selection: Set<Object3D>` + `_primary: Object3D | undefined`
  (Blender/Unity-"aktives Objekt"-Konvention — treibt Property-Panel-Anzeige + Gizmo-Pivot).
  `_selected` bleibt als reiner Getter-Alias auf `_primary` erhalten, damit die ~25 bestehenden
  Single-Object-Lesestellen im Code unverändert weiterlaufen.
- **Klick-Semantik:** Klick = Auswahl ersetzen. Shift/Ctrl/Cmd+Klick = togglen, ohne den Rest
  anzutasten — sowohl im Viewport (`_onPointerDown`) als auch im Hierarchy-Panel (Zeilen-Klick
  reicht jetzt den Modifier-Status durch). Modifier+Klick auf Leerraum ist bewusst ein No-op
  (löscht keine bestehende Mehrfachauswahl).
- **Highlight:** Pool aus wiederverwendeten Wireframe-Boxen (`_highlightMeshes[]`, indexbasiert
  statt an ein festes Objekt gebunden) statt einer einzigen — primäres Objekt cyan, alle anderen
  amber, damit auf einen Blick klar ist, welches Objekt Gizmo/Property-Panel gerade treiben.
- **Gizmo:** bleibt am Primary verankert (Pivot/Orientierung unverändert), aber der Drag-Delta
  wird auf ALLE selektierten Objekte angewendet (gleicher Delta pro Objekt, kein
  Pivot-relativer Gruppen-Transform — bewusste Vereinfachung, passt zum ohnehin schon
  "simplified gizmo"-Ansatz aus TransformGizmo's eigenem Kommentar). Ein Drag = ein Undo-Schritt
  für die ganze Selektion (`Map<Object3D, Vector3D>`-Snapshot statt Einzelwert).
- **Duplicate/Delete:** `duplicateSelection()`/`deleteSelection()` ersetzen die alten
  Single-Object-Methoden komplett (keine Sonderfälle mehr nötig, N=1 läuft über denselben Pfad).
  Je EIN Undo-Schritt für die ganze Batch-Operation.
- **Group:** `groupSelection()` verzweigt jetzt: 1 Objekt → alte Logik unverändert
  (`_groupSingle`, Gruppe übernimmt exakt die alte Transform). Mehrere Objekte → neue
  `_groupMultiple`: Gruppe landet am Centroid der Weltpositionen, jedes Objekt behält seine
  exakte Weltposition (nur Position wird angepasst, Rotation/Scale bleiben unberührt, da die
  Gruppe selbst Identity-Rotation/Scale bekommt). Funktioniert auch, wenn die selektierten
  Objekte unterschiedliche ursprüngliche Parents hatten — jedes bekommt beim Undo seinen
  eigenen Parent zurück.
- **Echter Bug beim Live-Test gefunden und gefixt (betraf auch den alten Single-Object-Pfad!):**
  Eine frisch erzeugte Gruppe hat eine Identity-`worldMatrix`, bis irgendwer
  `updateMatrixWorld()` drauf aufruft — fehlte in beiden `redo()`-Pfaden. Kinder haben ihre
  Weltposition dadurch beim Reparenting kurzzeitig NICHT korrekt erhalten (nur durch den
  nächsten Render-Frame kaschiert, der `scene.update()` ohnehin für den ganzen Baum aufruft —
  im Live-Betrieb also unsichtbar, aber synchron nachweisbar falsch). Nie aufgefallen, weil der
  allererste Group-Test (frühere Session) zufällig ein Objekt im Ursprung traf (0=0 sieht aus
  wie "korrekt", ist es aber nicht). Erst der heutige Test mit echten Nicht-Null-Positionen hat
  es aufgedeckt. Fix: `group.updateMatrixWorld()` direkt nach dem Hinzufügen zur Szene, vor dem
  Repositionieren der Kinder — in beiden Pfaden.
- **PropertyPanel:** zeigt weiterhin nur das Primary-Objekt (kein Batch-Edit), aber jetzt mit
  "(+N more)"-Suffix im Titel, damit klar ist, dass mehr als ein Objekt selektiert ist.
- **Bewusst nicht erweitert:** `attachBehaviorToSelection` bleibt Single-Object (Primary) —
  Behaviors sind nicht teilbar (ein Behavior hat genau ein `target`), hätte eine
  Factory-Signatur-Änderung in `ObjectPalette` gebraucht; als klare Grenze dokumentiert, kein
  Bug.
- Live geprüft: Shift-Klick im Hierarchy-Panel UND direkte Selection-API, Duplicate/Delete/Group
  mit 2 Objekten inkl. Undo (je ein Batch-Schritt, nicht N Einzelschritte), Gizmo-Multi-Drag
  (gleicher Delta auf beide Objekte, ein Undo-Schritt), Weltpositions-Erhalt bei Group jetzt
  synchron korrekt, Single-Object-Regression (Group/Duplicate/Delete verhalten sich exakt wie
  vor der Umstellung) — durchgehend keine Konsolen-Fehler.

---

## 2026-09-01 — Nachtrag: Prefab-Vorschau im Panel

Prefab-Liste zeigt jetzt ein echtes 28×28px-Thumbnail-Bild neben jedem Namen statt nur Text.

- `ProjectBinding.savePrefabThumbnail()`/`.loadPrefabThumbnail()` (neu): Sidecar-Datei
  `prefabs/<name>.thumb.json` (`{ dataUrl }`) neben dem `.gltf` — bewusst JSON statt roher `.png`,
  weil die eigene `FileSystemWritableFileStreamLike`-Abstraktion nur String-Writes kann und eine
  `data:`-URL bereits ein String ist. Kollidiert nicht mit `listPrefabs()` (filtert nach `.gltf`).
- `MakerApp._captureViewportThumbnail()` (neu): blendet Gizmo + Highlight-Box für einen Frame aus
  (Doppel-`requestAnimationFrame`, Standard-Pattern für "nach dem nächsten echten Paint"),
  `canvas.toDataURL()`, stellt Sichtbarkeit wieder her. Rührt sonst nichts an der Szene an —
  andere sichtbare Objekte landen mit im Bild. Ein isolierter Render (Kamera auf die Bounds des
  Objekts) wäre der nächste Ausbauschritt, bewusst nicht in diesem Durchgang.
- **Echter Robustheits-Bug beim Live-Test gefunden und gefixt:** Wenn der Browser-Tab beim Klick
  auf "Save Selection" nicht sichtbar ist, pausiert `requestAnimationFrame` unbegrenzt — der
  komplette Speicher-Flow (inkl. Status-Text und Prefab-Listen-Refresh, die NACH dem
  Thumbnail-Schritt liegen) hing dadurch fest, nicht nur das Thumbnail selbst. Fix: die
  Doppel-rAF-Kette läuft jetzt gegen ein 1-Sekunden-Timeout via `Promise.race` — Thumbnail fehlt
  dann einfach (kosmetische Lücke, wie ohnehin schon vorgesehen), aber der Rest des Flows blockiert
  nie mehr unbegrenzt.
- Live geprüft: `canvas.toDataURL()` liefert nachweislich echte Pixel (Center-Pixel = Würfelfarbe,
  Eckpixel = schwarzer Hintergrund, ~380KB PNG) direkt nach dem Laden. Der komplette
  Save→Thumbnail→Liste-Flow läuft robust durch, auch als der Test-Tab `document.hidden` wurde
  (bekannte claude-in-chrome-Automatisierungs-Einschränkung, siehe
  `feedback_browser_automation_raf_throttling`-Erinnerung) — genau dieser Fall hat den
  Robustheits-Bug erst sichtbar gemacht. `<img class="maker-prefab-thumb">` rendert korrekt mit
  dem gespeicherten `dataUrl`, separat verifiziert.
- 3 neue Tests in `tests/tools/maker/ProjectBinding.test.ts` für die neuen Methoden.

---

## 2026-08-31 — Nachtrag: Kamera-Bookmarks

9 Slots (1-9), **links = springen, rechts = aktuelle Ansicht speichern** (Toolbar-Buttons `📷1`-`📷9`
und Tastenkürzel `1`-`9` / `Ctrl+1`-`9`), analog zu Unity/Unreal-Numpad-Bookmarks, nur auf
Maus-only übertragen. Belegte Slots werden per `.active`-Klasse visuell hervorgehoben.

- `OrbitCameraController.getView()`/`.setView()` (neu): Snapshot als eigenes `target`-Clone, damit
  spätere Kamerabewegung einen bereits gespeicherten Bookmark nicht rückwirkend verändert.
- **Bewusst nicht persistiert** — reines In-Memory-Feature für die laufende Maker-Session, kein
  Teil des glTF-Weltformats (keine `SW_*`-Extension dafür). Reine Navigations-Hilfe, kein
  Szeneninhalt, überlebt daher kein Neuladen.
- Live geprüft: Speichern/Springen über direkte Methodenaufrufe, echten Button-Klick
  (`.click()`) und echte Tastatur-Events verifiziert — Kamera-State nach Sprung war exakt der
  gespeicherte, eine zwischenzeitliche Kamerabewegung hat den Bookmark nicht verändert (beweist,
  dass der Snapshot unabhängig vom Live-`target` ist). `computer`-Tool-Rechtsklick/Zifferntasten
  simulierten in der Browser-Automation keine echten `contextmenu`/`keydown`-Events (bekannte
  Automations-Einschränkung, siehe Erinnerung zu rAF-Throttling) — über echte dispatchte
  DOM-Events lief alles korrekt.

---

## 2026-08-31 — Nachtrag: Duplicate / Group

**Ctrl+D** (Duplicate) und **Ctrl+G** (Group) implementiert, plus Buttons in der Toolbar.

- `Object3D.clone()` (neu, `src/core/Object3D.ts`): generischer Deep-Clone über
  `shallowCloneWithValueTypes()` (neu, `src/core/CloneUtils.ts`) — Prototyp-basiertes Shallow-Copy
  + automatisches Deep-Clone jedes `Vector3D`/`Quaternion`/`Color`-Feldes + frische `uuid`.
  Rekursiv für Children, `AbstractMaterial.clone()` fürs Material (eigene, gründlichere
  `clone()`-Overrides von `StandardMaterial`/`FrostglassMaterial` bleiben unangetastet und
  gewinnen), `Behavior.clone()` + `attachBehavior()` fürs Re-Attachment. `geometry`/Texturen
  bleiben bewusst geteilt (unveränderliche Daten, Standard-Praxis). `rigidBody` wird bewusst
  NICHT geklont (sonst würden zwei Objekte an einem physischen Body hängen).
  **Bekannte Lücke:** SkinnedMesh/Skeleton nicht speziell behandelt — Duplicate ist für
  Props/Lights/Prefab-Instanzen gedacht, Charakter-Rigs laufen über die Prefab/glTF-Pipeline.
- `MakerApp.duplicateObject()` / `.groupSelection()`: beide über `UndoStack`, gleiches Muster wie
  `addObject`/`deleteObject`/`reparent`. Group nimmt den alten Local-Transform des Objekts für die
  neue leere Parent-Gruppe, Objekt selbst wird auf Identity zurückgesetzt (Weltposition bleibt
  gleich) — Standard-Verhalten aus Blender/Unity. Vorerst nur Einzelobjekt (kein Multi-Select).
- Live im Browser verifiziert (`public/tools/maker.html`): Duplicate erzeugt unabhängige Kopie
  (Farbänderung an der Kopie beeinflusst das Original nachweislich NICHT), Group verschachtelt
  korrekt und setzt Kind-Transform auf 0/0/0 zurück, beide Undo-Pfade räumen sauber auf, Buttons
  UND Shortcuts geprüft, keine Konsolen-Fehler.

---

## 2026-08-31 — Nachtrag: GadgetInspector entschlackt (ADR 0010 §5)

Im Zuge der Branch-Hygiene fielen fünf tote Imports in `GadgetInspector.ts` auf
(`InspectorAudio`, `InspectorDeviceCaps`, `InspectorDiagnostics`, `InspectorGizmos`,
`InspectorSelection`) — Reste eines abgeschlossenen, aber nie zurück verdrahteten
"Extract Service"-Refactors aus dem gelöschten `god-objects-refactoring`-Branch.

**Erkenntnis:** Reines Service-Extrahieren reicht nicht — die extrahierte
`InspectorSelection.buildGUI()` war weiterhin 250 Zeilen `if ("roughness" in mat) ...`
Duck-Typing, nur in einer neuen Datei. Stattdessen: die vier unproblematischen Klassen
(Audio/DeviceCaps/Diagnostics/Gizmos) angeschlossen, `InspectorSelection` aber komplett auf
`collectInspectorSchema()` (den `Inspectable`-Reflection-Layer aus Phase 0, denselben den
Makers `PropertyPanel` schon nutzt) umgestellt. `GadgetInspector.ts`: 1037 → 479 Zeilen,
kein Duck-Typing mehr. Dabei echte Lücken in Material-/Light-Schemas geschlossen
(`alphaTest` auf Standard-/PhongMaterial, `wireframeMode` auf WireframeMaterial,
`distance`/`angle`/`penumbra`/`decay` auf SpotLight). Live im Browser verifiziert
(`and-now`/Flakturm-Tunnel-Szene): General Settings, Transform, Hierarchy-Navigation,
Behaviors, Light-Properties — alles fehlerfrei, keine Konsolen-Fehler.

**Warum das hier steht:** GadgetInspector ist laut ADR 0010 §5 nur ein "wird erst nach
Feature-Parität mit Maker abgelöst" — dieser Umbau bringt ihn architektonisch näher an
Maker heran (gleicher Reflection-Layer), ohne ihn zu ersetzen.

---

## 2026-08-31 — Session: Aufräumen & Fundament legen

**Branch:** `maker`

### Kontext
Maker war eine "abendliche Schnappsidee" ohne formales Konzept — aber mit
überraschend viel Substanz: Transform-Gizmo, Hierarchy, Property-Panel, Prefabs,
Autosave, Undo-Stack, ASCII-Map-Import und ein massiv ausgebauter GadgetInspector
(letzter Commit: +707 Zeilen).

Heute: Branch-Hygiene, Core-Änderungen isoliert nach `main` gemergt, Docs angelegt.

### Was passierte
- `god-objects-refactoring` und `god-objects-refactoring-bob` (lokal + remote) gelöscht.
- `maker`-Worktree aufgelöst → normaler Branch-Checkout.
- `Object3D.prefabSource?: string` (ADR 0010 Phase 2) aus `maker` nach `main` extrahiert
  und committed (`fd2d2ec6`).
- `GltfLoader.ts` + `WorldWriter.ts`-Änderungen bleiben in `maker` — sie sind eng an
  den Prefab-Workflow gekoppelt und gehören semantisch hierher.
- Concept Dossier (`concept-dossier.html`) und dieses Log angelegt.

### Stand der Features
| Feature | Status |
|---|---|
| Transform-Gizmo (translate/rotate/scale) | ✅ |
| Hierarchy-Panel | ✅ |
| Property-Panel | ✅ |
| Objekt-Palette (Geometrien) | ✅ |
| Prefab-Palette (Phase 2 / stamped copies) | ✅ |
| Autosave via File System Access API | ✅ |
| Undo-Stack | ✅ |
| ASCII-Map-Import | ✅ |
| GadgetInspector (massiver Ausbau) | ✅ |

### Offene Punkte / Nächste Schritte
- Isolierter Prefab-Thumbnail-Render (Kamera auf Objekt-Bounds statt aktuelle Viewport-Ansicht)
- Behaviors auf Mehrfachauswahl anwendbar machen (bewusst nicht in der Multi-Select-Runde
  mitgemacht, siehe Nachtrag oben)
- Pivot-relativer Gruppen-Transform für Gizmo-Rotate/Scale bei Mehrfachauswahl (aktuell: gleicher
  Delta pro Objekt, kein "um gemeinsamen Punkt drehen")

**Korrektur (2026-08-31):** "Licht-Platzierung" fälschlich als offen gelistet — Point-,
Directional- und AmbientLight sind bereits seit dem Phase-1-MVP-Commit (`cd9a608c`) Teil der
`ObjectPalette`. Dokumentationsfehler, kein nachträglich gebautes Feature.

**Update (2026-09-01):** Alle Punkte der ursprünglichen Roadmap-Liste sind jetzt erledigt
(Duplicate/Group, Kamera-Bookmarks, Prefab-Vorschau im Panel, Multi-Selektion). Die drei oben
genannten Punkte sind neu entdeckte, kleinere Ausbauschritte aus der heutigen Session, keine aus
der ursprünglichen Liste.

### Architektur-Notizen
- `MakerApp extends SmallWorld` — Orchestrator, kein Monolith
- Soft-Delete via `_trashBin` (Off-Scene Object3D) verhindert GPU-Buffer-Disposal beim Undo
- `ProjectBinding` nutzt abstrakte Interfaces → vollständig testbar ohne Browser-FS
- ADR 0010 (docs/adr/0010-maker-editor-architecture.md) ist die Haupt-Referenz
- **Phase 0 (Fundament, 2026-08-30):** `Behavior.inspector`-Reflection-Pattern generalisiert →
  `Inspectable`-Interface (`src/core/Inspectable.ts`) + `collectInspectorSchema()`, jetzt über
  `Object3D`, alle Materialien und Lichter hinweg. Ersetzt die alte Drei-Wege-Aufteilung
  (hardcoded / duck-typed / deklarativ) durch einen generischen Panel-Renderer.
- **Bekannter Stolperstein — Circular-Import-TDZ:** `SmallWorld` muss zwingend aus dem
  `core/index.js`-Barrel importiert werden, nicht direkt aus `./SmallWorld.js`. Grund: die
  gesamte Renderer-Pipeline importiert selbst den Barrel, ein Direktimport als allererstes
  Modul im Graph kann `AbstractShowcase.ts`s `extends SmallWorld` erreichen, bevor `SmallWorld`s
  eigene Klassendeklaration gelaufen ist — realer, live im Browser reproduzierter TDZ-Crash,
  kein hypothetisches Risiko. Dokumentiert im Kopfkommentar von `MakerApp.ts`.

### Arbeitsvereinbarung
**"Blindflug":** Der User testet Maker bewusst nicht selbst, solange es sich vermeiden lässt —
meine eigene Live-Browser-Verifikation (claude-in-chrome) ist die einzige QA für dieses Projekt,
nicht nur eine Ergänzung. Vor jeder "Phase X fertig"-Meldung: so gründlich wie möglich live im
Browser testen, inklusive Gesten, die die Automation nicht direkt unterstützt (z.B. Right-Drag
für Orbit-Rotation via simulierte DOM-`MouseEvent`s mit `button:2`/`movementX/Y`, über einen
Frame gehalten). Explizit benennen, was sich tatsächlich nicht verifizieren ließ.

---
