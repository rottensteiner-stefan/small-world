# Physik, Kollisionserkennung & Constraints

Die Small World Engine enthält eine maßgeschneiderte, hochoptimierte und deterministische 3D-Physik-Engine, die auf der **Semi-Implicit-Euler**-Integration und einem **Projected Gauss-Seidel (PGS)** Constraint-Solver basiert. Sie verwaltet Kollisionserkennung, dynamische Positionskorrektur, 3D-Trägheitsmomente, echte Coulomb-Reibung, Raycast-/Shape-Cast-Queries, Trigger-Zonen und ein modulares Joint-System — unter strikter Einhaltung der "Zero Allocation auf dem Hot Path"-Architektur.

---

## 1. Architektur & Simulationsschleife

Das Physik-System ist vollständig vom Render-Loop entkoppelt. Es verwendet einen Akkumulator für feste Zeitschritte (**Fixed Timestep**), um simulationskritischen Netcode-Determinismus und mathematische Stabilität unabhängig von variierenden Bildschirm-Bildwiederholraten (z. B. 60 Hz, 144 Hz, ProMotion) zu garantieren.

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                 RequestAnimationFrame Loop                │
                  └─────────────────────────────┬────────────────────────────┘
                                                │ (Variable Render deltaTime)
                                                ▼
                                  ┌───────────────────────────┐
                                  │   Accumulator += deltaTime │
                                  └─────────────┬─────────────┘
                                                │
                       ┌────────────────────────▼────────────────────────┐
                       │  while (accumulator >= fixedTimeStep)           │
                       │    1. Continuous Force Accumulation (Springs)   │
                       │    2. Velocity Integration (Euler)              │
                       │    3. Continuous Collision Detection (CCD)      │
                       │    4. Position Displacement & Matrix Sync       │
                       │    5. Angular Velocity Integration              │
                       │    6. Broadphase (Octree / Fat-AABB Caching)    │
                       │    7. PGS Iterative Solver (Contacts + Joints)  │
                       │    8. Inactivity & Sleeping State Evaluation    │
                       │    accumulator -= fixedTimeStep                 │
                       └────────────────────────┬────────────────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │ Render State Interpolation │
                                  │ (Decoupled Visual Smooth) │
                                  └───────────────────────────┘
```

### Einbindung in die Spielschleife

Physik-Stepping wird typischerweise zu Beginn der `update()`-Methode eurer `SmallWorld`-Anwendung aufgerufen:

```typescript
import { SmallWorld, Scene, PhysicsSystem } from "small-world";

export class MyGame extends SmallWorld {
  private _physics = new PhysicsSystem(this.events);

  protected override init(): void {
    // Globale Gravitation konfigurieren (Standard: -9.81 auf Y)
    this._physics.gravity.set(0, -9.81, 0);
    this._physics.fixedTimeStep = 1 / 60; // 60 Hz Physik-Tick
    this._physics.solverIterations = 6;    // PGS-Iterationen für Stacking-Stabilität
  }

  protected override update(deltaTime: number): void {
    // 1. Physik-Simulation mit Sub-Stepping vorantreiben
    this._physics.step(this.scene, deltaTime);

    // 2. Optionale visuelle Render-Interpolation zwischen den Ticks
    this._physics.applyRenderInterpolation();

    // 3. Spiellogik & Kamera-Updates
  }
}
```

---

## 2. Statische vs. Dynamische Körper (`RigidBody`)

Ein `Object3D` wird durch Zuweisen einer [`RigidBody`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/engine/src/physix/RigidBody.ts)-Komponente physikalisch aktiv:

```typescript
import { Object3D, RigidBody, Vector3D } from "small-world";

const box = new Object3D("DynamicBox");
const rb = new RigidBody(2.5); // Masse = 2.5 kg (Dynamisch)

// Material- & Stoßeigenschaften
rb.restitution = 0.2;         // Elastizität / Bounciness (0.0 = Ton/Plastilin, 1.0 = Superball)
rb.friction = 0.6;            // Coulomb-Reibungskoeffizient (0.0 = Glatteis, 1.0 = Hoher Grip)
rb.linearDamping = 0.99;      // Atmosphärischer Luftwiderstand (1.0 = Kein Widerstand)
rb.angularDamping = 0.98;     // Rotationswiderstand

box.rigidBody = rb;
scene.add(box);
```

### Körpertypen im Überblick

| Typ | Konstruktor / Masse | Verhalten |
| :--- | :--- | :--- |
| **Dynamisch** | `new RigidBody(mass > 0)` | Reagiert voll auf Schwerkraft, Kräfte, Drehmomente und Kollisionen. |
| **Statisch (RigidBody)** | `new RigidBody(0)` | Unendlich schwer, unbeweglich. Reflektiert dynamische Körper mit 100% Gegenkraft. |
| **Statisch (StaticCollider)** | `new StaticCollider(bounds)` | Ultra-leichtgewichtiges Hindernis außerhalb des Szenengraphen (Terrain, Architektur, Wände). |

---

## 3. Kollisionsdetektoren & Bounding-Volumina

`PhysicsSystem` nutzt Bounding-Volumina zur präzisen Schnittstellen- und Impulsberechnung. Small World implementiert analytische Narrowphase-Solver für alle Kombinationen:

```
                  ┌─────────────────┐       ┌─────────────────┐
                  │ BoundingSphere  │       │   BoundingBox   │
                  │ (Radius, Mitte) │       │ (Axis-Aligned)  │
                  └────────┬────────┘       └────────┬────────┘
                           │                         │
                           │   Analytischer Solver   │
                           │   (15-Achsen SAT / GJK) │
                           │                         │
                  ┌────────┴────────┐       ┌────────┴────────┐
                  │       OBB       │       │   ConvexHull    │
                  │ (Oriented Box)  │       │ (Polyeder-Mesh) │
                  └─────────────────┘       └─────────────────┘
```

### Unterstützte Detektoren

1. **`BoundingSphere`:**
   - Schnellster aller Kollisionschecks.
   - Vollständig rotationsinvariant; rollt perfekt auf Untergründen.
   ```typescript
   import { BoundingSphere } from "small-world";
   sphereObj.bounds = new BoundingSphere(sphereObj.position, 0.5);
   ```

2. **`BoundingBox` (AABB):**
   - Achsenparalleler Quader (`min`, `max`, `center`).
   - Ideal für statische Level-Geometrie, Plattformen und Böden.
   ```typescript
   import { BoundingBox, Vector3D } from "small-world";
   floorObj.bounds = new BoundingBox(new Vector3D(-50, -1, -50), new Vector3D(50, 0, 50));
   ```

3. **`OBB` (Oriented Bounding Box):**
   - Rotierbare Box mit lokalen Ausrichtungsachsen und Halbachsen.
   - Verwendet das **15-Achsen Separating Axis Theorem (SAT)** für exakte Kanten-Kanten- und Flächen-Kontakte bei beliebigen Winkeln.
   ```typescript
   import { OBB } from "small-world";
   // Wird bei obj.computeBounds() für rotierte Boxen automatisch generiert
   ```

4. **`ConvexHull`:**
   - Konvexe Polyederhülle aus Vertex-Listen.
   - Ideal für prozedurale Trümmerstücke (z. B. aus `@small-world/physics-extras` Voronoi-Frakturierung).

---

## 4. Kollisions-Layer & Bitmasken-Filterung

Kollisionen können hocheffizient über 32-Bit-Bitmasken auf [`Collidable`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/engine/src/interfaces/Collidable.ts), [`Object3D`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/engine/src/core/Object3D.ts) und [`StaticCollider`](file:///Users/srottensteiner/PhpstormProjects/small-world/packages/engine/src/physix/StaticCollider.ts) gesteuert werden:

$$ \text{canCollide}(A, B) = ((A.\text{layer} \ \& \ B.\text{mask}) \neq 0) \ \land \ ((B.\text{layer} \ \& \ A.\text{mask}) \neq 0) $$

### Standard-Layer-Konvention

```typescript
export const CollisionLayers = {
  DEFAULT:    1 << 0, // 0x0001: Standard-Objekte / Welt
  PLAYER:     1 << 1, // 0x0002: Spieler-Charakter
  ENEMY:      1 << 2, // 0x0004: Gegner
  PROJECTILE: 1 << 3, // 0x0008: Geschosse / Zauber
  DEBRIS:     1 << 4, // 0x0010: Trümmer & Partikel
  TRIGGER:    1 << 5, // 0x0020: Sensor-Zonen & Checkpoints
} as const;
```

### Konfigurationsbeispiel

```typescript
// Spieler kollidiert mit Welt, Gegnern und Trümmern — ignoriert eigene Geschosse
player.collisionLayer = CollisionLayers.PLAYER;
player.collisionMask = CollisionLayers.DEFAULT | CollisionLayers.ENEMY | CollisionLayers.DEBRIS | CollisionLayers.TRIGGER;

// Spieler-Projektil trifft nur Wände und Gegner
projectile.collisionLayer = CollisionLayers.PROJECTILE;
projectile.collisionMask = CollisionLayers.DEFAULT | CollisionLayers.ENEMY;
```

---

## 5. Trigger-System & Lifecycle-Events

Trigger sind physische Sensor-Volumina (`isTrigger = true`), die Bewegungen registrieren, aber **keine physikalische Abstoßungskraft** auf Körper ausüben.

Small World stellt zero-allocation Lifecycle-Events über den globalen `EventDispatcher` bereit:

| Event-Name | Wann ausgelöst? | Payload-Eigenschaften |
| :--- | :--- | :--- |
| `physics:trigger-enter` | Beim ersten Schnitt zweier Körper (Trigger) | `objectA`, `objectB`, `normal`, `depth` |
| `physics:trigger-stay` | Solange Körper im Trigger verbleiben | `objectA`, `objectB`, `normal`, `depth` |
| `physics:trigger-exit` | Im ersten Frame nach dem Verlassen | `objectA`, `objectB` |
| `physics:collision-enter`| Beim ersten physischen Festkörperkontakt | `objectA`, `objectB`, `normal`, `depth`, `impulse` |
| `physics:collision-stay` | Bei anhaltendem Kontakt / Rutschen | `objectA`, `objectB`, `normal`, `depth`, `impulse` |
| `physics:collision-exit` | Nach Lösen des physischen Kontakts | `objectA`, `objectB` |
| `physics:sleep` | Wenn Körper in Ruhezustand übergeht | `object` |
| `physics:wakeup` | Wenn Körper durch Stoß/Kraft aufwacht | `object` |

### Beispiel: Checkpoint & Damage-Zone

```typescript
const lavaZone = new StaticCollider(
  new BoundingBox(new Vector3D(-10, -1, -10), new Vector3D(10, 0, 10))
);
lavaZone.isTrigger = true;
scene.staticColliders.push(lavaZone);

// Trigger-Event abonnieren
events.addEventListener("physics:trigger-enter", (e) => {
  if (e.objectA === player || e.objectB === player) {
    console.log("Spieler hat Lava-Zone betreten! Schaden anwenden.");
  }
});
```

---

## 6. Physics Raycast & Query API

Die Physics Query API ermöglicht schnelle Sichtlinien-Prüfungen, Treffer-Scans und räumliche Volumen-Sweeps mit integrierter Bitmasken-Filterung:

### 1. `physics.raycast` (Erster Treffer)

Führt einen Strahlentest durch und liefert den nächsten Trefferpunkt:

```typescript
import { Vector3D } from "small-world";

const origin = player.position;
const down = new Vector3D(0, -1, 0);

// 2 Meter nach unten strahlen, um Untergrund zu detektieren
const hit = physics.raycast(origin, down, 2.0, CollisionLayers.DEFAULT);

if (hit) {
  console.log(`Bodenkontakt bei Distanz: ${hit.distance.toFixed(2)} m`);
  console.log(`Trefferpunkt: (${hit.point.x}, ${hit.point.y}, ${hit.point.z})`);
  console.log(`Oberflächennormale: (${hit.normal.x}, ${hit.normal.y}, ${hit.normal.z})`);
}
```

### 2. `physics.raycastAll` (Alle Treffer, sortiert)

Gibt alle getroffenen Collider entlang des Strahls zurück, aufsteigend nach Distanz sortiert (ideal für durchschlagende Projektile oder Röntgen-Scans):

```typescript
const hits = physics.raycastAll(gunMuzzlePos, shootDirection, 100.0);
for (const hit of hits) {
  applyDamage(hit.object, hit.point);
}
```

### 3. `physics.sphereCast` (Volumen-Sweep)

Verschiebt eine Kugel mit gegebenem Radius entlang eines Vektors (ideal für dicke Geschosse, Charakter-Kollisionskapseln und Ausweich-Sensoren):

```typescript
// Prüfen, ob ein 0.5m breiter Charakter 3m nach vorne gehen kann
const sweepHit = physics.sphereCast(player.position, 0.5, forwardDir, 3.0);
if (!sweepHit) {
  // Weg ist frei
}
```

---

## 7. 3D-Trägheitstensor & Außermittige Stöße

Reale Körper rotieren abhängig von ihrer Massenverteilung unterschiedlich leicht um ihre Hauptträgheitsachsen ($I_{xx}, I_{yy}, I_{zz}$).

```typescript
const rb = new RigidBody(10.0); // 10 kg

// Helfer zur exakten analytischen Trägheitsberechnung:
rb.setInertiaForBox(1.0, 2.0, 0.5);      // Quader (Breite=1, Höhe=2, Tiefe=0.5)
rb.setInertiaForSphere(1.0);             // Kugel (Radius=1)
rb.setInertiaForCylinder(0.5, 2.0);      // Zylinder entlang Y (Radius=0.5, Höhe=2)
```

### Außermittige Kräfte und Impulse

Wird ein Stoß an einem exzentrischen Punkt $\vec{p}$ mit Hebelarm $\vec{r} = \vec{p} - \vec{c}$ angewendet, berechnet Small World sowohl die lineare Beschleunigung als auch das resultierende Drehmoment $\vec{\tau} = \vec{r} \times \vec{J}$:

```typescript
// Box an der oberen rechten Ecke nach vorne stoßen
const cornerPos = new Vector3D(1.0, 2.0, 0.0);
const pushImpulse = new Vector3D(0, 0, -10.0);

// Erzeugt Vorwärtsbewegung + sofortiges Rückwärtskippen (Tumbling)
myBox.rigidBody.applyImpulseAtPoint(pushImpulse, cornerPos, myBox.position);
```

---

## 8. Coulomb-Reibung & Stacking-Stabilität

Small World implementiert den vollen **Coulomb-Reibungskegel**:

$$ \|\vec{J}_T\| \leq \mu \cdot J_N \quad \text{mit} \quad \mu = \sqrt{\mu_A \cdot \mu_B} $$

- **Haftreibung (Static Friction):** Liegt der Tangentialimpuls innerhalb des Reibungskegels, wird die Gleitgeschwindigkeit an der Kontaktoberfläche exakt auf $0$ gebracht (z. B. ruhende Kisten auf Schrägen oder reines Abrollen von Kugeln).
- **Gleitreibung (Dynamic Friction):** Übersteigt der Impuls die Grenze, wird die Reibungskraft auf $\mu \cdot J_N$ geklemmt, was zu kontrolliertem Rutschen führt.

### Stacking & Multi-Iteration Solver

Durch die Kombination aus **Symmetrischer Gauss-Seidel-Relaxation** (`solverIterations = 4..8`) und Positions-Projektion sinken aufeinandergestapelte Kisten und Schuttberge nicht mehr ein und neigen nicht zu Oszillationen.

```typescript
physics.solverIterations = 8; // Für extreme Stapel-Stabilität (z. B. 10+ Kisten)
```

---

## 9. Constraints & Joint-System (Gelenke)

Gelenke koppeln zwei Körper (`bodyA` und `bodyB`) oder binden einen Körper an einen festen Weltanker (`bodyB = null`).

```
          ┌────────────────────────────────────────────────────────┐
          │                    Joint (Basisklasse)                 │
          │ (bodyA, bodyB, anchorA, anchorB, breakForce, enabled)  │
          └───────────────────────────┬────────────────────────────┘
                                      │
        ┌──────────────────┬──────────┴─────────┬──────────────────┐
        │                  │                    │                  │
        ▼                  ▼                    ▼                  ▼
┌───────────────┐  ┌───────────────┐    ┌───────────────┐  ┌───────────────┐
│ DistanceJoint │  │  SpringJoint  │    │BallSocketJoint│  │  HingeJoint   │
│ (Seil / Stab) │  │(Federdämpfer) │    │ (Kugelgelenk) │  │ (Scharnier)   │
└───────────────┘  └───────────────┘    └───────────────┘  └───────────────┘
```

### 1. `DistanceJoint` (Feste oder begrenzte Distanz)

Hält zwei Ankerpunkte auf exaktem Abstand (z. B. Pendel, Seile, starre Streben):

```typescript
import { DistanceJoint, Vector3D } from "small-world";

const pendulum = new DistanceJoint({
  bodyA: bobMesh,
  anchorA: new Vector3D(0, 0, 0),       // Zentrum des Bobs
  anchorB: new Vector3D(0, 10, 0),      // Fester Deckenanker bei Y=10
  distance: 10.0,                       // Exakter Seilabstand
  breakForce: 5000.0,                   // Reißt bei extremen Kräften
});
scene.joints.push(pendulum);
```

### 2. `SpringJoint` (Hooke'sche Federung)

Erzeugt gedämpfte elastische Schwingungen nach Hooke ($F = -k \cdot \Delta x - c \cdot v_{\text{rel}}$):

```typescript
import { SpringJoint } from "small-world";

const suspension = new SpringJoint({
  bodyA: wheelMesh,
  bodyB: chassisMesh,
  restLength: 1.5,                      // Ruhelänge
  stiffness: 150.0,                     // Federkonstante k
  damping: 8.0,                         // Dämpfungskonstante c
});
scene.joints.push(suspension);
```

### 3. `BallSocketJoint` (3-DOF Kugelgelenk)

Verriegelt zwei Ankerpunkte in 3D ($\vec{p}_A = \vec{p}_B$), lässt aber freie Rotation in allen Achsen zu (z. B. Ragdoll-Schultern, Anhängerkupplungen):

```typescript
import { BallSocketJoint } from "small-world";

const shoulder = new BallSocketJoint({
  bodyA: upperArm,
  bodyB: torso,
  anchorA: new Vector3D(0, 0.5, 0),
  anchorB: new Vector3D(0.8, 1.4, 0),
});
scene.joints.push(shoulder);
```

### 4. `HingeJoint` (1-DOF Drehgelenk / Scharnier)

Schränkt die Rotation auf eine einzelne Achse ein. Unterstützt **Winkelbegrenzungen** (`minAngle`/`maxAngle`) und einen **aktiven Motor**:

```typescript
import { HingeJoint, Vector3D } from "small-world";

const doorHinge = new HingeJoint({
  bodyA: doorMesh,
  anchorA: new Vector3D(-0.8, 0, 0),    // Scharnierseite der Tür
  anchorB: new Vector3D(0, 0, 0),       // Türrahmen
  axisA: new Vector3D(0, 1, 0),         // Drehung nur um Y-Achse
  enableLimit: true,
  minAngle: 0.0,                        // Tür geschlossen (0°)
  maxAngle: Math.PI * 0.5,              // Maximal 90° öffnen
  enableMotor: true,
  motorSpeed: 1.5,                      // Automatischer Schließmotor (1.5 rad/s)
  maxMotorTorque: 50.0,                 // Maximale Motorkraft
});
scene.joints.push(doorHinge);
```

---

## 10. Continuous Collision Detection (CCD)

Für sehr schnelle Objekte (Geschosse, Bälle), die in einem einzigen Frame dünne Wände überspringen würden (**Tunneling**), bietet Small World kontinuierliche Kollisionserkennung für Kugeln, Quader (`BoundingBox`), `OBB`s und Strahlen:

```typescript
// CCD-Schwelle: Ab wie viel Bewegungsdistanz (relativ zum Radius) CCD greift
physics.ccdMotionThreshold = 0.5; // Bei Verschiebung > 50% der eigenen Größe
```

---

## 11. Inaktivität, Sleeping & Performance-Limits

Um CPU-Ressourcen zu schonen, versetzt Small World ruhende Körper automatisch in den `isSleeping`-Zustand. Schlafende Körper überspringen Kräfteintegration und Narrowphase-Kollisionstests vollständig ($\mathcal{O}(1)$ Kosten).

```typescript
const rb = myObject.rigidBody;

rb.allowSleep = true;                  // Automatisches Schlafen erlauben (Standard: true)
rb.sleepLinearThreshold = 0.05;        // Geschwindigkeitsgrenze (m/s)
rb.sleepAngularThreshold = 0.05;       // Rotationsgrenze (rad/s)
rb.sleepTimeThreshold = 0.5;           // Erforderliche Ruhedauer (0.5s)
```

### Empfohlene Grenzwerte & Best Practices (Caps)

| Parameter | Empfohlener Bereich | Bemerkung |
| :--- | :--- | :--- |
| **Massenverhältnis** | $\leq 100 : 1$ | Vermeidet numerische Instabilität bei Kontakten zwischen extrem leichten und schweren Objekten. |
| **Max Sub-Steps** | $4 - 10$ | Verhindert die "Spiral of Death" bei massiven Frame-Einbrüchen (`maxSubSteps = 10`). |
| **Solver-Iterationen** | $4 - 8$ | 4 Iterationen für Action-Games; 8 Iterationen für komplexe Kistenstapel und Joint-Ketten. |
| **Collider-Wahl** | Sphere $\to$ Box $\to$ OBB $\to$ Hull | Bevorzugt einfache Formen (Sphere/Box), wo immer möglich. |

---

## 12. Praxis-Rezepte

### Rezept: 3D-Charakter-Controller mit Raycast-Bodenhaftung

```typescript
import { Object3D, RigidBody, BoundingSphere, Vector3D } from "small-world";

export class PlayerController {
  public entity: Object3D;
  private _groundRayDir = new Vector3D(0, -1, 0);

  constructor() {
    this.entity = new Object3D("Player");
    this.entity.bounds = new BoundingSphere(this.entity.position, 0.5);
    
    const rb = new RigidBody(75.0); // 75 kg
    rb.angularDamping = 0.0;        // Rotation manuell über Blickrichtung steuern
    rb.restitution = 0.0;           // Kein Gummiball-Effekt beim Landen
    rb.friction = 0.8;
    this.entity.rigidBody = rb;
  }

  public update(physics: PhysicsSystem, inputMove: Vector3D, wantsJump: boolean): void {
    const rb = this.entity.rigidBody!;
    
    // 1. Prüfen, ob der Spieler auf dem Boden steht
    const groundHit = physics.raycast(
      this.entity.position,
      this._groundRayDir,
      0.6, // Radius 0.5 + 0.1 Toleranz
      CollisionLayers.DEFAULT
    );

    const isGrounded = groundHit !== null;

    // 2. Horizontale Bewegung steuern
    rb.velocity.x = inputMove.x * 6.0;
    rb.velocity.z = inputMove.z * 6.0;

    // 3. Sprung-Impuls ausführen
    if (isGrounded && wantsJump) {
      rb.applyImpulse(new Vector3D(0, 350.0, 0)); // 75kg * ~4.6 m/s
    }
  }
}
```
