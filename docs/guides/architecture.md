# Architektur & Code-Showcases

Die Small World Engine hat ein modulares Design und setzt auf Komposition statt tiefer Vererbung. Unten folgt ein Überblick über die wichtigsten Klassen, Schnittstellen und Parameter, mit denen du tagtäglich arbeiten wirst, sowie konkrete Code-Beispiele zum Einstieg.

::: tip API-Referenz
Für eine vollständige Liste _aller_ Klassen, Methoden und Typdeklarationen (inkl. Konstruktor-Parameter) öffne bitte die automatisch generierte **[API-Referenz](/api/index.html)**.
:::

---

## 1. Szenengraph (`Object3D`)

Das Herz der Engine ist die Klasse `Object3D`. Alles, was in der Welt existiert (Meshes, Kameras, virtuelle Anker), ist `Object3D` oder erbt davon. Sie verwaltet die lokalen und globalen Transformationsmatrizen, Geometrie und Material.

### Showcase: Ein Objekt erzeugen und platzieren

```typescript
import { Object3D, Cube, StandardMaterial, Color } from "small-world";

const player = new Object3D("Player");

// Position (X=Rechts, Y=Oben, Z=Rückwärts)
player.position.set(0, 1, 0);

// Skalierung und Rotation
player.scale.set(2, 2, 2);
player.rotation.y = Math.PI / 4; // 45 Grad

// Geometrie und Material zuweisen
player.geometry = new Cube({ size: 1 }).getGeometryData();
player.material = new StandardMaterial({
  color: Color.RED,
  metallic: 0.1,
  roughness: 0.8,
});

// Kind-Objekte anhängen (Hierarchie)
const weapon = new Object3D("Weapon");
weapon.position.set(1, 0, 0); // Relativ zum Spieler!
player.add(weapon);

// Zur Szene hinzufügen
this.scene.add(player);
```

---

## 2. Kameras & Behaviors

Die Engine nutzt eine einheitliche Kamera-Architektur. Die Basis-`Camera` wird durch eine Projektion parametrisiert (`PerspectiveProjection` oder `OrthographicProjection`) und dynamisch über das **Behavior-System** gesteuert.

### Showcase: Kamera mit Controller und Shake-Behavior

```typescript
import { Camera, PerspectiveProjection, FirstPersonController, ShakeBehavior } from "small-world";

// Kamera mit perspektivischer Projektion erstellen
const camera = new Camera(new PerspectiveProjection({ fov: 60, near: 0.1, far: 1000 }));

// Controller und prozedurale Effekte direkt als Behaviors anhängen
camera.addBehavior(
  new FirstPersonController({
    moveSpeed: 10.0,
    lookSensitivity: 0.002,
  })
);

// Prozedurales Trauma-/Shake-Behavior für Einschläge hinzufügen
const shake = new ShakeBehavior();
camera.addBehavior(shake);
```

---

## 3. Materialien & Shader (PBR & mitgelieferte Presets)

Small World nutzt eine hybride Rendering-Pipeline (WebGPU, WebGL2, WebGL1) auf Basis des Cook-Torrance-BRDF-Modells mit linearem Farbraum und sRGB-Gamma-Korrektur.

### Wichtige Material-Familien

- `StandardMaterial`: Kern-PBR-Material mit `albedo`, `metallic`, `roughness` sowie Diffuse-/Normal-/Roughness-Map-Slots.
- `GlassMaterial`: Echtzeit-Screen-Space-Refraktion (SSR) mit konfigurierbarem `ior` und volumetrischer Absorption.
- `SpriteMaterial`: kameraausgerichtetes 2D/2.5D-Billboard-Material.
- **Wave-Familie (ADR 0013):**
  - `OpenWaterMaterial`: realistisches Ozeanwasser mit Gerstner-Wellen und undurchsichtigem Tiefen-Fade (weiche Uferlinien).
  - `StylizedWaterMaterial`: stilisiertes/Toon-Wasser mit anpassbarem Rand-Schaum und Cel-Tönung.
- **Flow-Familie (ADR 0013):**
  - `LavaMaterial`: undurchsichtiges, glühendes geschmolzenes Gestein mit anpassbarer Emissions-Intensität und rauschgesteuerter Viskosität.
  - `SlimeMaterial`: durchscheinendes, zähflüssiges Preset mit dezentem, leuchtendem Rand-Glühen.

### Showcase: Lava-Material mit Emissions-Glühen

```typescript
import { LavaMaterial, Color, Object3D, Plane } from "small-world";

const lava = new Object3D("LavaLake");
lava.geometry = new Plane({ width: 50, height: 50, widthSegments: 32, heightSegments: 32 }).getGeometryData();
lava.material = new LavaMaterial({
  color: new Color(0.25, 0.03, 0.0),
  emissiveColor: new Color(1.0, 0.35, 0.05),
  emissiveStrength: 2.0,
  flowSpeed: 0.4,
});

this.scene.add(lava);
```

---

## 4. Behaviors & Zustandsautomaten (FSM)

Komplexe Logik sollte nicht in eine riesige `update()`-Schleife geschrieben werden. Nutze stattdessen das **Behavior-System**, um isolierte Logikblöcke (Komponenten) an ein `Object3D` anzuhängen.

### Showcase: Ein Pulse-Behavior

```typescript
import { Behavior, Object3D } from "small-world";

export class PulseBehavior extends Behavior {
  private _speed: number;
  private _baseScale: number;
  private _elapsed: number = 0;

  constructor(speed: number = 2.0) {
    super();
    this._speed = speed;
    this._baseScale = 1.0;
  }

  // Wird aufgerufen, wenn das Behavior via obj.addBehavior() am Objekt angehängt wird
  public override onAttach(target: Object3D): void {
    this._baseScale = target.scale.x;
  }

  // Wird automatisch jeden Frame von der Scene aufgerufen, erhält nur deltaTime
  public override update(deltaTime: number): void {
    if (!this.target) return;
    this._elapsed += deltaTime;

    // Sinus-Puls berechnen
    const scale = this._baseScale + Math.sin(this._elapsed * this._speed) * 0.2;
    this.target.scale.set(scale, scale, scale);
  }
}

// Verwendung:
const heart = new Object3D("Heart");
heart.addBehavior(new PulseBehavior(5.0));
```

Werden Zustände komplexer (z. B. `IDLE` -> `WALK` -> `ATTACK`), nutze das eingebaute `StateMachine`-Modul, das sich über `StateMachineBehavior` nahtlos in Behaviors integriert.

---

## 5. Ressourcenverwaltung & Garbage Collection

Anders als bei älteren Grafik-Engines, bei denen `dispose()` manuell auf Geometrien, Texturen und Materialien aufgerufen werden muss, um GPU-Speicherlecks zu vermeiden, nutzt **Small World automatisiertes internes Reference Counting**.

### Wie es funktioniert
Jeder Geometrie-Puffer, jedes Shader-Programm und jede Textur wird vom aktiven Renderer (WebGL1, WebGL2 oder WebGPU) nachverfolgt.
Wird ein `Object3D` aus der `Scene` entfernt, dekrementiert die Engine die Referenzzähler für die Ressourcen des Objekts. Fällt der Referenzzähler einer Ressource auf null, reiht die Engine sie automatisch zur Löschung ein und zerstört das zugrunde liegende GPU-Objekt sicher.

```typescript
// Ein Objekt hinzuzufügen erhöht die Referenzzähler für seine Geometrie- und Material-Texturen
this.scene.add(myObject);

// ... Später ...

// Das Objekt zu entfernen verringert die Referenzzähler.
// Nutzt kein anderes Objekt dieselbe Geometrie/Texturen, werden sie automatisch aus dem VRAM entfernt!
this.scene.remove(myObject);
```
*(Hinweis: `RenderTarget`-Texturen sind von dieser automatisierten Bereinigung ausgenommen, da ihr Lebenszyklus explizit von der Render-Pipeline verwaltet wird, nicht von einzelnen Objekten.)*
