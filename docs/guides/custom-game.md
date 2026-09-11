# Ein eigenes Spiel bauen

Die **Small World Engine** ist darauf ausgelegt, von einfach rotierenden Würfeln bis zu voll ausgebauten Game-Loops mit eigener Logik, Controllern und UI zu skalieren.

## Die Architektur eines Spiels

Ein typisches Projekt sollte in folgende modulare Teile aufgeteilt werden:
1. **Die App (`MyGameApp.ts`)**: Erweitert `SmallWorld`. Baut die Szene auf, lädt Texturen und initialisiert Kamera und UI.
2. **Der Level-Builder**: Nutzt `GridLevelBuilder` oder generiert den Szenengraphen prozedural.
3. **Der Controller (`MyController.ts`)**: Erweitert `FirstPersonController` oder `OrbitController`. Das ist die Kernlogik für Eingabe und Bewegung.
4. **Die UI (`MyHud.ts`)**: Ein entkoppeltes HTML-Overlay, das auf `Events` lauscht.

## 1. Einen eigenen Controller erstellen

In Small World sind Controller schlicht `Behavior`-Komponenten, die an eine Kamera oder ein Objekt angehängt werden. Die eingebauten Controller können erweitert werden, um spielspezifische Logik wie Schießen, Raycasting oder Item-Aufnahme hinzuzufügen.

```typescript
import { FirstPersonController, FirstPersonControllerOptions } from "small-world";
import { Keys } from "small-world";

export class MyController extends FirstPersonController {
  constructor(options: FirstPersonControllerOptions = {}) {
    super(options);
  }

  public override update(deltaTime: number): void {
    // 1. Die Basisklasse WASD-Bewegung und Kollision handhaben lassen
    super.update(deltaTime);

    // 2. Eigene Logik hinzufügen (z. B. Schießen)
    if (this._options.input.isPressed(Keys.SPACE)) {
       // Eine Kugel abfeuern, einen Raycast durchführen...
       console.log("Pew pew!");

       // Den injizierten EventBus nutzen
       this.events.dispatchEvent("shoot-weapon", { ammoCost: 1 });
    }
  }
}
```

## 2. Die Anwendung starten (Bootstrapping)

Jetzt verbinden wir Controller, Szene und UI in unserer `SmallWorld`-Unterklasse.

```typescript
import { SmallWorld } from "small-world";
import { MyController } from "./MyController.js";
import { MyHud } from "./MyHud.js";

export class MyGameApp extends SmallWorld {
  private _hud!: MyHud;

  protected async setupScene(): Promise<void> {
    // UI initialisieren – den Event-Bus explizit übergeben
    this._hud = new MyGameHUD(this.events);

    // Unseren eigenen Controller als Behavior an die Kamera anhängen.
    // Das Behavior-System handhabt die Update-Schleife automatisch.
    this.camera.addBehavior(
      new MyController({
        scene: this.scene,
        input: this.input,
        moveSpeed: 15.0,
      })
    );
  }

  protected override update(deltaTime: number): void {
    // Game-Loop-Logik...
  }
}

// Das Spiel starten
const app = new MyGameApp();
app.start();
```

Durch diese Code-Struktur bleiben Spiellogik (Controller), Render-Logik (App/Scene) und Benutzeroberfläche (HUD) vollständig unabhängig und leicht zu testen oder zu refaktorisieren!

## Referenz-Implementierung: YAD (Yet Another Dungeon)

Die Small World Engine enthält einen vollständigen, funktionsfähigen Showcase namens **YAD (Yet Another Dungeon)**. YAD ist die kanonische Referenzarchitektur für den Bau eines echten Spiels.

YAD demonstriert:
1. **Nahtlose Werkzeug-Integration:** Wie eigenständige Werkzeuge (`Pixler`, `MapGenerator`, `Xtractor`) über `app.events` mit dem Spiel kommunizieren, ohne die Render-Schleife zu unterbrechen – kein Forge-Overlay nötig.
2. **Prozedurale Level-Generierung:** Wie die `GridLevelBuilder`-Erweiterung eine ASCII-String-Karte in 3D-Meshes parst und dabei `EnemyBehavior`-gesteuerte Gegner-Sprites und Pickup-Sprites erzeugt.
3. **Gegner-Logik:** Wie `EnemyBehavior` eine einfache distanzbasierte Verfolgungslogik implementiert (Erkennungsradius, Verfolgung, Angriffsnähe). YAD nutzt für Gegner nicht das `StateMachine`-/FSM-Modul der Engine — es steht aber zur Verfügung (siehe [Zustandsautomaten](./state-machines)), falls reichhaltigere Zustandslogik gebraucht wird.
4. **Eigene Controller:** `YadController` erbt von `FirstPersonController` und fügt Schrittgeräusche hinzu (über eine injizierte `AudioSystem`-Instanz), Waffen-Schwenk-Animation (gerendert von `YadHud`) und raygecastete Angriffe.
5. **Entkoppelte UI (`YadHud`):** Ein striktes HTML-Overlay, das auf `AppEvents` lauscht, um Lebensbalken zu aktualisieren und Chat-Nachrichten zu protokollieren.

Beim Start eines neuen Projekts wird dringend empfohlen, `src/apps/yad` durchzulesen, um zu verstehen, wie die Architektur skaliert!
