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
