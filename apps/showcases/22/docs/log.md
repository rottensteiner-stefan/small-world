# Showcase 22: Living Development Log

**Showcase:** 22 (Gargantua — Black Hole Accretion Disk & Relativistic Gravitational Lensing)  
**Primary Memory:** Entstehungsgeschichte, physikalische Herleitungen und Architektur-Evolution.

---

## 2026-09-25 — Initial CPU N-Body Prototype & Relativistisches Post-Processing

- **Initialer Aufbau:**
  - 400 einzelne `Sphere`-Meshes mit individuellen `RigidBody`-Komponenten im klassischen Szenengraphen.
  - Zentripetale Gravitation und Kepler-Bahnen mit $\mathcal{O}(N^2)$ Pairwise-Interaktionen.
  - Erste Post-Processing-Filterstufe mit Gravitationslinsen-Verzerrung und einfachem Einstein-Ring.
- **Identifizierte Engpässe:**
  - 400 separate Draw Calls und SAT-Kollisionschecks überlasteten Mobilgeräte und führten zu FPS-Drops.
  - Abruptes Verschwinden von Partikeln beim Überschreiten des Ereignishorizonts ($r < 0.4$).

---

## 2026-09-26 — Astrophysikalisches Upgrade, Spaghettisierung & Fading-Zone

- **Gravitative Rotverschiebung & Fading-Zone:**
  - Einführung einer kontinuierlichen Fading-Zone zwischen $r = 0.55$ und $r = 0.35$.
  - Partikel-Opacity dimmt sanft gegen Null; Deaktivierung von SAT-Kollisionen im inneren Trichter.
  - Shifting der Partikelfarbe in tiefes, sterbendes Dunkelrot kurz vor der Absorption.
- **Relativistisches Doppler-Beaming & Spaghettisierung im Shader:**
  - Geometrische Dehnung der UV-Koordinaten entlang des Gravitationsfallvektors ($\propto (r_{eh}/d)^3$).
  - Asymmetrisches Doppler-Beaming: Entgegenkommende Materie wird verstärkt und blauverschoben ($[0.8, 1.0, 1.4]$), abfließende Materie wird abgedunkelt und rotverschoben ($[1.2, 0.6, 0.4]$).
  - Dynamischer Einstein-Ring mit kubischem Glow-Falloff.
- **SkyDome Background:**
  - Einbindung des ESO-Milchstraßen-Panoramas ([`eso0932a.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/apps/showcases/22/assets/eso0932a.jpg)) und Eintrag in [`REFERENCES.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/REFERENCES.md).

---

## 2026-09-26 — Strategischer Architektur-Umbau & Ökosystem-Extraktion (`@small-world/vfx-extras`)

- **Paket-Extraktion:**
  - Gründung des Ökosystem-Pakets [`@small-world/vfx-extras`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/vfx-extras/) (ADR 0022).
  - Implementierung von [`ParticleMeshRenderer`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/vfx-extras/src/ParticleMeshRenderer.ts) zur GPU-Instanzierung: Tausende Partikel laufen bei 60 FPS in **1 Draw Call**.
  - Erstellung von 10 universellen Kraftfeld- und VFX-Affektoren (`PointAttractorAffector`, `VortexAffector`, `PlanarSpringAffector`, `ThermalCoolingAffector`, `FadeOutZoneAffector`, `TurbulenceAffector`, `DragAffector`, `ColorOverLifeAffector`, `SizeOverLifeAffector`, `BouncePlaneAffector`).
  - Implementierung des [`AccretionDiskEmitter`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/vfx-extras/src/AccretionDiskEmitter.ts) für gebrauchsfertige Akkretionsscheiben-Simulationen.
- **Kern-Erweiterungen:**
  - [`Color.blackbody()`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/engine/src/core/colors/Color.ts) und [`Color.fromTemperature()`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/engine/src/core/colors/Color.ts) (analytischer Planckian Locus Fit).
  - [`GravitationalLensingElement`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/engine/src/renderers/post/elements/GravitationalLensingElement.ts) mit vollständiger Shader-Parität zwischen WebGL2 und WebGPU (160-Byte-Puffer).
  - [`FollowCameraBehavior`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/engine/src/core/behaviors/FollowCameraBehavior.ts) für weiche Kameraverfolgung.
- **Showcase 22 Upgrade:**
  - Vollständiger Umbau von [`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/apps/showcases/22/showcase.ts) auf die hochdichte Instanz-Pipeline.
- **Testabdeckung & Parität:**
  - 1034 Unit- und Paritäts-Tests verifiziert.

---

## 2026-09-26 — Physics Engine: Bewegungskohärenz & Netcode-Determinismus

- **Bewegungskohärenz & Temporales Caching (`PhysicsBroadphase` & `Octree`):**
  - Fat AABBs (`fatBounds`, `fatMargin`) für Collider: Ruhende oder sich nur innerhalb der Sicherheitshülle bewegende Objekte triggern $0$ Neu-Einsortierungen/Baum-Entfernungen und $0$ Speicherallokationen (`skippedCount`).
  - Inkrementelles Entfernen (`Octree.remove`) und automatisches Kollabieren (`_tryCollapse()`) von Octree-Teilbäumen beim Entfernen oder Verschieben von Objekten.
- **Determinismus & Netcode-Pfad (`PhysicsSystem` & `Collision`):**
  - Eindeutige, kontrollierbare Entitäts-IDs (`Object3D.id`, `StaticCollider.id`, `Collidable.id`).
  - Kanonische, allokationsfreie Kollisionspaar-Deduplizierung via 64-Bit-Paarschlüssel (`idA * 4294967296 + idB`).
  - Kanonisch sortierter Solver-Durchlauf: Deterministische Simulationsergebnisse und identische Impuls-/Ereignisreihenfolge unabhängig von der Einfügereihenfolge der Objekte in der Szene.
  - Universeller `Collision.resolve(boundsA, boundsB, outResult)` Dispatcher für alle 16 Bounding-Volumen-Kombinationen.
- **Coulomb-Kontakt-Reibung (`PhysicsSystem` & `EulerIntegrator`):**
  - Echter tangentialer Reibungsimpuls $j_T = \min(|j_T^{\text{ideal}}|, \mu \cdot j_N)$ über den Coulomb-Reibungskegel.
  - Exakte Modellierung von Haftreibung (vollständiges Stoppen bei niedrigen Tangentialgeschwindigkeiten) und Gleitreibung.
  - Saubere Entkopplung von `linearDamping` (freie atmosphärische Luftreibung) und `friction` (Oberflächenreibung).


