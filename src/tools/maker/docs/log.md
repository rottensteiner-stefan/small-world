# Maker — Development Log

> Dieses Log ist das primäre Gedächtnis für das Maker-Tool.
> Vor jeder Session lesen, nach jeder Session einen Eintrag anhängen.

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
- **Duplicate / Group** — fehlt noch, wäre das nächste sinnvolle Feature
- **Licht-Platzierung** — DirectionalLight / AmbientLight aus der Palette
- **Kamera-Bookmarks** — Viewport-Positionen speichern/springen
- Prefab-Vorschau im Panel (längerfristig)
- Multi-Selektion (längerfristig)

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
