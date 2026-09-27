# The Forge (Werkzeuge im Spiel)

Der Bau von Assets (Texturen, Sprite-Sheets, Level-Karten) zwingt Entwickler oft dazu, ständig zwischen der Game-Engine und externer Software wie Photoshop oder Tiled zu wechseln.

**The Forge** löst das, indem sie einen erweiterbaren Fenstermanager und ein Werkzeug-Framework direkt im Spiel bereitstellt. Mit der Forge lassen sich Mini-Anwendungen direkt über dem Spiel-Canvas ausführen.

## Was ist die Forge?

Die Klasse `Forge` ist ein Overlay, das ziehbare, größenveränderbare Fenster mit `ForgeTool`-Instanzen beherbergt. Sie lässt sich über eine Tastenkombination (z. B. `F12` oder `~`) ein-/ausblenden, ohne den Browser zu verlassen.

## Eingebaute Werkzeuge

Die Small World Engine liefert mehrere eingebaute Forge-Werkzeuge, um den Workflow zu beschleunigen:

1. **[Pixler](/guides/pixler):** Ein Retro-2D-Pixel-Art-Editor, um Sprites direkt im Spiel zu zeichnen. Bietet eine vollständige UI-Toolbar mit Stift, Bucket-Fill, Farbpipette und Linien-Werkzeug. Unterstützt Symmetrie-Modus (X-/Y-Achse), automatisches Rand-Trimmen, Canvas-Verschieben, Spiegeln und volle Undo-/Redo-Historie.
2. **[Xtractor](/guides/xtractor):** Ein Bildausschnitt-/Zerteil-Werkzeug, das Ausschnitte direkt an Pixler übergeben kann. Enthält eine Mock-KI-Assistenten-UI als Ausgangspunkt zur Integration eines echten Vision-Modell-Backends.
3. **[Map Generator](/guides/map-generator):** Ein visueller Raster-Editor, um generische Karten/Level zu malen und als `GridLevelBuilder`-kompatible ASCII-Strings zu exportieren.
4. **[Maker](/guides/maker):** Ein eigenständiger 3D-Welten- und Szeneneditor mit glTF-2.0-+-`SW_*`-Persistenz, Transform-Gizmos, Snapping, Prefabs und vollem Undo/Redo.
5. **[Material Studio](/guides/material-studio):** Ein PBR-Textur-Map-Generator, der Normal-/Roughness-/AO-/etc.-Maps aus einem einzelnen Diffuse-Bild ableitet und sie auf einem Beispiel-Mesh vorschaut.

::: tip Eigenständige Werkzeug-Seiten
Maker, Pixler, Xtractor und Map Generator sind auch als **eigenständige Webseiten** verfügbar (`/tools/maker.html`, `/tools/pixler.html`, `/tools/map-gen.html`, `/tools/xtractor.html`), die unabhängig laufen, ohne ein Spiel-Canvas oder Forge-Overlay zu benötigen — der empfohlene Weg für einen dedizierten Asset-Bearbeitungs-Workflow. Material Studio ist angedockt im Forge-Overlay einer laufenden Engine oder als Generator-Werkzeug verfügbar.
:::

::: tip Eigenes Paket seit ADR 0024
`Forge`, `ForgeTool` und jedes eingebaute Werkzeug leben seit [ADR 0024](/adr/0024-tools-ecosystem-package) in einem eigenen, auflösbaren Workspace-Paket `@small-world/tools` (`packages/tools/`) — nicht mehr in `@small-world/engine`. Nur `ForgeTool` (die Schnittstelle) bleibt im Kern.
:::

## Die Forge in die eigene App integrieren

::: tip Der schnelle Weg: `attachDevTools`
Nichts davon muss von Hand verdrahtet werden. `attachDevTools(app)` aus `@small-world/tools` erzeugt automatisch einen Forge-Hub mit allen vier eingebauten Fenster-Werkzeugen bereits angedockt — Map Generator, Pixler, Xtractor und Material Studio — gebunden an **Strg+Alt+G** (Cmd+Alt+G auf macOS) zum Ein-/Ausblenden. Es ersetzt das frühere `enableInspector: true` (entfernt in ADR 0024, da der Kern sonst konkrete Tool-Klassen kennen müsste). Siehe die jeweilige Anleitung jedes Werkzeugs für dessen Funktion. Die manuelle Einrichtung unten ist für den Bau **eigener** Werkzeuge gedacht, oder falls eine andere Fenster-Teilmenge gewünscht ist.

```typescript
import { SmallWorld } from "@small-world/engine";
import { attachDevTools } from "@small-world/tools";

const app = new MyGame();
attachDevTools(app);
app.start();
```
:::

Um eigene `ForgeTool`s (oder eine handverlesene Teilmenge der eingebauten) anzudocken, selbst eine `Forge` initialisieren und Fenster direkt darauf öffnen. Zu beachten: `Xtractor` *benötigt* einen `EventDispatcherImpl` als ersten Konstruktor-Parameter (genutzt für die Übergabe an Pixler), und `Pixler` akzeptiert optional einen (um diese Übergabe zu empfangen) — den eigenen `events`-Bus der `SmallWorld`-Instanz an beide übergeben, damit sie miteinander sprechen können:

```typescript
import { SmallWorld } from "@small-world/engine";
import { Forge, Pixler, Xtractor, MapGenerator } from "@small-world/tools";

class MyGame extends SmallWorld {
  public readonly myForge: Forge;

  constructor() {
    super();

    // 1. Das Forge-Overlay initialisieren und an die Taste '~' binden
    this.myForge = new Forge({ toggleKey: "~" });

    // 2. Werkzeuge in schwebenden Fenstern öffnen, `this.events` gemeinsam nutzen, damit Xtractor Ausschnitte an Pixler übergeben kann
    this.myForge.openWindow("Pixler Editor", new Pixler(this.events), 50, 50);
    this.myForge.openWindow("Map Generator", new MapGenerator(), 400, 50);
    this.myForge.openWindow("Asset Extractor", new Xtractor(this.events), 50, 400);
  }
}
```

Wird das Spiel gestartet und `~` gedrückt, erscheint ein halbtransparentes Overlay mit den angedockten Werkzeugen. Sprites lassen sich in Pixler zeichnen, in die Zwischenablage kopieren und sofort in die Asset-Konfigurationen des Spiels einfügen.

## Eigene Werkzeuge erstellen

Es lässt sich ein eigenes `ForgeTool` bauen, um bestimmte Teile der eigenen Spiellogik zu bearbeiten (z. B. ein Dialog-Editor, ein Quest-Tracker).

```typescript
import { ForgeTool, ForgeToolOptions } from "@small-world/engine";

export class MyCustomTool extends ForgeTool {
  constructor(options: ForgeToolOptions = {}) {
    super(options);
    
    // Die HTML-Oberfläche des Werkzeugs innerhalb von this._container bauen
    this._container.innerHTML = `
      <div style="padding: 10px; color: white;">
        <h3>My Tool</h3>
        <button id="my-btn">Click Me!</button>
      </div>
    `;

    this._container.querySelector("#my-btn")?.addEventListener("click", () => {
      console.log("Custom tool logic executed!");
    });
  }
}
```

Dann einfach injizieren:
```typescript
this.forge.openWindow("My Tool", new MyCustomTool(), 100, 100);
```
