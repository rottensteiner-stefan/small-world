# Physik & RigidBodies

Die Small World Engine enthält eine eigene, leichtgewichtige, impulsbasierte Physik-Engine, die um die **Semi-Implicit-Euler**-Integrationsmethode herum entworfen ist. Sie übernimmt Kollisionserkennung, Objekttrennung und physikalisches Abprallen (Restitution), unter strikter Einhaltung der "Zero Allocation auf dem Hot Path"-Philosophie der Engine.

## Überblick

Das Physik-System ist vollständig vom Render-Loop entkoppelt. Es arbeitet innerhalb der `PhysicsSystem`-Klasse und wertet alle Objekte in der Szene aus, die eine `RigidBody`-Komponente besitzen.

Um ein Objekt physikalisch aktiv zu machen, instanziiert und hängt einfach ein `RigidBody` daran:

```typescript
import { Object3D, RigidBody } from "small-world";

const myCube = new Object3D();
const rb = new RigidBody(1.0); // Masse von 1,0 kg
myCube.rigidBody = rb;

// Physikalische Eigenschaften setzen
rb.restitution = 0.8; // Sprungkraft (0 = kein Abprallen, 1 = perfekt elastisch)
rb.friction = 0.1; // Linearer Dämpfungsfaktor
rb.angularDamping = 0.05; // Rotations-Dämpfungsfaktor

// Zur Szene hinzufügen
scene.add(myCube);
```

## Statische vs. dynamische Körper

Ein `RigidBody` bestimmt anhand seiner `mass`, ob er dynamisch oder statisch ist.
Übergebt ihr `0` an den `RigidBody`-Konstruktor, wird seine inverse Masse `0`, wodurch er unendlich schwer (statisch) wird.

- **Dynamischer Körper (`mass > 0`):** Reagiert auf Schwerkraft, Kräfte und Kollisionen.
- **Statischer Körper (`mass === 0`):** Bewegt sich nicht, aber dynamische Körper kollidieren mit ihm und prallen davon ab.

## Kollisionserkennung (Bounds)

`PhysicsSystem` nutzt die `bounds`-Eigenschaft eines `Object3D` für die Kollisionserkennung. Ohne `bounds` kann ein Objekt nicht kollidieren.
Small World löst jede Paarung von **Sphere-**, **Box (AABB)-** und **OBB**-Bounds auf — Sphere-vs-Sphere, Box-vs-Box, Sphere-vs-Box, Sphere-vs-OBB und Box-vs-OBB/OBB-vs-OBB (vollständiges 15-Achsen-SAT). Objekte durchlaufen zusätzlich eine Octree-Broadphase, sodass Kollisionsprüfungen mit der Anzahl naher Objekte skalieren, statt mit der ganzen Szene.

```typescript
import { BoundingSphere } from "small-world";

// Eine Bounding-Sphere mit Radius 1,0 setzen
myCube.bounds = new BoundingSphere(myCube.position, 1.0);
```

## Kräfte und Impulse

Ihr könnt direkt mit einem `RigidBody` interagieren, indem ihr kontinuierliche Kräfte oder augenblickliche Impulse anwendet.

- **`applyForce(f: Vector3D)`:** Wendet eine kontinuierliche Kraft an (z.B. Wind, Triebwerke). Diese Kraft wird am Ende des Steps zurückgesetzt.
- **`applyImpulse(j: Vector3D)`:** Wendet eine sofortige Geschwindigkeitsänderung an (z.B. Explosionen, Springen, Kollisionen).
- **`applyTorque(t: Vector3D)`:** Wendet Rotationskraft um die lokalen Achsen an.

```typescript
import { Vector3D } from "small-world";

// Das Objekt sofort springen lassen
myCube.rigidBody.applyImpulse(new Vector3D(0, 10, 0));
```

## Die Simulationsschleife

Physik-Stepping geschieht **nicht** automatisch — ruft `PhysicsSystem.step(scene, dt)` selbst auf, typischerweise am Anfang des `update()`-Overrides eurer `SmallWorld`-Unterklasse, bevor eure eigene Spiellogik läuft:

```typescript
protected override update(deltaTime: number): void {
  this._physics.step(this.scene, deltaTime);
  // ...eure Spiellogik
}
```

Während dieses Steps macht die Engine Folgendes:
1. **Geschwindigkeit integrieren:** Wendet Schwerkraft und akkumulierte Kräfte an, um lineare und angulare Geschwindigkeit zu aktualisieren.
2. **Position integrieren:** Bewegt und rotiert das Objekt basierend auf seiner neuen Geschwindigkeit.
3. **Kollisionen auflösen:** Testet dynamische Körper gegen alle Collider in der Szene.
   - **Positionskorrektur:** Schiebt überlappende Objekte auseinander, um "Einsinken" zu verhindern.
   - **Impuls-Auflösung:** Wendet entgegengesetzte Kräfte an, damit die Objekte basierend auf ihrer `restitution` abprallen.

## Continuous Collision Detection (CCD) & Fluid-Volumen

### 1. Continuous Collision Detection (ADR 0005)
Für schnell bewegte Projektile oder Bälle, die zwischen Frames durch dünne Wände tunneln könnten, unterstützt Small World Sphere-Continuous-Collision-Detection (CCD). Das gefegte Kugelvolumen wird entlang seiner Frame-Trajektorie geprüft, um solide Kollisionen ohne Tunneling zu garantieren.

### 2. Fluid-Volumen (`FluidVolume`)
`FluidVolume` erzeugt physikalische Trigger-Zonen (Wasser, Säure, Lava-Pools), die auf dynamische `RigidBody`-Akteure, die das Volumen betreten, Auftrieb, linearen Flüssigkeitswiderstand und gerichtete Strömungen anwenden.

## Stabilität und Zero-Allocation

Physik-Engines sind aufgrund der massiven Menge an Vektor-Mathematik pro Frame notorisch speicherintensiv. Small World mildert das, indem es ausschließlich den `MathPool` nutzt.
Alle temporären Vektoren und Matrizen, die während Kollisionsprüfung und Integration verwendet werden — einschließlich des Rotations-Integrations-Zweigs (Winkelgeschwindigkeit → Quaternion → Euler-Konvertierung) — werden aus dem Pool bezogen und wieder zurückgegeben. Das garantiert ein flaches Speicherprofil und kein GC-Stottern bei intensiven Physik-Simulationen.
