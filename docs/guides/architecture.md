# Architektur & Code-Beispiele

Die Small World Engine ist modular aufgebaut und nutzt Composition über tiefe Vererbung. Im Folgenden findest du einen Überblick über die wichtigsten Klassen, Interfaces und Parameter, mit denen du im Alltag arbeiten wirst, sowie konkrete Code-Beispiele für den Einstieg.

::: tip API Referenz
Für eine vollständige Liste *aller* Klassen, Methoden und Typdeklarationen (inkl. Konstruktor-Parametern) öffne bitte die automatisch generierte **[API Reference](/api/index.html)**.
:::

---

## 1. Scene Graph (`Object3D`)

Das Herzstück der Engine ist die `Object3D` Klasse. Alles, was in der Welt existiert (Meshes, Kameras, virtuelle Anker), ist oder erbt von `Object3D`. Es verwaltet die lokale sowie globale Transformations-Matrix, Geometrie und das Material.

### Beispiel: Ein Objekt erstellen und platzieren
```typescript
import { Object3D, Cube, StandardMaterial, Color } from "small-world";

const player = new Object3D("Player");

// Position (X=Rechts, Y=Oben, Z=Hinten)
player.position.set(0, 1, 0);

// Skalierung und Rotation
player.scale.set(2, 2, 2);
player.rotation.y = Math.PI / 4; // 45 Grad

// Geometrie und Material zuweisen
player.geometry = new Cube({ size: 1 }).getGeometryData();
player.material = new StandardMaterial({ 
  color: Color.RED, 
  metallic: 0.1, 
  roughness: 0.8 
});

// Kind-Objekte (Hierarchie) anhängen
const weapon = new Object3D("Weapon");
weapon.position.set(1, 0, 0); // Relativ zum Player!
player.add(weapon);

// In die Szene einfügen
this.scene.add(player);
```

---

## 2. Kameras & Controller

Die Engine verwendet kein starres Kameramodell. Stattdessen gibt es eine Basis-`Camera`, die von flexiblen **Strategien** (wie `SmoothStrategy`, `IsometricStrategy`) und **Controllern** (`FPSController`, `ZoomController`) gesteuert wird.

### Beispiel: First-Person Shooter Kamera (FPS)
```typescript
import { FPSController } from "small-world";

// Die Strategie definiert, wie die Kamera Updates interpoliert (Stiff = direkt, Smooth = weich)
this.camera.setStrategy(new StiffStrategy());

// Der FPS Controller greift direkt auf Mauseingaben (PointerLock) und WASD zu
const fpsController = new FPSController(this.camera, {
  moveSpeed: 10.0,
  lookSpeed: 0.002
});

// Dem Application-Lebenszyklus hinzufügen, damit er Updates erhält
this.controllers.push(fpsController);
```

---

## 3. Materialien (PBR & Spezifische Shader)

Small World nutzt einen hybriden Rendering-Ansatz (WebGL2 & WebGPU) basierend auf dem Cook-Torrance BRDF-Modell. Materialien definieren Parameter, die vom Shader gelesen werden.

### Übersicht der wichtigsten Materialien
- `StandardMaterial`: Für 90% der Objekte. Unterstützt `color`, `metallic`, `roughness`, sowie Diffuse-, Normal- und Roughness-Maps.
- `GlassMaterial`: Ein refraktives Material für Glas oder Wasser mit echter Brechung (`ior`) und Volumen-Absorption (`absorptionColor`).
- `SpriteMaterial`: Für 2D/2.5D Billboards, die immer zur Kamera schauen.

### Beispiel: Glas/Wasser Material mit Brechungsindex
```typescript
import { GlassMaterial, Color } from "small-world";

const water = new GlassMaterial({
  color: new Color(0.9, 0.95, 1.0),
  roughness: 0.05,
  ior: 1.33,               // Brechungsindex von Wasser
  dispersion: 0.02,        // Leichte chromatische Aberration an Kanten
  absorptionColor: new Color(0.1, 0.5, 0.8),
  absorptionDistance: 5.0  // Je tiefer, desto blauer
});

waterSurface.material = water;
```

---

## 4. Behaviors & Finite State Machines (FSM)

Komplexe Logik solltest du nicht in eine riesige `update()`-Schleife schreiben. Nutze stattdessen das **Behavior-System**, um isolierte Logik-Blöcke (Komponenten) an ein `Object3D` zu heften.

### Beispiel: Ein Blink-Behavior
```typescript
import { Behavior, Object3D } from "small-world";

export class PulseBehavior extends Behavior {
  private _speed: number;
  private _baseScale: number;

  constructor(speed: number = 2.0) {
    super();
    this._speed = speed;
    this._baseScale = 1.0;
  }

  // Wird aufgerufen, wenn das Behavior dem Objekt per obj.addBehavior() zugewiesen wird
  public override onAttach(target: Object3D): void {
    this._baseScale = target.scale.x;
  }

  // Wird jeden Frame automatisch durch die Scene aufgerufen
  public override update(deltaTime: number, totalTime: number): void {
    if (!this.target) return;
    
    // Sinus-Pulsieren berechnen
    const scale = this._baseScale + Math.sin(totalTime * this._speed) * 0.2;
    this.target.scale.set(scale, scale, scale);
  }
}

// Nutzung:
const heart = new Object3D("Heart");
heart.addBehavior(new PulseBehavior(5.0));
```

Wenn Zustände noch komplexer werden (z. B. `IDLE` -> `WALK` -> `ATTACK`), nutze das eingebaute `StateMachine` Modul, welches nahtlos mit den Behaviors via `StateMachineBehavior` integriert ist.
