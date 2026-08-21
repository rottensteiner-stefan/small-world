# Showcase & App Feature Audit

Untersucht: alle 26 numerierten Showcases (`showcases/1` - `showcases/26`) sowie die 4
vollwertigen Apps (`src/apps/disc-wars`, `src/apps/light-cycle-arena`,
`src/apps/neon-labyrinth`, `src/apps/yad`). Ziel: welche Engine-Features (Materialien, Lichter,
Post-Processing, Geometrie, Physik, Behaviors, Kamera-Strategien) werden wo genutzt, und welche
implementierten Features werden nirgends gezeigt.

Stand: 2026-08-20.

## Feature-Matrix

| # | Fokus | Materialien | Lichter | Post-FX | Physik | Behaviors/Controller | Kamera | Besonderheit |
|---|---|---|---|---|---|---|---|---|
| 1 | Hello World | Phong, Lambert | Dir(Schatten), Amb | — | — | OrbitController | SMOOTH | einfachster Showcase |
| 2 | FPS + Zufallsboxen | Phong, Wireframe | Dir, Amb | — | — | FPS, Zoom | FPS | `Color.fromHSL` |
| 3 | OBJ-Loading | Phong(OBJ/MTL), Wireframe | Dir, Amb | — | — | Orbit | SMOOTH | UV-Offset-Farbwechsel |
| 4 | Infinite Terrain | TerrainMaterial, Phong | Dir, Amb | — | Octree | WASD | SMOOTH | `TerrainManager`-Chunking |
| 5 | Grid-Taktik | Phong, Wireframe | Dir, Amb | — | — | keine | ISOMETRIC | manuelles Grid-Snap |
| 6 | Geometrie-Galerie | Standard, Wireframe | Amb, Dir | — | Octree | FPS, Zoom | FPS | fast alle 21 Primitive |
| 7 | Skybox (Cubemap) | Skybox, Phong | Amb, Dir | — | — | FPS, Zoom | FPS | Cube-Map-Himmel |
| 8 | Skydome | Phong | Amb, Dir | — | — | FPS, Zoom | FPS | Sphären-Himmel vs. #7 |
| 9 | 2.5D Jump&Run | Phong, Basic | Amb, Dir | — | handgeschrieben (AABB) | keine | STIFF | Pixelart, kein Engine-Physics |
| 10 | Lavaschalen | Basic, World, FluidSurface | Amb, Dir, Point x2 | — | — | FPS, Zoom | FPS | `FluidSurfaceMaterial` |
| 11 | Koordinatensystem | Basic, Wireframe, Sprite | Point, Amb | — | — | Orbit | HYBRID_SYNC | Canvas-Text-Sprites |
| 12 | U-Boot-Frachtraum | Standard, Phong, Glass, OilPuddle(lokal) | Amb, Dir(CSM), Spot x3, Point | Vignette, Grain | Octree | Flicker, Proximity, Pulsating + 3 lokale | FPS | WGSL-Ripple, `GearMath` |
| 13 | PBR + glTF | Skybox, Standard | Amb, Dir x2 | Bloom | — | FPS | FPS | `GltfLoader`, erzwungenes WebGPU |
| 14 | 8x Verhörraum | Standard, Glass | Amb, Spot, Point (x8) | ToneMapping(3), Vignette, Grain, Bloom, `filterMode`(7 Looks) | — | keine | MANUAL | 8 Engine-Instanzen parallel |
| 15 | Springende Bälle | Standard, Skybox | Amb, Dir, Point | — | handgerollt | FPS | FPS | Planar+Dynamic Reflections, FSM, InstancedMesh |
| 16 | PBR-Referenz/IBL | Skybox, Standard(envMap) | Amb, Dir(Schatten), Point | — | — | FPS | FPS | volle IBL; FSM importiert aber inaktiv |
| 17 | ThreadPool (Primzahlen) | Standard | Dir | — | — | keine | — | Worker-Demo |
| 18 | ThreadPool (Terrain) | Standard | Dir | — | — | keine | — | `ModelGeometry` aus rohen Buffern |
| 19 | 1600-Cube-Grid | Standard | Amb, Dir(Schatten) | — | Octree (1600 statisch) | Hover, Draggable, Click | — | Interaktions-Stresstest |
| 20 | Tron-Ästhetik | Basic(HDR), Standard(HDR) | Amb, Dir, Spot | Bloom | — | Bobbing, Rotator, Rainbow, SpringLerp, PathFollower, LookAt, Flicker | SMOOTH+Orbit | CatmullRom-Spline, 7 Behaviors kombiniert |
| 21 | Plinko | Glass, Standard | Amb, Dir | Bloom | RigidBody+PhysicsSystem | Orbit | — | generative Musik aus Kollisionen |
| 22 | Akkretionsscheibe | Standard | Amb, Dir | Bloom + `filterMode:8` | RigidBody+PhysicsSystem (+ manuelle N-Body) | Orbit | HYBRID_SYNC | DeviceCaps-Performance-Tiers |
| 23 | Marble Run | Standard, CustomShader | Amb, Point x3 | unklar | RigidBody+PhysicsSystem (Sensor-Bodies) | Hover, Rotator, Bobbing, EmissivePulse + Marble-/DroneController | manuell | Trail-Drohnen, Pickups |
| 24 | Shader-Galerie | CustomShader x8 (Shadertoy/GLSLSandbox/ComputeToys), Wireframe | Dir x2, Amb | unklar | Raycaster | ExternalShaderUniform, FPS + 3 lokale | FPS | Laufzeit-Vertex-Verformung |
| 25 | Open Water | OpenWaterMaterial | Dir | — | — | Orbit | HYBRID_SYNC | reinste 1-Material-Demo |
| 26 | Retro-Monitor | RetroScreenMaterial | keine | — | — | Orbit | HYBRID_SYNC | `TextTexture` Live-Boot-Screen |
| disc-wars | Disc-Combat (Phase-1-Slice) | Standard, GridWallMaterial(lokal) | Amb, Spot | Bloom | Octree | EmissivePulse | FPS | Shockwave-Shader, `MazeGenerator` |
| light-cycle-arena | Tron-Duell | Standard, Wireframe | Amb | Bloom | bewusst kein PhysicsSystem (ArenaGrid) | GridMovement | ISOMETRIC | Zeitverzerrungs-Mechanik |
| neon-labyrinth | Multi-Floor-Parkour | Standard, Frostglass | Amb, Spot, Point | Bloom | Octree, handgerollt | Rotator, Bobbing, Proximity, SquashStretch + lokale | FPS | Frostglas-Sichtbarkeit, Void-Catch, Hit-Stop |
| yad | Retro-Dungeon-Shooter | Standard, Sprite, FluidSurface | Amb, Dir, Point | Quantize | SpatialHash+Collision+Raycaster | Bobbing, Proximity + EnemyBehavior | FPS+Zoom | `GridLevelBuilder`, TextureArray, 3D-Audio |

## Lückenanalyse — nie genutzte, aber fertig implementierte Engine-Features

Verifiziert per `grep` über alle 30 Showcase-/App-Verzeichnisse (nicht aus dem Gedächtnis
geraten).

- **`AreaLight`** — 0 Treffer. Einziger Licht-Typ, der in keinem einzigen Showcase/App vorkommt.
- **`FluidVolume`** (Auftrieb/Strömung/Widerstand-Physik) — 0 Treffer. Nur unit-getestet, nie
  live gezeigt (Showcase 12s Öl-Pfütze ist ein reiner Shader-Trick, keine echte `FluidVolume`).
- **`HbaoElement`** und **`TaaElement`** (Post-Processing) — 0 Treffer je. Zwei von acht
  implementierten Post-Effekten haben nie ein visuelles Beispiel.
- **`MotionTrailElement`** (Post-Processing) — 0 Treffer. Nicht zu verwechseln mit
  `TrailRendererBehavior`, das in #23 genutzt wird — das ist ein Mesh-Trail, kein
  Screen-Space-Effekt.
- **`OscillatorBehavior`** — 0 Treffer im Code (nur in Planungs-Docs erwähnt).
- **`StateMachineBehavior`** (der Behavior-Wrapper um FSM) — 0 Treffer. Die rohe `StateMachine`
  Klasse wird nur in #15 echt genutzt, in #16 importiert aber der Update-Call ist auskommentiert
  (toter Code).
- **`CameraStrategyType.FIXED`** — einzige der 7 Kamera-Strategien ohne jede Verwendung.
- **`Line`**-Geometrie — nie direkt instanziiert.
- **`Terrain`**-Geometrie-Klasse direkt — nur indirekt über `TerrainManager` (#4), nie
  standalone.
- **CCD** (Continuous Collision Detection) — nie bewusst demonstriert; ein App-Kommentar
  (`ArenaGrid.ts`) erklärt sogar explizit den Verzicht darauf.
- **`OBB`** — 0 Treffer außerhalb von Planungs-Docs.

Kein echter Gap, nur zur Einordnung: `DepthMaterial` und `SynthSFX` sind absichtlich rein intern
(Shadow-Passes bzw. `AudioSystem`-Implementierungsdetail) — die tauchen zurecht nirgends direkt
auf.

## Auffälligstes Muster

Nur 3 von 30 (Plinko #21, Akkretionsscheibe #22, Marble Run #23) nutzen überhaupt
`RigidBody`+`PhysicsSystem`. Der Rest baut Physik pro Showcase händisch nach — deshalb bekommen
CCD und `FluidVolume` praktisch keine Chance, je live zu laufen.
