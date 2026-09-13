# Project Backlog

> Lebendes, projektweites Gedächtnis für Ideen, offene Punkte und die Entscheidungen dazu — als
> chronologisches Journal geführt statt als klassisches Ticket-Board. Einträge werden nie
> gelöscht oder umgeschrieben, nur mit neuem Status fortgeschrieben (siehe Legende). Neueste
> Einträge stehen oben, wie bei `CHANGELOG.md`. Bei Sessionstart lohnt ein Blick auf die
> offenen (💡/📋/🔜) Punkte der letzten Einträge, bevor man neu anfängt zu suchen.

## Status-Legende

- 💡 **Idee** — aufgetaucht, aber noch nicht entschieden, ob/wann
- 📋 **Offen** — Entscheidung gefallen ("das sollten wir tun"), aber noch nicht umgesetzt
- 🔜 **Zurückgestellt** — bewusst verschoben, mit Grund/Bedingung
- ✅ **Erledigt** — umgesetzt, mit Commit-Referenz falls vorhanden
- ❌ **Verworfen** — bewusst nicht gemacht, mit Begründung

Ein Eintrag darf über mehrere Log-Daten hinweg seinen Status ändern (z. B. 💡 → 📋 → ✅) — dann
am ursprünglichen Eintrag ein `→ Update YYYY-MM-DD: …` anhängen statt einen Duplikat-Eintrag zu
erzeugen.

---

## 2026-09-13 — Echtes IBL für 6 Showcases + gefundener AO-Uniform-Bug (WebGL1+WebGL2)

- ✅ **Auslöser:** Showcase 15s Spiegelkugeln (`metallic:1.0, roughness:0.02`) wirkten "kaputt
  dunkel". Untersuchung ergab zunächst: keine echte IBL (Irradiance/Prefilter/BRDF-LUT), nur
  flaches `u_ambientColor`. Vorhandene Bake-Pipeline (`public/tools/ibl-gen.html` +
  `packages/engine/src/tools/ibl-gen.ts`, `IBLBaker`) wird bislang nur von Showcase 16 korrekt
  genutzt — 13/27/28/30/36 setzen `irradianceMap`/`prefilterMap` fälschlich auf die rohe,
  unkonvolvierte Skybox (kein `brdfLUT`).
- ✅ **Zwei neue Equirect-Panoramen per Gemini generiert** (`.agents/scratches/`, git-ignored):
  ein "Nebula"-Motiv (für die 5 Showcases mit gemeinsamer Skybox, 13/15/27/28/36) und ein
  "Vienna Ruins Sky"-Motiv (nur Showcase 30, eigene Skybox). Erster Versuch für Vienna zeigte
  sichtbare Kachel-Wiederholung der Referenz — mit präziserem Prompt ("kein Tiling, erfinde
  durchgehende Skyline") im zweiten Anlauf sauber gelöst.
  → Lektion: [[feedback_multipanel_image_gen]]-artig — ein Referenzbild kann das Modell zum
  wörtlichen Kacheln verleiten, wenn der Prompt "seamless 360°" nicht explizit "keine Wiederholung,
  erfinde Neues" dazuschreibt.
- ✅ **Baking über die bestehende `ibl-gen.html`-UI automatisiert** statt neu gebaut: Datei-Upload
  + Klick über `claude-in-chrome`-Automatisierung, echter Browser-Download (`ibl_maps.zip`, nach
  expliziter Nutzerfreigabe) statt direktem JS-Datenkanal (der blockt Base64-Bild-Rückgaben als
  Sicherheitsmaßnahme). PNG→WebP-Konvertierung lokal via `cwebp -lossless`. Alle 6
  `apps/showcases/{13,15,27,28,30,36}/assets/ibl/` befüllt, alle 6 `showcase.ts` auf das
  Showcase-16-Muster verdrahtet (Skybox bleibt unverändert sichtbar, nur die unsichtbaren
  IBL-Maps sind neu).
- ✅ **Echter Bug gefunden und gefixt, nicht nur IBL-Lücke:** `StandardMaterial.getRenderManifest()`
  schreibt AO nur in `u_extraParams.x` (das WGSL/WebGPU korrekt liest). Die GLSL-Shader
  (`Standard.frag.glsl` für WebGL2, `Standard.frag.glsl100` für WebGL1) lasen AO aber aus einem
  eigenen, nie befüllten `uniform float u_ao` — Default 0.0, multipliziert die GESAMTE
  Ambient-Formel (`ambient = (...) * ao`) auf beiden GLSL-Renderern permanent auf Null.
  Vermutlich ein alter Refactor-Rest (AO wurde mal in `u_extraParams` gebündelt, WGSL wurde
  angepasst, die beiden GLSL-Dateien nicht). Betraf **jede** WebGL1/WebGL2-Szene mit spürbarem
  Ambient-Anteil, nicht nur IBL — nur durch dieses konkrete, ambient-lastige Szenario extrem
  auffällig geworden. Fix: `u_ao`-Uniform entfernt, beide Shader lesen jetzt `u_extraParams.x`.
  Live in allen 3 Renderern verifiziert (dramatische, korrekte Verbesserung: Spiegelkugeln zeigen
  jetzt eine echte Umgebungsreflexion statt Schwarz).
- 📋 **Nicht in diesem Schritt:** kein IBL für WebGL1 (bleibt architektonisch ohne echten
  IBL-Pfad, nur der jetzt reparierte flache/`u_envMap`-Fallback-Pfad profitiert mit). Der
  unabhängige `USE_IBL`-Flag-Bug (`WebGL2Renderer.ts` prüft nur `irradianceMap||prefilterMap`,
  ignoriert `brdfLUT`) betraf unseren Fall nicht (wir setzen immer alle drei) und wurde nicht
  angefasst. Kein ADR geschrieben (nicht verlangt, nur angeboten).

---

## 2026-09-12 — ADR 0016 Phase 2.3+2.4: Hintergrundbild-Import + Klick-zum-Zeichnen — ADR 0016 KOMPLETT

- ✅ **Dritter + vierter Maker-UI-Teilschritt, damit ist ADR 0016 vollständig umgesetzt.**
  - **2.3:** `BackgroundPlane` (neuer `Object3D`-Marker-Subtyp, `instanceof`-erkennbar) +
    `BackgroundImportPanel` (Datei-Picker + Drag&Drop aufs Viewport). Höhe wird immer aus Breite
    + Bild-Seitenverhältnis abgeleitet, nie frei eingebbar — Bild kann nie gestreckt werden.
    `StageProjectionResolver` erweitert: fällt auf eine `BackgroundPlane` zurück, wenn kein
    `StageMovementBehavior` mit `"flat-plane"` existiert (z.B. eine brandneue Szene) — und bekam
    dabei `fromWorld`/`planeOrigin`/`planeNormal` ergänzt (nicht nur `toWorld`), damit ein
    Maus-Ray überhaupt gegen die Projektionsebene geschnitten werden kann.
  - **2.4:** Klick-zum-Zeichnen (`Z` togglet einen exklusiven Modus, Linksklick platziert Punkte
    per Ray/Ebenen-Schnitt gegen die aufgelöste Projektion, `Enter` schließt ab min. 3 Punkten zu
    einem echten `StageZoneMarker` — genau EIN Undo-Command über `addObject()`, `Escape` bricht
    verwerfend ab) + Viewport-Punkt-Ziehen (Handle greifen, Ray/Ebenen-Schnitt pro
    Pointer-Move, genau ein Undo-Command bei Loslassen — exakt das `_finishGizmoDrag`-Muster).
  - **Kleine Zusatz-Aufräumarbeit unterwegs (User-Hinweis):** ~11-fach wiederholter
    `"INPUT"/"TEXTAREA"[/"SELECT"] === active.tagName`-Block in `_onMakerKeyDown` zu einem
    `_isEditingField()`-Helper vereinheitlicht (dabei sogar strenger gemacht: jetzt überall
    inklusive SELECT-Guard, vorher nur an einer Stelle). Bewusst NICHT das `Keys`-Enum für
    `"Enter"`/`"Escape"` verwendet — das Enum ist explizit für `event.code` (Spiel-Input-Polling),
    diese Funktion vergleicht durchgängig gegen `event.key`; nur 2 von ~20 Vergleichen umzustellen
    wäre inkonsistenter als der Ist-Zustand gewesen.
  - Live in Maker Ende-zu-Ende verifiziert: echtes Flakturm-Hintergrundbild importiert (Aspect
    exakt 1376/768 = 1.7917 reproduziert), 4 Punkte per synthetischem Klick gesetzt, Enter erzeugt
    echten `StageZoneMarker` im Szenengraph, Punkt-Ziehen aktualisiert u/v live und committet
    genau einen Undo-Schritt, Undo stellt den Originalwert exakt wieder her. Keine Konsolenfehler.
  - **Vom User live in der Browser-Tab-Gruppe entdeckter Bug (nicht durch eigene Verifikation
    gefunden):** importiertes Hintergrundbild stand auf dem Kopf. Ursache: `createImageBitmap(file)`
    dekodiert top-down, aber `Texture.fromUrl(..., {flipY:true})` (das `flakturm-tunnel` selbst
    für exakt dasselbe Bild nutzt) geht über `AssetManager.loadImage()`, das mit
    `createImageBitmap(blob, {imageOrientation:"flipY"})` dekodiert — `TextureOptions.flipY`
    wird vom `Texture`-Konstruktor selbst nie ausgewertet, nur von `fromUrl`s Vorverarbeitung.
    `_importBackgroundImage` nutzte `Texture.fromImage(bitmap)` mit einem plain
    `createImageBitmap(file)` ohne diese Option — gefixt durch denselben
    `{colorSpaceConversion:"none", imageOrientation:"flipY"}`-Aufruf. Live mit demselben
    Flakturm-Bild nachverifiziert: steht jetzt korrekt.
  - **Bewusste Scope-Grenze:** kein echter Datei-Speichern/Laden-Roundtrip live getestet (braucht
    einen realen, vom User gewählten Projektordner über die File-System-Access-API — im
    Sandbox-Browser nicht automatisierbar). Die eigentliche Serialisierung (`SW_stage_zone`) ist
    bereits in Phase 1 über echte Roundtrip-Unit-Tests (4- und 6-Punkte-Fixtures) abgedeckt.
  - Verifiziert: `tsc`/`eslint`/`vitest` (752/752) grün, `npm run build` grün.
  - **ADR 0016 ist damit vollständig umgesetzt** (Phase 0/1/2). Phase 3 (Fluchtpunkt-Werkzeug,
    Snapping) und Phase 4 (KI-Chat-Panel) bleiben wie im ADR selbst festgehalten explizit
    außerhalb des Umfangs — spätere, separate Schritte.

## 2026-09-12 — ADR 0016 Phase 2.2: PropertyPanel-Punktlisten-Editor für Zonen

- ✅ **Zweiter Maker-UI-Teilschritt.** Neuer hartkodierter Sonderfallblock in `PropertyPanel.ts`
  (strukturell parallel zum Material-/Behaviors-Folder-Muster, da variable-Länge-Listen im
  generischen `Inspectable`-Schema kein Vorbild haben): "Zone Points (N)"-Folder mit einem
  aufklappbaren Unter-Folder pro Punkt (U/V/Scale-Felder + "🗑 Remove Point", ausgeblendet bei
  `points.length <= 3`), "+ Add Point"-Button am Ende. Undo-Granularität: jede einzelne
  Feldänderung/Add/Delete ist ihr eigener `UndoCommand` — konsistent mit jedem anderen Zahlenfeld
  in diesem Panel (nicht mit dem Gizmo-Drag-"ein Command pro Drag"-Muster).
  - Kleiner, aber notwendiger Zusatzfund: Punkt-Edits mutieren `zone.points` direkt, nicht ein
    Feld auf dem `StageZoneMarker` selbst — die generische `onPropertyChanged`-Identitätsprüfung
    in `_createFieldBinding` (`host === this._currentObj`) hätte für Punkt-Edits nie gefeuert,
    was Autosave stillschweigend übersprungen hätte. Eigene `_notifyZoneChanged()`-Methode löst
    das gezielt.
  - Live in Maker verifiziert: Punkte-Folder korrekt gerendert, U/V/Scale-Werte korrekt, "Add
    Point" fügt den erwarteten Mittelpunkt der letzten beiden Punkte hinzu, Undo (Ctrl+Z) stellt
    den vorherigen Zustand korrekt wieder her, keine Konsolenfehler.
  - Verifiziert: `tsc`/`eslint`/`vitest` (752/752) grün, `npm run build` grün.
  - **Nächster Schritt:** 2.3 (Hintergrundbild-Import), 2.4 (Klick-zum-Zeichnen).

## 2026-09-12 — ADR 0016 Phase 2.1: StageZoneGizmoManager (Anzeige + Auswahl in Maker)

- ✅ **Erster Maker-UI-Teilschritt.** Neuer `StageZoneGizmoManager` (direktes Vorbild
  `LightGizmoManager`) zeigt jede `StageZoneMarker`-Zone als Outline (`Polyline`-Geometrie, neu) +
  halbtransparente Füllfläche (`PolygonFan`-Geometrie, neu — dieselbe Fächer-Triangulation wie
  `StageZone.getScaleAt`) + Punkt-Handles (Octahedron). Neuer `StageProjectionResolver` findet
  eine `"flat-plane"`-Projektion aus einem `StageMovementBehavior` in der Szene, damit Zonen
  überhaupt irgendwo in 3D platziert werden können (Ergebnis wird wie bei `_liveLights`/
  `_liveMarkers` nur bei Hierarchie-Änderung neu aufgelöst, nicht pro Frame). Vollständig in
  `MakerApp` verdrahtet: Picking, Hierarchy-Panel-Sichtbarkeit, Thumbnail-Capture-Ausblendung.
  - **Echter, vorbestehender Engine-Bug gefunden + gefixt beim Live-Verifizieren:**
    `BasicMaterial.getRenderManifest()` synct nie `state.blending` aus `this.transparent` (anders
    als `StandardMaterial`/`PhongMaterial`/`SpriteMaterial`, die das explizit selbst tun) —
    `transparent = true` hatte auf `BasicMaterial` schlicht keine Wirkung, unabhängig vom
    Renderer (WebGL1/2 UND WebGPU keyen ihr Blend-State auf `state.blending`, nicht
    `state.transparent`). Kein bestehender Code verließ sich auf das kaputte Verhalten (geprüft).
    Gefixt nach demselben Muster wie `StandardMaterial`.
  - Live in Maker verifiziert (Test-Zone per Konsole injiziert, da das Zeichenwerkzeug erst in
    2.4 kommt): Outline/Füllfläche/Handles rendern korrekt, Klick auf Füllfläche selektiert die
    `StageZoneMarker` (nicht die rohe Mesh), Property-Panel zeigt automatisch generiertes Schema
    inkl. "Display Name" (`zone.name`), Transform-Gizmo hängt sich korrekt an.
  - Verifiziert: `tsc`/`eslint`/`vitest` (752/752) grün.
  - **Nächster Schritt:** 2.2 (PropertyPanel-Punktlisten-Editor), 2.3 (Hintergrundbild-Import),
    2.4 (Klick-zum-Zeichnen).

## 2026-09-12 — ADR 0016 Phase 1 + neue ADR 0017: glTF-Extension-Registry, SW_stage_zone

- ✅ **Zweite Umsetzungsphase von ADR 0016.** Statt `SW_stage_zone` als dritten hartkodierten
  if/else-Zweig neben `KHR_lights_punctual`/`SW_prefab_instance` in `GltfLoader`/`WorldWriter`
  einzubauen (User-Wunsch, während der Recherche aufgekommen — proprietäre glTF-Extensions
  können sich als De-facto-Standard durchsetzen, ohne je `KHR_`/offiziell zu werden, z.B.
  `EXT_mesh_gpu_instancing`): neuer genereller `GltfExtensionPlugin`-Mechanismus
  (`registerGltfExtension()`), die zwei bestehenden Extensions dorthin migriert (verhaltens-
  identisch, alle 29 vorherigen Loader-Tests unverändert grün), `SW_stage_zone` als dritter,
  sauberer Registry-Eintrag. Neue ADR 0017 dokumentiert die Entscheidung inkl. der verworfenen
  Alternative "eigenes `@small-world/gltf-extensions`-Package für diese drei" (Zirkelabhängigkeit
  — sie sind Default-Verhalten und brauchen zwingend Engine-Typen; ein externes Package bleibt
  aber der richtige Ort für spätere, echt optionale Community-Extensions).
  - `StageZoneMarker` (aus Phase 0) ist jetzt über `SW_stage_zone` roundtrip-fähig — 4-Punkte- UND
    6-Punkte-Fixture getestet, `extensionsUsed` wird jetzt korrekt befüllt (Nebenfund: fehlte
    bisher komplett, auch für die zwei alten Extensions).
  - Beim Umsetzen fiel eine Abweichung von ADR 0016s eigener Behauptung auf ("beide Szenen passen
    exakt in flat-plane") — `character-diorama` mappt tatsächlich v→Weltraum-Z (Boden), nicht
    v→Y (Wand), passt nicht in `"flat-plane"`. Läuft daher über `projection:{mode:"custom"}`
    weiter mit seiner bestehenden Closure — funktional unverändert, aber (noch) nicht
    Maker-roundtrip-fähig. ADR 0016 mit Status-Notiz korrigiert, nicht stillschweigend übergangen.
  - Verifiziert: `tsc`/`eslint`/`vitest` (752/752) grün, `npm run build` grün.
  - **Nächster Schritt:** Phase 2 (Maker-UI: Zonen zeichnen/bearbeiten, Hintergrundbild-Import).

## 2026-09-12 — ADR 0016 Phase 0: StageZone/StageMovementBehavior verallgemeinert

- ✅ **Erste Umsetzungsphase von ADR 0016** (Flakturm-Tunnel im Maker editierbar machen).
  `StageZone.points` von starrem 4-Tupel auf `StagePoint2D[]` (min. 3) verallgemeinert;
  `getScaleAt` läuft jetzt über einen Fächer aus `n-2` Dreiecken (bei n=4 byte-identisch zum
  alten Zwei-Dreiecks-Code); `getLocalAxes(u,v)` bekam einen Positions-Parameter (von der
  Recherche als notwendig erkannt, nicht explizit im ADR — der Gradient ist nur pro
  Fächer-Dreieck konstant, ab n>3 ohne Abfragepunkt nicht wohldefiniert) und nutzt für n=4
  weiterhin exakt die alte Eckenpaar-Formel (keine Verhaltensänderung für zone_a/b/c), für n≠4
  einen neuen Skalierungs-Gradienten (hergeleitet, mit Entartungsfall-Fallback).
  `StageZoneMarker extends Object3D` (neue Datei) gibt Zonen erstmals eine Szenengraph-Präsenz
  (Komposition, nicht `StageZone extends Object3D` — Details/Begründung im Plan). `uvToWorld`
  von `StageMovementBehaviorOptions` zu `StageProjection`-Tagged-Union (`"flat-plane"` |
  `"custom"`) gemacht; `flakturm-tunnel` läuft jetzt über `"flat-plane"`, `character-diorama`
  bleibt `"custom"` (seine Formel mappt v→Weltraum-Z statt v→Y, passt nicht ins
  flat-plane-Schema). `static inspector` für `StageMovementBehavior` ergänzt.
  - Verifiziert: `tsc`/`eslint`/`vitest` (750/750, 6 neue Tests) grün, `npm run build` grün,
    Flakturm-Tunnel live im Browser geprüft (Position/Skalierung unverändert korrekt).
  - **Nächster Schritt:** Phase 1 (glTF-Format: Extension-Registry + `SW_stage_zone`).

## 2026-09-12 — Nachlauf zur Workspaces-Migration: Hub-Seite, Docs-Port, absolute Pfade, v0.78.00

- ✅ **`public/index.html` neu gegliedert** in 4 klar getrennte Abschnitte (User-Vorgabe: Einstieg,
  Showcases, Tools, Apps) statt Apps und Showcases in einem gemeinsamen Grid zu vermischen. Der
  seit langem sinnlos gewordene Untertitel "System Initialization // Engine Diagnostics" ersetzt
  durch "Showcase & Development Hub". Live im Browser geprüft (alle 4 Abschnitte sichtbar, keine
  Konsolenfehler).
- ✅ **Portkonflikt `docs:dev` vs. Haupt-Dev-Server behoben.** VitePress bindet standardmäßig auch
  auf 5173 und hatte beim Start den Haupt-Engine-Server (HTTPS-Multiplexer) stillschweigend
  verdrängt — derselbe Fehlerklasse-Vorfall wie schon einmal früher in dieser Session, diesmal aber
  dauerhaft behoben statt nur einmalig durch Kill+Neustart: `docs:dev`-Script fest auf
  `--port 5174` gesetzt. Beide Server danach parallel verifiziert (5173 HTTPS grün, 5174 HTTP grün).
- ✅ **Alle hartkodierten `file:///Users/...`-Pfade entfernt** (User-Korrektur: "dürfen niemals
  vorkommen") — 131 in `apps/and-now/docs/log.md` (inkl. eines eigenen frisch geschriebenen
  Log-Eintrags), 8 in `CHANGELOG.md`, 2 in `.agents/skills/character-pipeline/SKILL.md`. Nur das
  absolute Maschinen-Präfix entfernt, historischer Pfadinhalt in alten Einträgen bewusst
  unangetastet gelassen (Unterscheidung: Pfad-*Leck* immer fixen, historischen Pfad-*Inhalt* nicht
  rückwirkend umschreiben). Als Feedback-Memory gespeichert, damit das künftig nicht wieder passiert.
- ✅ **Version-Bump auf 0.78.00**, Changelog-Eintrag (Quote: Robert Frost, "Good fences make good
  neighbors" — passend zur Engine/Apps-Grenzregel), Tag `v0.78.00`, Commit + Push.

## 2026-09-12 — npm-Workspaces-Monorepo: `packages/engine` + `apps/*` eingeführt

- ✅ **Strukturelle Weichenstellung umgesetzt** (User: "wichtige Weichen für die Zukunft legen und
  nicht in einem Monat alles umbauen"), ausgelöst durch die Frage, wie die Flakturm-Tunnel-Szene im
  Maker editierbar werden soll (braucht ADR-0016-Code, siehe unten). Entscheidung per
  AskUserQuestion: npm-Workspaces statt neues Repository oder reine Lint-Regel; erst Struktur, dann
  Maker-Arbeit.
  - `src/` aufgelöst: Engine-Code (core, environment, behaviors, geometry, math, physix, renderers,
    audio, enums, interfaces, loaders, utils, tools, global.d.ts, presentation.ts) →
    `packages/engine/src/`, eigenes Package `@small-world/engine` mit
    `exports: {".": "./src/index.ts", "./*": "./src/*"}` (Apps importieren nur noch per
    Package-Name, nie mehr über relative Pfade, die den Package-Root verlassen).
  - Die drei Apps (`and-now`, `yad`, `light-cycle-arena`) → `apps/*`, je eigenes Package
    (`@small-world/and-now` usw.), `dependencies: {"@small-world/engine": "*"}`.
  - Bonus (User-Idee mid-flight): `showcases/yad/` und `showcases/light-cycle-arena/` (HTML +
    Assets) ebenfalls nach `apps/yad/` bzw. `apps/light-cycle-arena/` verschoben, damit sie wie
    `and-now` konsistent bei ihrem eigenen App-Package liegen statt in den generischen
    Engine-Showcases.
  - Neue ESLint-Grenzregel (`no-restricted-imports` in einem eigenen Config-Block nur für
    `packages/engine/**`, NICHT `import/no-restricted-paths`): verbietet jeden Import aus `apps/`
    in die Engine. **Wichtiger Lernpunkt:** `import/no-restricted-paths` hätte einen TS-Resolver
    gebraucht, um unsere `.js`-Importspezifizierer (mappen via `moduleResolution: "Bundler"` auf
    `.ts`-Dateien) aufzulösen — probeweise mit `eslint-import-resolver-typescript` installiert,
    dabei sofort 2018 neue `import/extensions`-Fehler repo-weit ausgelöst (ein Resolver macht diese
    Regel strenger: erwartet dann die tatsächliche `.ts`-Endung statt der geschriebenen `.js`).
    Wieder deinstalliert, stattdessen die Core-ESLint-Regel `no-restricted-imports` mit reiner
    String-Muster-Prüfung auf dem geschriebenen Importpfad verwendet — braucht keine Auflösung,
    funktioniert zuverlässig (mit echtem Verstoß getestet, schlägt korrekt fehl).
  - 42 `showcases/*.ts`-Dateien hatten ebenfalls relative Importe auf das alte `src/` (nicht nur die
    3 Apps) — per Skript korrigiert (`../` -Tiefe unverändert, nur `packages/engine/` vor `src/`
    eingefügt). `vite.config.ts`, `vite.lib.config.ts` (jetzt bei `packages/engine/`, `outDir`
    korrigiert), `tsconfig.json`/neues `tsconfig.base.json`, `typedoc.json`,
    `scripts/update-version.js`, `.husky/pre-commit`, `scripts/check-showcases.js` (yad-URL jetzt
    `apps/yad/...`), `public/index.html`-Links, mehrere `public/tools/*.html`-Inline-Importe — alle
    nachgezogen.
  - ADR 0014/0015 und `.agents/notes/app-docs-convention.md`/`AGENTS.md` bekamen "Update"-Notizen
    zur neuen Struktur, ohne die historische Begründung zu überschreiben.
  - Verifiziert: `npx tsc --noEmit` grün, `npx eslint .` grün (inkl. Grenzregel-Test), `npx vitest
    run` 744/744 grün (4 Testdateien mit hartkodierten `src/`-Pfaden gefixt), `npm run build`
    (Showcases + Lib) grün, `git status` bestätigt saubere Renames (781 R, keine verlorenen
    Dateien). Live im Browser geprüft: Flakturm-Tunnel, YAD, Light Cycle Arena, Maker-Editor,
    Showcase 1 — alle ohne Konsolenfehler.
  - **Noch offen (nächster Schritt, separat):** ADR-0016-Code (StagePoint2D-Verallgemeinerung,
    `SW_stage_zone`-glTF-Extension, Maker-UI), damit die Flakturm-Szene tatsächlich im Maker
    geöffnet/bearbeitet/gespeichert werden kann — das war das ursprüngliche Ziel, das zu dieser
    Strukturfrage geführt hat.
  - Noch NICHT umgesetzt (User hat nur diese Struktur besprochen, nicht zusätzlich beauftragt):
    "Showcases (1-36) ebenfalls auslagern" — als eigene Idee mid-flight genannt, bewusst auf einen
    späteren, separaten Schritt verschoben.
  - → **Update selbes Datum:** User wies zu Recht darauf hin, dass `docs/` dadurch punktuell
    veraltet ist (v. a. Pfad-Beispiele). Sweep über alle `docs/**/*.md` durchgeführt: aktive
    Referenzdokumente (ADR 0007/0009/0010/0014/0015, Guides adding-materials/custom-game/
    extensions/forge/map-generator/xtractor, research/oil-puddle-shader-technique) auf
    `packages/engine/src/...`/`apps/...` aktualisiert. Datierte Audit-Snapshots
    (`research/codebase-review-2026-08-22.md`, `research/showcase-feature-audit.md`,
    Teile von `research/aaa-engine-techniques.md` zu bereits gelöschten Apps) bewusst NICHT
    umgeschrieben — bekamen stattdessen eine kurze Hinweis-Notiz, konsistent mit der bereits
    etablierten Praxis dieser Session (Status-Notiz statt Verlust der historischen Genauigkeit).
    `docs/public/api/` (272 committete TypeDoc-generierte HTML-Dateien) nicht von Hand editiert,
    sondern per `npm run docs:api` neu generiert — Quell-Links zeigen jetzt korrekt auf
    `packages/engine/src/...`.

## 2026-09-11 — And Now?: Flakturm-Tunnel — Figur unlit, Treppe-Runter-Clip weiterhin kurz

- ✅ **„Figur könnte etwas mehr Licht vertragen" — echter Root Cause gefunden, kein reiner
  Geschmacks-Tweak.** `_loadCharacter()`s `applyMaterialToHierarchy()` ersetzte JEDES Material der
  Figur durch `BasicMaterial` — ein komplett **unlit** Material (`fragColor = u_color * texColor`,
  keine einzige Lichtberechnung im Shader). Damit hatten `AmbientLight`, `DirectionalLight` und
  sogar die eigene Laternen-`PointLight` der Figur **null Wirkung** auf die Figur, egal wie man an
  den Licht-Intensitäten dreht — sie zeigte immer nur ihre rohe Textur-Farbe. Der gemalte
  Hintergrund ist bewusst genauso `BasicMaterial` (richtig so, 2D-Kunst braucht keine 3D-Beleuchtung),
  aber die Figur hätte ein lit Material gebraucht.
  - **Fix:** `BasicMaterial` → `StandardMaterial` für die Figur (genau wie im Character Diorama
    beim selben Modell), `roughness: 0.92`, `metallic: 0.02` für einen matten Stoff-/Haut-Look ohne
    unerwünschten Glanz. Live geprüft: sichtbar mehr Licht/Textur auf dem Mantel, Stimmung bleibt
    dunkel-atmosphärisch, keine Glanz-Artefakte, Bein-Sichtbarkeits-Fix weiterhin unberührt.
  - `tsc` grün.
- 📋 **„Treppe runter wirkt kurz/zuckend" — Speed-Fix behebt das NICHT, weiterhin offen.**
  Wichtige Klarstellung: Bewegungsgeschwindigkeit und Animations-Abspielgeschwindigkeit sind im
  Code komplett getrennt (`_mixer.update(deltaTime)` läuft immer in Echtzeit). Der `stairs_down`-
  Clip ist weiterhin nur **0.375s** lang (siehe 2026-09-10-Eintrag) und zyklisiert entsprechend oft,
  unabhängig vom `speed`-Wert der Bewegung. Braucht einen eigenen Blick auf den Animations-Clip
  selbst (verlängern/neu einspielen), nicht an der Bewegungslogik.

Status: Material-Fix umgesetzt, `tsc` grün, noch **nicht committed**. `stairs_down`-Clip-Länge
weiterhin offen.

---

## 2026-09-10 — And Now?: Szene-2-Review (Flakturm-Tunnel Bewegung & Animation)

User-Kritik am Flakturm-Tunnel (5 vage Punkte), gegengecheckt per Live-Simulation im Browser
(direkter Zugriff auf `_movementBehavior`/`_loop` statt echter Tastatureingabe, um Distanzen und
Zeiten exakt zu messen). Ergebnis: zwei Punkte sind klar code-/daten-bestätigt, zwei sind eher
Content-/Kalibrierungsfragen als Bugs, einer bleibt offen für den gemeinsamen Blick.

- ✅ **„Figur ist viel zu schnell" — bestätigt, mit Zahlen, und angepasst.** Bei reinem Gehen
  (kein Shift/Run) legte die Figur in 2 simulierten Sekunden ~0.137 von 1.0 normierten
  Stage-Einheiten zurück (grob eine ganze Zonenbreite); die komplette Treppe (`zone_c`, ~13
  Stufen) wurde im GEH-Tempo (nicht einmal Rennen) in ca. 1.3 Sekunden erklommen.
  `StageMovementBehavior`s `speed` (Datei `flakturm-tunnel/showcase.ts`) ist der einzige Hebel
  dafür. → Update 2026-09-10: User hat `0.15` → `0.06` → `0.09` live durchgetestet (bei `0.06`
  gemessen: komplette Treppe jetzt ~2.9s statt ~1.3s); **`0.09` als aktueller Wert bestätigt** —
  Nutzer berichtet, bei diesem Tempo werden erstmals echte Beinbewegungen erkennbar statt reinem
  Zucken. Damit erledigt, außer weiteres Feintuning wird gewünscht.
- 📋 **„Keine sichtbare Treppenanimation" — die Animation IST korrekt aktiv, aber vermutlich zu
  kurz sichtbar.** `_resolveDesiredAnimation()` wählt `stairs_up`/`stairs_down` zuverlässig,
  live verifiziert (ganze Treppe durchgehend `stairs_up` aktiv). Die wahrscheinlichste Erklärung
  fürs "nicht wahrnehmbar": Bei ~1.3s Gesamt-Treppenzeit und einer 1.33s-Clip-Länge sieht man
  praktisch keinen vollen Zyklus, bevor man oben ist — hängt direkt am Tempo-Punkt oben.
  💡 Zusatzfund: `stairs_down` ist mit **0.375s** Cliplänge auffällig kurz gegenüber `stairs_up`
  (1.33s) und allen anderen Clips (0.67–1.08s) — das würde beim Runtergehen selbst bei normalem
  Tempo wie hektisches Zucken aussehen, unabhängig vom Geschwindigkeits-Fix. Asset-seitig prüfen.
- 💡 **„Grenzen der Bewegungsflächen werden nicht eingehalten" — Clamping-Code selbst ist korrekt,
  vermutlich Diskrepanz zwischen gezeichneter Zone und gemaltem Hintergrund.**
  `StageMovementBehavior._resolveMove()` klemmt Bewegung nachweislich hart auf die definierten
  Zonen-Polygone (live getestet: an `zone_c`s oberster Ecke lässt sich die Figur trotz gehaltener
  Taste keinen Millimeter weiterbewegen). Wenn die Figur im Spielgefühl trotzdem über den
  gemalten Boden hinausläuft, liegt das vermutlich an zu großzügig gezogenen Zonen-Polygonen
  (`DEFAULT_ZONE_POINTS` in `flakturm-tunnel/showcase.ts`) relativ zur Hintergrundkunst, nicht an
  der Kollisionslogik. Braucht visuellen Abgleich Zone-Overlay vs. Kunst (Bühnen-Editor via
  Taste `[E]` zeigt die Polygone) statt Code-Fix.
- 💡 **„Figur am oberen Treppenende zu klein" — ist absichtliche erzwungene Perspektive, evtl. zu
  aggressiv kalibriert.** `zone_c`s oberster Punkt hat `scale: 0.5`, `zone_b`s tiefster Punkt
  sogar `scale: 0.3` (Faktor 2–3.3× kleiner als normal) — kein Bug, sondern bewusst gesetzte
  Tiefenwirkungs-Werte. Eventuell zu stark; gemeinsam am Bühnen-Editor neu austarieren statt
  einseitig „reparieren".
- ✅ **„Keine wirklich menschlichen Animationen, eher ein Zucken" — größtenteils durch den
  Tempo-Fix behoben.** Geprüft und verworfen als Ursache: (a) `_playAnimation()` restartet
  denselben Clip nicht wiederholt (der `name === activeAnimation`-Guard greift korrekt); (b) die
  ungefilterte `mixamorig:Hips`-Translation-Spur (anders als im Diorama, das sie explizit
  herausfiltert) ist zwar ein echter Unterschied zwischen den beiden Szenen, aber mit ~4cm
  Welt-Raum-Amplitude (Y) vermutlich zu klein, um allein "Zucken" zu erklären. → Update
  2026-09-10: Bestätigt — nach dem Tempo-Fix auf `0.09` berichtet der Nutzer erstmals erkennbare
  Beinbewegungen. Der extrem kurze `stairs_down`-Clip (0.375s, siehe oben) bleibt als separater,
  ungeprüfter Rest-Verdacht für Zucken speziell beim Treppe-Runtergehen stehen.
- ✅ **„Beim seitlichen Laufen/Rücken-zur-Kamera fehlt ein Bein" — geklärt (reine geometrische
  Selbstverdeckung, kein Mesh-/Rig-/Culling-Bug) UND im Flakturm-Tunnel per Start-Rotations-Nudge
  entschärft.** Bewusst chronologisch dokumentiert statt überschrieben, weil sich der Stand
  mehrfach geändert hat:
  1. Ursprünglich (2026-09-10) in zwei Szenen anhand eigener, sehr dunkel gerenderter Screenshots
     "bestätigt" (Flakturm-Tunnel `idle_torch` von hinten, dann Character Diorama gegengecheckt).
  2. User widersprach anhand `img_6.png` (per Pointer-Lock gedreht, heller): beide Beine sichtbar
     → Befund als "Fehlschluss durch Dunkelheit" zurückgezogen.
  3. Vereinbartes Protokoll: für reine Sichtbarkeits-Fragen Szene testweise aufhellen
     (Licht-Intensität × 5) statt raten.
  4. User meldete live (ohne Zoom, normale Ansicht): bei großer Figur trotzdem kein linkes Bein
     sichtbar — und lieferte `img_7.png` als Beleg (`idle_torch`, `t=2.97s`, `HINTEN 180°`).
  5. **Systematische Abtastung mit aufgehellter Szene bei exakt `rotation.y = π`** (derselbe
     Blickwinkel), 4 Zeitpunkte über den kompletten 6.33s-`idle_torch`-Loop verteilt (t≈0, 3.8s,
     4.8s, 5.8s): **bei allen 4 Stichproben fehlt das linke Bein sichtbar**, konsistent. Der
     frühere "beide Beine sichtbar"-Fund (Schritt 1) war offenbar ein einzelner,
     nicht-repräsentativer Frame, keine verlässliche Momentaufnahme des überwiegenden Zustands.
  6. **3/4-Rücken-Winkel systematisch nachgezogen** (Character Diorama, Kamera per Orbit ~58° aus
     der direkten Rückansicht gedreht, Figur-Rotation unverändert bei Standard `-0.5`), wieder
     5 Zeitpunkte über den vollen 6.33s-Loop verteilt (t≈0, 1.5s, 3s, 4.5s, 6s): **bei allen 5
     Stichproben sind beide Beine klar sichtbar**, kein einziger Aussetzer.
  7. User vermutete danach einen versteckten Engine-Hack/Fix im Showcase-Code (Frustum-/
     Occlusion-Culling, Tiefenberechnung — Anlass: jüngere Engine-Eingriffe in genau diesem
     Bereich). Gezielt gegengeprüft statt geraten: `flakturm-tunnel/showcase.ts` selbst enthält
     keine Leg-/Culling-Sonderlogik (grep negativ). Frustum-Culling für den Charakter hart auf
     "immer sichtbar" erzwungen (`inFrustum = true` auf jedem Kind-Objekt, jeden Frame) — Bein
     bleibt trotzdem unsichtbar, also kein Frustum-Cull-Bug. HZB-Occlusion-Culling ist für diese
     Szene gar nicht aktiviert (`config.enableOcclusionCulling` nicht gesetzt) — kommt als Ursache
     also gar nicht in Frage. Fuß-Bones direkt über die echte Kamera-View-Projection-Matrix in
     Bildschirmkoordinaten projiziert: linker und rechter Fuß liegen bei `rotation.y = π` nur
     ~16px auseinander (bei 1512px Canvas-Breite), rechter Fuß geometrisch näher an der Kamera —
     ausreichend, um sich bei normaler Tiefenprüfung (Z-Buffer) gegenseitig zu überdecken.
  8. **User hat den 6×-vergrößerten, aufgehellten, Culling-erzwungenen Screenshot direkt
     gegengecheckt und bestätigt: nur ein Bein sichtbar, links vom Stiefel nichts.** Damit
     stimmen Technik-Befund und Nutzer-Beobachtung jetzt überein.
  **Zwischenstand (von beiden Seiten bestätigt):** Kein Mantel-/Mesh-Problem, kein Culling-Bug,
  kein versteckter Engine-Hack — reine geometrische Selbstverdeckung: Nur wenn die Kamera exakt in
  einer Linie mit dem Beinstand steht, liegt ein Bein optisch hinter dem anderen.
  9. **Wichtige Korrektur der Einschätzung "fällt im normalen Spielgefühl kaum auf":** Kamera-Setup
     beider Szenen verglichen. Character Diorama: `HYBRID_SYNC`-Strategie + `OrbitController`,
     Kamera vom Spieler frei orbit-/pan-/zoombar (Zoom = Dolly am Radius, kein FOV-Wechsel) — die
     kritische Achse lässt sich praktisch immer umgehen. Flakturm-Tunnel: **keine Strategie
     gesetzt, kein OrbitController, Kamera wird in `setupScene()` einmalig positioniert und nie
     wieder verändert** — komplett fix für die ganze Session. Zusätzlich nutzt `_uvToWorld()` dort
     bewusst `z: BACKGROUND_Z` (immer 0) — die Bühnentiefe wird nur über Skalierung vorgetäuscht,
     nicht über echte Z-Bewegung (dokumentierte Vereinfachung fürs 2.5D-System). Die Figur startet
     zudem laut `startFacing: "back"` **exakt** in der kritischen Blickrichtung. Damit ist der
     Effekt im Flakturm-Tunnel kein seltener Rand-Fall, sondern **bei jedem einzelnen
     Szenenstart garantiert exakt gleich sichtbar** — anders als im Diorama.
  10. User hat das im echten Spiel (kein Zoom-Trick, eigener Browser-Zoom) an der Standard-
      Startposition nachgestellt: `img_9.png`/`img_10.png` zeigen eindeutig, sauber beleuchtet
      genug: **linkes Bein komplett nicht vorhanden**, keine Verblassung, kein Schatten-Rest.
      Deckt sich exakt mit dem technischen Befund — bestätigt an der echten Default-Ansicht.
  11. **Fix umgesetzt:** `StageMovementBehavior` bekommt eine neue, rein kosmetische Option
      `startFacingNudge` (zusätzliche Radiant nur auf die initiale Blickrichtung, rührt nichts an
      der Bewegungs-/Rotationslogik an). In `flakturm-tunnel/showcase.ts` auf `0.14` (~8°) gesetzt
      — die Start-Ausrichtung weicht jetzt absichtlich leicht von der exakten Kamera-Achse ab.
      Live verifiziert (aufgehellt, 4×-Vergrößerung, Bewegung deaktiviert): beide Beine an der
      neuen Standard-Startposition klar getrennt sichtbar. `npx tsc --noEmit` grün.
  💡 **Lektion (bestätigt, jetzt mit Nachdruck):** eine einzelne Stichprobe — egal wie hell oder
  wie genau positioniert — beweist bei einer über Zeit laufenden Animation nichts. Mehrere
  Zeitpunkte über den vollen Loop abtasten, bevor irgendetwas als "bestätigt" oder "widerlegt"
  gilt. Das gilt für mich genauso wie für einen einzelnen User-Screenshot. Und: die Kamera-
  Beweglichkeit einer Szene ist Teil der Bug-Bewertung, nicht nur die reine Geometrie — derselbe
  geometrische Effekt kann in einer Szene irrelevant und in einer anderen garantiert sichtbar sein.

Status: Speed-Fix (`0.09`) und `startFacingNudge`-Fix (`0.14` rad in `flakturm-tunnel/showcase.ts`,
neue Option in `StageMovementBehavior`) umgesetzt, `tsc` grün, noch **nicht committed/gepusht**.
Zonen-Grenzen- und Skalierungs-Punkte weiterhin offen für gemeinsamen Blick im Bühnen-Editor.

---

## 2026-09-09/10 — And Now?: Laternen-Griff-Bug (Diorama & Flakturm-Tunnel)

Nutzer-gemeldeter Bug: Laterne hängt bei manchen Figuren/Ansichten nicht in der Hand. Drei
unabhängige Ursachen gefunden und gefixt, vollständige Herleitung in
[`src/apps/and-now/docs/log.md`](../../src/apps/and-now/docs/log.md) Einträge 101–103.

- ✅ **Yoshi (Easter-Egg-Charakter) hielt die Laterne nicht.** Ursprünglich fälschlich als
  kaputtes Auto-Rig diagnostiziert (Messung im Bind-Pose-Frame vor Animations-Blend); echter
  Bone-Dump nach korrektem Posieren zeigte, dass sein Hand-Bone sauber funktioniert. Nutzt jetzt
  denselben generischen Bone-Tracking-Pfad wie Männlich/Weiblich, kein Sonderfall mehr nötig.
- ✅ **`character-diorama`: Laterne am falschen Parent-Objekt.** `_lanternGroup` hing an
  `_dioramaRoot` statt am echten `scene`-Root; da der Sync-Code immer eine Welt-Position setzt,
  driftete die Laterne, sobald `_dioramaRoot` rotiert wurde (z. B. durch die Turntable-Funktion)
  — unsichtbar in der Standardansicht, daher zunächst übersehen. Eine Zeile Fix, über
  360°-Rotations-Sweep verifiziert.
  💡 **Lektion für künftige Sessions:** ein "gefixt"-Befund, der nur am Standard-Kamerawinkel
  geprüft wurde, ist kein vollständiger Beweis, wenn das betroffene Objekt an einem rotierbaren
  Parent hängt — explizit die Rotation durchspielen.
- ✅ **`character-diorama`/`flakturm-tunnel`: männliche/weibliche Figur bereits korrekt**, keine
  Änderung nötig.

Status: `npx tsc --noEmit` grün, live in beiden Szenen für alle drei Figuren nutzerbestätigt.

---

## 2026-09-08 — Showcase-29-Debug-Session (WebGPU-Artefakt & WebGL2-Cluster-Fix)

Entstanden während der Jagd nach grün/blauen Block-Artefakten auf den Sponza-Vorhängen
(Showcase 29, WebGPU) und der Überprüfung des parallel laufenden WebGL2-Cluster-Lighting-Fixes.

- 📋 **WebGPU: grün/blaues Block-Artefakt — Root Cause weiterhin offen.** Metallic-/
  Roughness-Texturinhalt erscheint roh als Vorhang-Farbe. Live ausgeschlossen: Per-Frame-Textur-
  Churn in `GPUTextureResourceCache.acquireTextures` (separater, echter Bug — ✅ siehe unten),
  Mipmap-Generierung (deaktiviert → Block bleibt), Cross-Textur-Upload-Race (vollständig
  serialisierte Uploads mit `device.queue.onSubmittedWorkDone()`-Barrieren zwischen allen 74
  Texturen → Block bleibt unverändert, **diese Richtung nicht nochmal versuchen**), Aliasing im
  Texture-View-Cache (1:1-Zuordnung verifiziert). Bindgroup-Instrumentierung zeigt zur Draw-Zeit
  durchgehend korrekte Texturreferenzen. Dokumentiert als Kommentar im Klassendoc von
  `GPUTextureResourceCache.ts`.
  💡 Idee dazu: echtes GPU-Capture-Tool ranziehen (Chrome WebGPU-Tracing, Dawn-Debug-Layer /
  RenderDoc-artiges Tooling) — JS-Konsolen-Instrumentierung ist an ihrer Grenze.

- ✅ **WebGPU-Textur-Lifecycle: zwei echte Bugs gefixt.** `acquireTextures` mergte Manifeste
  fälschlich statt sie zusammenzuführen (spurious release+recreate über Passes hinweg);
  `DepthPrePassGPU` nutzte ein nie aktualisiertes, geteiltes `DepthMaterial` ohne echtes
  Alpha-Cutout pro Objekt. Live verifiziert: GPU-Textur-View wird jetzt einmalig erstellt und
  bleibt stabil (vorher: neu bei jedem Frame). Commit `94d317ad` «Nothing is lost, nothing is
  created, everything is transformed.»

- ✅ **WebGL2-Cluster-Lighting: Unit-14-Kollision gefixt.** Cluster-Grid teilte sich Unit 14 mit
  `_RAW_DEPTH_UNIT` (PCSS-Rohtiefe) — stille Daten-Korruption bei gleichzeitig aktivem
  Directional-PCSS-Schatten + Cluster-Lighting. `CLUSTER_GRID_UNIT`/`CLUSTER_INDEX_UNIT` auf
  15/16 verschoben, `WebGLClusterCullPass` bekam dieselbe Bounds-Absicherung wie der bestehende
  Schatten-Code (Warnung statt Korruption). Live verifiziert. Commit `eef5804e` «Nothing can be
  truly correct until it holds together as a whole.»
  📋 **Grundproblem bleibt:** Auf dieser Maschine ist `MAX_TEXTURE_IMAGE_UNITS` real nur 16 (das
  garantierte Minimum). Schatten (6) + PCSS-Rohtiefe (1) + Cluster (2) = 9 reservierte Einheiten
  (Bereich 8–16) passen nicht mehr in 0–15 → Cluster-Index-Textur bleibt unbelegt →
  Punkt-/Spot-Lichter (Laternen, GI-Bounce) rendern auf 16-Unit-Hardware nicht mehr über das
  Cluster-System (Boden bleibt dunkel). Keine Regression (vorher still korrupt, jetzt sauber
  degradiert), aber ungelöst.
  💡 Idee dazu: eine weitere Einheit einsparen — z. B. Schatten-Dummy-Fallback (Unit 13)
  eliminieren, oder PCSS-Rohtiefe-Read über denselben Sampler wie die Vergleichs-Shadow-Map
  lösen statt einer eigenen Unit.

- ❌ **Showcase 29 — HUD als 300-Zeilen-`innerHTML`/CSS-Template-String direkt in `showcase.ts`
  refactoren.** Funktioniert, Wartbarkeits-Geschmackssache, aber bewusst nicht angefasst —
  reine Stilfrage, kein Fehler.

- 💡 **Showcase 29 — globaler Albedo-Boost** (`obj.material.color = new Color(1.18, 1.1,
  0.98)`) wird pauschal auf *jedes* Sponza-Material angewendet, unabhängig von dessen eigener
  Helligkeit. Bei aktivem ACES-Tonemapping legitim, aber Risiko für Ausbrennen/Clipping auf
  bereits hellen Flächen (z. B. Travertin-Wände). Nur beobachtet, nicht verifiziert oder
  angepasst.

- 📋 **Verifikations-Lücke:** Für den WebGL2-Fix wurde nur der schmale
  `tests/renderers/WebGL2ClusterBindings.test.ts` ausgeführt (grün) — nicht die volle Suite
  (`npm run test`) oder `npm run build:lib`.

- 📋 **Verifikations-Lücke:** Showcase-29-Minifixes (Docstring, God-Ray-Update-Skip) nur per
  `tsc --noEmit` geprüft, nicht live im Browser re-verifiziert nach der Unit-14-Änderung.

- ✅ **Showcase 29 — Docstring korrigiert** (God Rays sind jetzt standardmäßig aus, war nicht
  dokumentiert) und **God-Ray-Flicker-Loop übersprungen, wenn Gruppe unsichtbar** (unnötige
  Arbeit pro Frame). Beides Teil von Commit `eef5804e`.

- ✅ **AO/PostProcess HBAO — WGSL-NaN-Guards nachgezogen.** Die zu Sessionbeginn bereits im
  Working Tree liegenden GLSL-NaN-Guards (`AO.frag.glsl`, `PostProcess.frag.glsl`) waren
  korrekt und vollständig; hart geprüft zeigte sich aber, dass die WGSL-Portierung
  (`AO.frag.wgsl`, `PostProcess.frag.wgsl`) unvollständig war — `isnan()`/`isinf()` existieren
  praktisch nicht mehr als WGSL-Builtins (aus der Spec entfernt, deshalb sonst nirgends im
  Projekt verwendet), daher wurden zwei der drei Guards beim Portieren schlicht weggelassen.
  `max()`/`clamp()` haben in WGSL bei NaN-Eingabe laut Spec undefiniertes Verhalten — der exakt
  selbe Bug, den GLSL verhindert, konnte auf WebGPU also weiterhin unbehandelt auftreten.
  Fix: portabler NaN-Check via Selbstungleichheit (`x != x`) an den fehlenden Stellen ergänzt;
  `Inf` brauchte keinen Extra-Check, da IEEE754-Ordnung dafür wohldefiniert ist und das
  bestehende `clamp()` es schon korrekt abfängt. Live auf WebGPU und WebGL2 verifiziert (HBAO
  aktiv, keine Artefakte, Konsole sauber). Commit `705fe005` «The same law applies everywhere,
  whether or not anyone is watching to enforce it.»

- ✅ **Flakturm-Tunnel — Zone C (Treppe) linke Kante lag neben statt auf der gemalten Treppe.**
  Ausgangspunkt: User-Hypothese, dass ein sauber gezogener Wegbereich unter dieser (rollwinkel-
  freien) Kamera entweder aus 2 waagerechten + 2 Fluchtlinien-Kanten bestehen sollte (flacher
  Boden, z. B. Zone A/B) oder — bei einem im Raum gedrehten Rechteck wie einer schräg
  wegführenden Treppe — aus zwei eigenen Fluchtlinien-Paaren, die auf zwei unterschiedliche
  Fluchtpunkte zulaufen. Beides an den echten Zonen-Daten nachgerechnet: Zone A/B passen zum
  ersten Fall, Zone C (Treppe) korrekt zum zweiten. Die rechte Kante (Handlauf-Seite, P1→P2)
  stimmte fast exakt mit der echten Bild-Kante überein; die linke Kante (P0→P3) aber nicht —
  nachgemessen direkt im Hintergrundbild (`public/assets/and-now/flakturm_bg.webp`, Punkte A-D
  annotiert), lag P3 bei `u=0.278` sichtbar links neben der gemalten Stufenkante, im
  Schattenbereich daneben statt darauf. Fix: `P3` in `DEFAULT_ZONE_POINTS.zone_c` auf
  `u=0.305` korrigiert (v unverändert, P0/P1/P2 unverändert, da bereits korrekt). Vorher/Nachher
  visuell gegen die echte Kante verifiziert (annotiertes Bild) — Zone folgt jetzt durchgehend
  der Stufenkante statt sie zu schneiden.
  → Diese Erkenntnis (Fluchtlinien-Check pro Zonen-Kante) gehört eigentlich auch als Ergänzung
  ins neue Docs-Kapitel `docs/guides/2-5d-scenes.md` §4/§5 — noch nicht nachgezogen.
  → Update 2026-09-12: nachgezogen (§4 allgemeine Regel, §5 Schritt 7 + beide Bilder).

- ✅ **Flakturm-Tunnel — Status-HUD folgte der Figur über die Bühne** (per `worldToScreen` auf
  Kopfposition), was sie z.B. weit oben auf der Treppe teils verdeckte, wo sie ohnehin schon
  klein ist. Jetzt fix am oberen Bildschirmrand (CSS `position: fixed`), unabhängig von der
  Figurenposition. HUD zusätzlich um Live-`(u,v)`-Position und aktuelle `Skalierung` erweitert
  (dieselben Werte, die bisher nur per Konsole während der Zonen-Verifikation auslesbar waren).

- ✅ **Character-Diorama — Figur konnte sich nicht wirklich bewegen**, nur auf der Stelle drehen
  (Pfeiltasten) und Animationen abspielen (Zahlen-Tasten/Buttons), ohne dass die Position je
  aktualisiert wurde (`_playerRig.position` wurde nur einmal beim Laden gesetzt). Jetzt echte
  `StageMovementBehavior`+`StageZone`-Bewegung über den ganzen begehbaren Boden (±1.9 Welteinheiten,
  Marge zu den Wänden bei ±2.1), `scale: 1.0` durchgehend (echte 3D-Tiefe über die frei orbitende
  Kamera, keine erzwungene Perspektive nötig — siehe `docs/guides/2-5d-scenes.md` §3 "Doesn't
  apply"-Fall). Bestehende Pfeiltasten-Drehung blieb erhalten, aber jetzt hinter SHIFT verschoben
  (`SHIFT`+Pfeil = drehen, sonst WASD/Pfeil = laufen), sonst hätten sich beide Systeme jeden Frame
  um `rotation.y` gestritten — dieselbe Konvention wie im Flakturm-Tunnel
  (`MANUAL_ROTATE_SPEED`). Position bleibt beim Charakterwechsel (Taste `C`) erhalten statt auf
  die Ursprungspose zurückzuspringen. Live verifiziert (manuelles Frame-Pumping): Laufen, exaktes
  Klemmen am Zonenrand (v=1.0 → z=1.9), und SHIFT-Drehung ohne Bewegungs-Konflikt.

- 📋 **Großes Vorhaben angestoßen (User-Wunsch 2026-09-12):** Maker-Editor um einen 2.5D-
  Bühnen-Authoring-Modus erweitern — Hintergrundbild importieren, Fluchtpunkte interaktiv
  bestimmen/vorberechnen (reine Schnittpunkt-Geometrie aus 2 Referenzlinien), optionales Snapping
  auf Fluchtlinien/gleiche Tiefe/waagerecht, ein szenen-bewusstes KI-Chat-Panel, neues Speicher-
  format. **ADR 0016 geschrieben** (`docs/adr/0016-2-5d-stage-zones-as-a-gltf-extension.md`):
  `SW_stage_zone`/`SW_stage_vanishing_point`-glTF-Extensions statt Parallel-Format. Auf User-
  Wunsch dabei gleich verallgemeinert: `StageZone.points` von fixem 4-Tupel auf beliebiges
  Vieleck (`StagePoint2D[]`) erweitert — Punkt-in-Polygon/Randklemmung funktionierten dafür
  schon, `getScaleAt` verallgemeinert sich zu einem Fächer aus n-2 Dreiecken (Spezialfall n=4 =
  exakt heutiges Verhalten, keine Migration nötig), `getLocalAxes()`s feste Vorwärts-Achse pro
  Zone wird durch den lokalen Gradienten des Skalierungsfelds ersetzt (funktioniert auch bei
  unregelmäßigen/konkaven Formen, keine "welche Ecke ist gegenüber"-Konvention nötig). Reiner
  Entwurf, noch keine Code-Umsetzung — nächster Schritt wäre Phase 0 (Engine-Vorarbeit) laut ADR.

- ✅ **Alle 16 ADRs auf Aktualität geprüft** (3 parallele Audit-Agenten, je gegen den echten Code
  verifiziert, nicht nur gegen den ADR-Text). Ergebnis:
  - 12/16 weiterhin exakt akkurat (0001-0007, 0010, 0012, 0013, 0015, 0016).
  - **0008** (HZB Occlusion Culling): zitierte ein inzwischen entferntes Feld
    (`FrustumCuller.lastVisibleObjects`, tot/nie korrekt genutzt) und behauptete fälschlich,
    `enableInspector: true` sei Showcase-Standard (ist `false`). Update-Vermerk ergänzt, ohne die
    historische Begründung zu löschen.
  - **0009** (Charakter-Pipeline & Mixamo): Laternen-Anbindung war komplett überholt (beschrieb
    Scene-Graph-Kind mit festem Versatz; tatsächlich seit dieser Session reines
    Weltraum-Positions-Tracking). Update-Vermerk ergänzt.
  - **0011** (Modulare Asset-Kits): Phase 2 (Out-of-Tree-Repo/LFS/CDN) und Phase 3
    (Katalog-Loader/CLI) nie umgesetzt — Assets liegen weiterhin direkt im Haupt-Repo, exakt das
    Anti-Pattern, das Phase 2 verhindern sollte. Status-Vermerke pro Phase ergänzt, `kit.json`/
    `preview.jpg`-Abweichung notiert, `GadgetInspector`-Zitat auf `Maker` korrigiert.
  - **0014** (Domänen-Schichtung): `BillboardInstancer` lag noch flach unter `src/core/`,
    `RatGroomingBehavior`/`GroomingRat` noch unter `src/core/behaviors/creatures/` statt am
    eigenen Top-Level `src/behaviors/creatures/`. **Auf User-Entscheidung hin tatsächlich
    verschoben** (Code an ADR angepasst, nicht umgekehrt): `src/core/BillboardInstancer.ts` →
    `src/core/objects/BillboardInstancer.ts`; `src/core/behaviors/creatures/*` → neues
    Top-Level-`src/behaviors/creatures/*` (neuer `src/behaviors/index.ts`-Barrel, in `src/index.ts`
    verdrahtet). Alle Imports (Barrel-Exporte, direkte Importe, 2 Test-Dateien mitverschoben)
    nachgezogen. Verifiziert: `tsc --noEmit` sauber, `eslint` sauber, volle Testsuite 744/744 grün.
  - Keine echten Konsolidierungs-Kandidaten gefunden (0004/0007 schon sauber verlinkt, 0013/0016
    geprüft und als oberflächliche statt echte Überschneidung verworfen).
