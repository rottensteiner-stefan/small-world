# Research Log — DISC WARS / THE GRID
**Projekt:** THE GRID — Neon Virus Edition  
**Log gestartet:** 2026-08-18  
**Letzte Aktualisierung:** 2026-08-18T21:00

> Dieses Dokument ist das lebende Gedächtnis des Projekts.  
> Jede Sitzung beginnt damit, diesen Stand zu lesen. Jede Entscheidung wird hier festgehalten.

---

## PROJEKT-VISION (Stand: 2026-08-18)

**THE GRID** ist ein Tron-inspiriertes Retro-Future-Universum, aufgebaut aus drei eigenständigen aber verbundenen Spielen. Nicht das sterile Disney-Blau — sondern die Ästhetik eines infizierten, korrumpierten digitalen Systems.

**Drei Sektoren:**
| Sektor | Arbeitstitel | Kern-Mechanik | Basis |
|---|---|---|---|
| 1 | **DISC WARS** | FPS Disc-Combat, Ricochets, Gegner-KI | Neubau (Neon Labyrinth als Referenz) |
| 2 | **BATTLE GRID** | 3D Light-Cycle-Arena, Battle-Royale-Stil, multiple KI | Neubau (LCA als Referenz) |
| 3 | **DATARUN** | Physik-Marble + Parkour + Rhythmus-Hindernisse | Ausbau Showcase 23 |

**Meta-System:** "Programm-Rang" — localStorage-basierter Prestige-Score, sektorübergreifend.

**Farbpalette (Neon Virus):**
- `#020408` — Void (Hintergrund)
- `#39FF14` — Grid-Grün (Primary, "Malware-Grün")
- `#CC00FF` — Seam-Magenta (Secondary, Korridor-Seams)
- `#FF0066` — Danger-Pink (Fallen, Feinde)
- `#00FFFF` — Impact-Cyan (Treffer, Explosionen)
- `#1A1A2E` — Structure (Wände, Blöcke)

---

## ENGINE-INVENTAR (Vollständig, Stand: 2026-08-18)

### Rendering
| Feature | Status | Wo genutzt |
|---|---|---|
| WebGL2 + WebGPU Hybrid | ✅ | Alle Apps |
| PBR StandardMaterial | ✅ | NL, LCA, S23 |
| CustomShaderMaterial | ✅ | S23: Scan-Wave-Boden-Shader! |
| Bloom Post-Processing | ✅ | NL, LCA |
| FrostglassMaterial | ✅ | NL |
| WireframeMaterial | ✅ | LCA |
| RetroScreenMaterial | ✅ | Noch ungenutzt für Spiele! |
| EmissivePulseBehavior | ✅ | S23, NL |
| FlickerBehavior | ✅ | — |
| TrailRendererBehavior | ✅ | S23 (Drones!), LCA |
| PlanarReflectionNode | ✅ | Ungenutzt — großes Potenzial! |
| Fog | ✅ | — |
| InstancedMesh | ✅ | LCA |
| Sprite-Billboarding | ✅ | YAD |

### Geometrien
| | |
|---|---|
| Cube, Sphere, Cylinder, Capsule | ✅ |
| Tube, Torus, Gear | ✅ |
| ExtrudeGeometry | ✅ |
| Grid, Ground | ✅ |
| Terrain + TerrainManager (LOD) | ✅ |

### Physik — WICHTIG: Robuster als gedacht!
| Feature | Status | Details |
|---|---|---|
| PhysicsSystem | ✅ | Semi-Implicit Euler, fixedTimeStep 1/60 |
| **CCD (Continuous Collision Detection)** | ✅ | Verhindert Tunneling bei schnellen Kugeln! |
| RigidBody (dynamic + static + sensor) | ✅ | Komplett in S23 genutzt |
| Restitution (Bounciness) | ✅ | S23: bumperMat restitution=1.5! |
| Fluid Volume (Auftrieb) | ✅ | |
| BoundingBox, BoundingSphere, OBB | ✅ | |
| Octree + SpatialHash | ✅ | |
| Raycaster | ✅ | |
| Collision Events (physics:collision) | ✅ | S23: Pickup + Goal via Events |

### Behaviors
| Behavior | Notizen |
|---|---|
| GridMovementBehavior | Kern LCA + S23 Drones |
| PathFollowerBehavior | Patrol-Routen |
| ProximitySensorBehavior | Trigger-Zones, Pickups |
| TrailRendererBehavior | Trails (S23 Drones nutzen es!) |
| EmissivePulseBehavior | Glowing + Shader-Time-Update |
| FlickerBehavior | Neon-Flackern |
| BobbingBehavior | Sammelitems |
| RotatorBehavior | Dekorationen |
| OscillatorBehavior | Sinus-Bewegungen |
| HoverBehavior | Schweben (S23 Start-Button!) |
| MarbleController (S23) | Physik-basierter Ball-Controller |
| DroneController (S23) | Grid+Trail kombiniert |
| FirstPersonController | FPS (NL) |
| EnemyBehavior (YAD) | Verfolgung + Kollision + SpatialAudio |
| StateMachine | FSM für KI |

### Audio
- AudioSystem: 3D Spatial HRTF, Reverb, physics:collision Events
- SynthSFX: Footstep, Shoot, Hurt, Tone, Fire, Drone
- YAD: Echte WAV-Files (playSpatial)

### Kamera
- FPS, Isometric, Orbit
- Camera Effects: SHAKE, FLASH
- Manueller Orbit in S23 (mouse.theta/phi)

---

## BESTANDSAUFNAHME DER TRON-PROJEKTE

### Neon Labyrinth (App)
- 3-Floor ProcGen Maze (21×21), FPS, Wisps, Disc-Collectibles, Exfil, Frostglass, Void Zones
- ✅ Wiederverwendbar: MazeGenerator, LevelBuilder, Controller, ImpactFlashBehavior
- ⚠️ Offen: Kein echter Kampf, KI rudimentär (nur Schubsen)

### Light Cycle Arena (App)
- Isometrisch, 1 KI, Grid-Movement, Trail-Wände, Time-Warp
- ✅ Wiederverwendbar: ArenaGrid, Cycle, CycleAI
- ⚠️ Offen: Nur 1 KI, keine Powerups

### YAD (App)
- Doom-Klon, Text-Level-Files, Sprites, Schusswaffe, EnemyBehavior mit StateMachine
- ✅ Wiederverwendbar: EnemyBehavior, LevelBuilder-Pattern, Audio-Integration
- ✅ Lektionen: StateMachine-KI funktioniert, Sprite-Billboards, playSpatial

### Showcase 23: Neon Marble Run ← NEU ENTDECKT
- PhysicsSystem mit echten RigidBodies, CCD, Restitution
- MarbleController (Kamera-relativer Force/Torque)
- DroneController (Grid + Trail kombiniert in einem Behavior!)
- CustomShaderMaterial mit Scan-Wave-Shader auf dem Boden
- Score + Timer HUD, Sensor-Collider (isSensor=true) für Pickups
- 120 Drones mit individuellen Pulsierungen
- ✅ Größter neuer Baustein: **Echte Physik ist bereits da und getestet!**

---

## REFERENZSPIELE-ANALYSE

### Was macht Tron einzigartig (abseits der Lizenz)?
1. **Grid als Spielraum** — Die Geometrie ist das Spielfeld, nicht nur Deko
2. **Identity Disc als einzige Waffe** — Einfachheit + maximale Eleganz
3. **Trails als permanente Weltveränderung** — Jede Entscheidung hinterlässt eine Spur
4. **"Du bist ein Programm"** — Tod = Derezzed (fragmentieren, nicht bluten)
5. **Void als Horror** — Kein Boden = sofortiger Tod, keine Gnade

### Tron 2.0 (2003) — Was war gut, was fehlte?
- ✅ Gut: FPS-Perspektive war richtig, Disc-Ricochets waren befriedigend, Subroutinen als Power-ups
- ❌ Fehlte: Zu linearer Levelaufbau, KI war dumm, keine Wiederspielbarkeit
- ❌ Fehlte: Kein echter Schwierigkeitsanstieg, Boss-Fights enttäuschend

### Tron: Evolution (2010) — Warum kein Hit?
- ✅ Gut: Parkour-Idee war richtig (Mirror's Edge-Feeling)
- ❌ Fehlte: Kontrolle zu schwammig, Kamera-Chaos, Story uninteressant
- ❌ Fehlte: Parkour und Kampf fühlten sich nie integriert an

### Marble It Up! / Marble Madness — Warum süchtig?
- ✅ Physik-Feedback ist unmittelbar und ehrlich
- ✅ Einfache Kontrollen = sofortiger Flow-State
- ✅ Leveldesign: Jede Sekunde eine neue Herausforderung
- ❌ Fehlte: Gegner, Spannung, Nervenkitzel
- ❌ Fehlte: Narrative, Grund warum man weiterrennt

### Super Monkey Ball — Warum so befriedigend?
- ✅ Momentum ist sichtbar und spürbar
- ✅ Bananen als Collectibles geben laufendes Feedback
- ✅ Time Limit erzeugt Druck ohne zu frustrieren

### Was haben alle Tron-Spiele verpasst?
1. **Prozedurales Leveldesign** — Kein einziges Tron-Spiel hatte ProcGen Mazes
2. **Echte physikbasierte Disc** — Ricochets immer "fake-raycast", nie echte Physik
3. **Roguelite-Loop** — Keine Spielsession die jedes Mal anders ist
4. **Verbundenes Universum** — Immer isolierte Modi, nie ein echter Übergang
5. **Web-nativ** — Kein Browser-Tron-Spiel das wirklich gut aussieht

---

## AKTUELLE ENTSCHEIDUNGEN

### Entschieden (2026-08-18, Session 1):
- ✅ Konzept: THE GRID (3 Sektoren)
- ✅ Ästhetik: Neon Virus (grün/lila/pink, nicht Tron-Blau)
- ✅ Sektor 1: DISC WARS (FPS Disc-Combat)
- ✅ Sektor 2: BATTLE GRID (3D-Arena, nicht isometrisch)
- ✅ Sektor 3: DATARUN (Physik-Marble + Parkour + Rhythmus)
- ✅ Meta: Programm-Rang (localStorage)

### Neu entschieden (2026-08-18, Session 2):
- ✅ Showcase 23 (Neon Marble Run) ist die Basis für DATARUN
- ✅ PhysicsSystem mit CCD ist robust genug für schnelle Balls UND für Disc-Physik!
- ✅ Disc-Physik: Nicht Raycaster, sondern RigidBody mit hoher Anfangsgeschwindigkeit + Restitution
  (Restitution 1.0+ = perfekter Bounce. Das macht Showcase 23 bereits mit Bumpers!)

### Entschieden (2026-08-19, Session 3):
- ✅ **Startpunkt:** DISC WARS (FPS Disc-Combat) — Sektor 1 wird zuerst gebaut
- ✅ **DATARUN-Perspektive:** Parkour/Mirror's Edge-Feeling (FPS oder Third-Person, nicht Marble-Ball)
- ✅ **Schwierigkeitsgrad:** Casual-Gleiten als Standard — spätere Umschaltoption für härteren Modus (Permadeath, enger Timer) vorgesehen
- ✅ **Levelstruktur:** Prozedurale Maze-Generierung (ProcGen) — jede Session ein neues Labyrinth
- ✅ **Disc-Trajectory-Preview:** 3 Bounces vorschauen (danach Line-Renderer endet)
- ✅ **Derezz-Fragmentierung:** Engine-Feature (kein Behavior-Workaround) — eigene Implementierung nötig
- ✅ **Ästhetik:** Flat-Emissive als Primärstil — später testweise Vergleich mit Photo-PBR möglich

> **Revisionshinweis:** Alle obigen Entscheidungen können gezielt revidiert werden.
> Vor einer Änderung hier kommentieren: Datum + Grund + neue Entscheidung.

---

## TECHNISCHE GRENZEN & LÖSUNGEN

### Grenze 1: Light-Budget (max. 4 PointLights + 4 SpotLights)
**Problem:** Viele Gegner/Fallen mit eigenem Licht = Budget-Overflow  
**Lösung:** Emissive-Material + Bloom als "fake Lights" — S23 macht das mit dem Marble-Glow!

### Grenze 2: KI-Pathfinding (kein A*)
**Problem:** Gegner können in Maze-Ecken stecken bleiben  
**Lösung:** EnemyBehavior aus YAD nutzen + Spawn-Logik die nur auf freie Zellen spawnt

### Grenze 3: Disc-Physik (Tunneling bei hoher Geschwindigkeit)
**Problem:** Schnelle Disc könnte durch Wände tunneln  
**Lösung:** CCD ist bereits in PhysicsSystem implementiert (ccdMotionThreshold)! Disc als kleines RigidBody-Sphere mit hoher Velocity — CCD schützt automatisch.

### Grenze 4: Performance bei vielen Drones/Trails
**Problem:** 120 Drones in S23 schon grenzwertig  
**Lösung:** InstancedMesh für viele gleichartige Objekte (LCA macht das für Trail-Wände)

---

## ASSET-RESEARCH (Stand: 2026-08-18)

### Bereits vorhanden (Showcase 23):
- `scifi_metal_floor.jpg` — Sci-Fi Metall-Boden
- `scifi_crate_cyan.jpg` — Cyan Bumper-Textur
- `scifi_crate_magenta.jpg` — Magenta Bumper-Textur

### Benötigt:
| Typ | Quelle | Beschreibung |
|---|---|---|
| Circuit-Board Wände | ambientCG.com (Metal Plates 015) | Schaltkreis-Optik für DISC WARS Wände |
| HDR Void Skybox | polyhaven.com | Dunkler Void mit Neon-Reflektion |
| Tron Grid Floor | ambientCG.com (Diamond Plate) | Schon in NL vorhanden! |
| Disc-Textur | Selbst erstellt (Torus + Emissive) | Kein Asset nötig |
| Synth SFX | Freesound.org | Disc-Wurf, Treffer, Power-up |
| Ambient-Musik | Generativ via SynthSFX | Drone + Arpeggios |

---

## NÄCHSTE SCHRITTE (Priorisiert)

### Sofort (nächste Session):
1. User-Entscheidung: Welcher Sektor zuerst? DISC WARS oder DATARUN?
2. Research-Ergebnisse einarbeiten (Subagent läuft gerade)
3. Asset-Download: ambientCG Circuit-Board Texturen

### Woche 1 (je nach Entscheidung):
**Option A — DISC WARS zuerst:**
- `src/apps/disc-wars/` Grundstruktur
- MazeGenerator aus NL adaptieren
- Disc als RigidBody (nicht Raycaster) — Physik-Disc!
- Neon-Virus-Palette

**Option B — DATARUN zuerst:**
- S23 aus Showcase in `src/apps/datarun/` übertragen
- Track-Generator (prozedurale Plattform-Sequenzen)
- Gegner/Hindernisse: Drones → Laser-Gates → Bumper-Fallen
- Timer + Scoring → Programm-Rang

---

*Letzte Aktualisierung: 2026-08-18T21:00 — Session 2: Showcase 23 analysiert, Physik-CCD entdeckt, Disc-Mechanik überdenken*

---

## UPDATE 2026-08-18T21:27 — Research-Subagent Ergebnisse

> Vollständiger Report: `.agents/scratches/tron-research-report.md`

### Wichtigste Erkenntnisse

#### Das unbesetzte Nischen-Segment
Kein einziges Spiel besetzt gleichzeitig:
- Tron-Authentizität (Grid als System, Disc als einzige Waffe)
- Ball-Roller/Marble-Game Gameplay
- Web-First (Browser-native)

**Das ist genau unser THE GRID.**

#### Was alle Tron-Spiele verpasst haben
1. **Kein ProcGen** — Jedes Tron-Spiel hatte handgemachte lineare Level
2. **Disc nie als Puzzle** — Immer Action-Waffe, nie Ricochet-Puzzle-Mechanik
3. **Keine Narrative für Marble-Games** — Kugel immer im generischen Void, nie in einer Welt
4. **Light-Cycles immer als Cameo** — Nie als echte Kern-Mechanik mit Tiefe
5. **Kein Web-native** — Kein Browser-Tron der wirklich gut aussieht

#### Tron: Evolution Lektion (kritisch für DATARUN)
Parkour scheiterte wegen: twitchy Kamera + unklare Orientierung + kein direktes Feedback.
**→ DATARUN Konsequenz:** Klar definierte Wall-Run-Trigger, Kamera glättet Übergänge, immer wissen wo man ist.

#### Ruiner-Inspiration: Diegetisches HUD
HUD als "System Readout" — nicht "Gesundheit", sondern "Integrität". Nicht "Leben", sondern "Instanzen".
Das HUD ist Teil der Spielwelt, nicht drübergelegt. Fragmentiert wenn man Schaden nimmt.
**→ Für alle drei Sektoren übernehmen.**

#### Tron: Uprising Ästhetik (Serienempfehlung)
Die beste Tron-Ästhetik für Indie: Stylized-Animated, nicht Realismus.
Kontrast zwischen dunklem Void und harten Neon-Kanten. Orange als Danger-Farbe, Cyan als Player-Farbe.
**→ Unsere Neon-Virus-Palette passt — nur konsequenter durchziehen.**

#### Disc-Ricochet: Trajectory Preview!
Größter neuer Designgedanke: **Vor dem Wurf einen vorhergesagten Bounce-Pfad anzeigen.**
Das macht aus Action-Gameplay ein Puzzle-Mechanic. Ermöglicht Skill-Ceiling.
Line-Renderer zeigt die ersten 2-3 Bounces. Spieler plant, dann wirft.
**→ Das unterscheidet DISC WARS von jedem anderen Tron-Spiel.**

#### Derezz-Tod statt Explosion
Tod = geometrische Fragmentierung, nicht Explosion.
Polygon-Splitter leuchten kurz auf, verschwinden.
Sound: Digitales Rauschen bricht einfach ab — keine Sterbemusik.
**→ In allen drei Sektoren einheitlich.**

### Asset-Konkretisierung

| Was | Quelle | Priorität |
|---|---|---|
| Circuit-Board Texturen | ambientCG.com + JSplacement | 🔴 Hoch |
| Sci-Fi Panel Texturen | 3dtextures.me | 🔴 Hoch |
| HDR Skybox (Void) | Prozedural (schwarzer Shader) | 🟡 Mittel |
| Disc-Wurf SFX | freesound.org CC0 (`retro sci-fi synth`) | 🔴 Hoch |
| Derezz-Tod SFX | freesound.org CC0 (`data fragment`) | 🟡 Mittel |
| UI Pack | kenney.nl Sci-Fi UI | 🟢 Niedrig |
| Kenney Space Kit (3D) | kenney.nl | 🟢 Niedrig |

### Neue Designentscheidungen (aus Research)

- ✅ **Disc-Trajectory-Preview** — Line-Renderer zeigt vorhergesagten Bounce-Pfad
- ✅ **Diegetisches HUD** — "Integrität" statt HP, "Instanzen" statt Leben
- ✅ **Derezz-Fragmentierung** — überall, kein generischer Tod
- ✅ **Tron: Uprising Ästhetik** — konsequent stylized, nicht realistisch
- ✅ **Pitch-Shift beim Bounce** — mehr Bounces = höherer Ton (prozedural mit SynthSFX)
- ✅ **Catch-Freeze-Frame** — kurzer Screen-Shake wenn Disc zurückkommt

### Offene Fragen (nach Research) — Stand 2026-08-19 geschlossen
- [x] Disc-Trajectory-Preview: **3 Bounces** → entschieden
- [x] Derezz-Fragmentierung: **Engine-Feature** (keine Workaround-Lösung) → entschieden
- [x] Tron: Uprising Stil: **Flat-Emissive** (kein Photo-PBR) → entschieden, späterer A/B-Test vorgesehen


---

*Letzte Aktualisierung: 2026-08-19T08:42 — Session 3: Alle offenen Fragen geschlossen. DISC WARS ist Sektor 1. Entwicklung beginnt.*

---

## UPDATE 2026-08-19T09:15 — Phase 1 abgeschlossen ✅

### Erstellt
| Datei | Beschreibung |
|---|---|
| `src/apps/disc-wars/Events.ts` | App-Event-Konstanten (namespaced) |
| `src/apps/disc-wars/enums/CellType.ts` | WALL, FLOOR, SPAWN, ENEMY_SPAWN, PICKUP |
| `src/apps/disc-wars/enums/ObjectTags.ts` | DISC, ENEMY, WALL, FLOOR, PICKUP, PLAYER |
| `src/apps/disc-wars/enums/GamePhase.ts` | IDLE, PLAYING, DEREZZING, GAME_OVER |
| `src/apps/disc-wars/core/MazeGenerator.ts` | Single-Floor DFS-Maze, 31×31, SPAWN+ENEMY_SPAWN Placement |
| `src/apps/disc-wars/core/LevelBuilder.ts` | Instanced Walls/Floors/Seams, Collision-Boxes, LevelObjects Return |
| `src/apps/disc-wars/core/materials/GridWallMaterial.ts` | Flat-Emissive Grid-Shader, Shockwave-Ring auf Impact |
| `src/apps/disc-wars/core/Hud.ts` | Diegetisch: Integrität/Instanzen/Disc-Status |
| `src/apps/disc-wars/App.ts` | Haupt-App, FPS-Kamera, Maze-Build, Disc-Placeholder (Torus) |
| `src/apps/disc-wars/index.ts` | Barrel-Export |
| `showcases/disc-wars/index.html` | Browser-Einstieg |
| `vite.config.ts` | `discWars` Entry registriert |

### Status
- ✅ `npm run lint:fix` — clean (2 pre-existing errors in unrelated test file)
- ✅ `npm run build:lib` — clean

### Nächste Phase
**Phase 2: Disc-Mechanik** — DiscController + DiscPhysics RigidBody

---

## UPDATE 2026-08-19T14:30 — WebGPU-Absturz behoben

`GridWallMaterial` hatte nur eine `glsl300`-Quelle mit komplett handgestrickten Uniforms
(`u_modelMatrix`/`u_viewMatrix`/`u_projectionMatrix`, eigenes `u_gridColor` etc.). Unter dem
WebGPU-Renderer (Default, wenn das Gerät ihn unterstützt) fehlte die `wgsl`-Quelle völlig →
Absturz (`Cannot read properties of undefined (reading 'replace')` in `ShaderRegistry.assemble`).

**Fix:**
- `GridWallMaterial` auf die Standard-Vertex-Pipeline umgestellt (`[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]`
  / `[BASE_VS]` / `[WGSL_STRUCTS]+[WGSL_VS]`) und nutzt jetzt `StandardWebGPULayout`
  (`u_color`, `u_specColor`, `u_extraParams`, `u_time`) statt eigener Uniform-Namen — gleiches
  Muster wie `RetroScreenMaterial`. Damit rendert es korrekt auf WebGL1/WebGL2/WebGPU.
- `WebGPURenderer._getShaderModule` wirft jetzt einen beschreibenden Fehler statt einer blinden
  `!`-Assertion, wenn eine Material-Definition keine WGSL-Quelle hat (analog zum bestehenden
  Guard in `WebGL1Renderer`/`WebGL2Renderer`).

**Verifiziert:** `tsc --noEmit` sauber, alle 348 Vitest-Tests grün, `build:lib` erfolgreich,
visuell in allen drei Renderern (`?rendererType=webgl1/webgl2/webgpu`) im Browser geprüft —
keine Konsolenfehler, Gitterwände + Disc rendern überall identisch.
