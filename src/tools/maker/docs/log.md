# Maker — Development Log

> Dieses Log ist das primäre Gedächtnis für das Maker-Tool.
> Vor jeder Session lesen, nach jeder Session einen Eintrag anhängen.

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
- Prefab-Vorschau im Panel (längerfristig)
- Multi-Selektion (längerfristig)

**Korrektur (2026-08-31):** "Licht-Platzierung" fälschlich als offen gelistet — Point-,
Directional- und AmbientLight sind bereits seit dem Phase-1-MVP-Commit (`cd9a608c`) Teil der
`ObjectPalette`. Dokumentationsfehler, kein nachträglich gebautes Feature.

**Update (2026-08-31):** "Duplicate / Group" und "Kamera-Bookmarks" sind erledigt — siehe
Nachträge oben. Damit sind alle kurzfristigen Punkte aus der ursprünglichen Liste abgearbeitet;
offen bleiben nur noch die zwei längerfristigen (Prefab-Vorschau, Multi-Selektion).

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
