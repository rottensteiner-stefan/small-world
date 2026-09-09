# Project Log

> Lebendes, projektweites Gedächtnis für Ideen, offene Punkte und die Entscheidungen dazu — kein
> Ersatz für ein Ticket-/Backlog-Tool, sondern ein chronologisches Journal. Einträge werden nie
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
