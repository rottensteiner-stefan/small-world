# Pixler (Pixel-Art-Editor)

**Pixler** ist ein Pixel-Art-Editor im Retro-Stil, den ihr öffnen könnt, ohne euer Spiel zu verlassen — ein Sprite zeichnen, in die Zwischenablage kopieren und direkt in eure Asset-Pipeline einfügen.

## Aktivieren

`enableInspector: true` in eurer `SmallWorld`-Konfiguration setzen, dann öffnet sich Pixler als eines der angedockten Forge-Fenster:

```typescript
import { SmallWorld } from "small-world";

class MyGame extends SmallWorld {
  constructor() {
    super({ enableInspector: true });
  }
}
```

**Strg+Alt+G** (oder **Cmd+Alt+G**) drücken, um das Forge-Overlay ein-/auszublenden.

::: tip Eigenständige Seite
Pixler ist außerdem unter `/tools/pixler.html` als in sich geschlossene Seite verfügbar — dieselbe Klasse, nur direkt in die Seite eingebunden statt in ein Forge-Fenster. Der eine funktionale Unterschied: Die eigenständige Seite hat keinen Engine-Event-Bus, kann also keine über [Xtractor](/guides/xtractor)s "An Pixler senden"-Übergabe geschobenen Bilder empfangen, stellt aber `window.pixlerInstance` für Konsolenzugriff bereit.
:::

## Werkzeuge

Vier Werkzeuge, umschaltbar über die Toolbar oder ein Tastaturkürzel:

| Werkzeug | Taste | Anmerkungen |
|---|---|---|
| Stift | `P` | Standardwerkzeug; Einzelpixel-Zeichnen. Rechtsklick radiert. |
| Bucket Fill | `F` | Flood-Fill passend zur exakten Farbe unter dem Klick. |
| Farbpipette | `I` | Sampelt die Farbe unter dem Cursor. `Alt`+Klick funktioniert als einmalige Auswahl, unabhängig vom aktiven Werkzeug. |
| Linie | `L` | Bresenham-Linie zwischen aufeinanderfolgenden Klicks, sodass ihr Segmente verketten könnt. `Shift`+Klick zeichnet ebenfalls eine Linie, unabhängig vom aktiven Werkzeug. |

## Canvas, Palette und Raster

- **Größe** — startet bei 32×32px bei 16-fachem Zoom; die `W`/`H`-Eingaben skalieren sie, während bestehende Pixeldaten erhalten bleiben.
- **Zoom** — eine numerische Eingabe, kein Mausrad; es gibt kein Zoom-Kürzel.
- **Palette** — ein Dropdown aus sechs eingebauten Paletten (Default, EGA, VGA, PICO-8, Game Boy, Grayscale). Zifferntasten `1`–`9` springen direkt zu einem Paletten-Slot.
- **GridX/GridY** — ein sekundäres magentafarbenes Overlay-Raster, rein zur visuellen Referenz (z.B. um Kachelgrenzen zu markieren) — es beeinflusst den Export in keiner Weise, es gibt keinen gekachelten/Mehrfach-Frame-Export.

## Symmetrie-Modus

Zwei unabhängige Umschalter (X-Achse 🪞X und Y-Achse 🪞Y) spiegeln jeden Stift- und Linien-Strich beim Zeichnen — beide aktivieren für 4-Wege-Symmetrie. Wichtig zu wissen: **Bucket Fill respektiert den Symmetrie-Modus nicht** — nur direkte Stift-/Linien-Striche werden gespiegelt.

## Bearbeiten

- **Undo/Redo** — `Strg/Cmd+Z` und `Strg/Cmd+Shift+Z`, bis zu 50 Schritte.
- **Pan** — `Shift` + Pfeiltasten/WASD verschiebt den Sprite-Inhalt, wobei er an den Kanten umbricht (das bewegt Pixeldaten, nicht das Viewport).
- **Flip** — nur per Tastatur: `Strg/Cmd+Shift` + Hoch/Runter (oder W/S) spiegelt vertikal, `Strg/Cmd+Shift` + Links/Rechts (oder A/D) spiegelt horizontal. Es gibt keinen Toolbar-Button und **kein Rotieren** — nur die beiden Spiegelachsen existieren.
- **Trim** — der ✂️-Button schneidet automatisch auf die Bounding-Box des Nicht-Hintergrund-Inhalts zu. "Hintergrund" bedeutet vollständig transparente Pixel, oder Pixel, die zur aktuell ausgewählten Farbe passen, falls diese Farbe nicht transparent ist (so könnt ihr auch einen einfarbigen Rand wegschneiden, nicht nur Transparenz).
- **Clear** — löscht das Canvas (mit zuvor gespeichertem Undo-Schritt).
- **A-Z-Vorlage** — lädt eine eingebaute Bitmap-Schriftart als Ausgangspunkt.

Vollständige Kürzel-Referenz: Pfeiltasten/WASD bewegen eine Cursor-Zelle für Zelle (zeichnet, während ein Strich aktiv ist), `Leertaste` zeichnet am Cursor, `X`/`Entf`/`Rücktaste` radieren am Cursor. Kürzel sind ausgesetzt, während ein Texteingabefeld fokussiert ist.

## Sprites rein- und rausbekommen

- **Copy as Base64** — der 📋-Button kopiert eine PNG-Data-URL in die Zwischenablage.
- **Copy as Image** — der 💾-Button schreibt einen echten PNG-Blob in die Zwischenablage, sodass ihr ihn in andere Apps einfügen könnt (oder direkt zurück in Pixler, oder ein anderes Werkzeug).
- **Einfügen** — `Strg/Cmd+V`, während Pixler das oberste sichtbare Forge-Fenster ist, lädt, was auch immer sich auf eurer Zwischenablage befindet.
- **Von Xtractor** — siehe [Xtractor](/guides/xtractor)s "An Pixler senden"-Button, der einen Ausschnitt direkt an die Pixler-Instanz schiebt, die auf dem gemeinsamen Event-Bus lauscht.

Es gibt kein Dateisystem-Speichern/Laden — Export erfolgt nur über die Zwischenablage — und keine Sprite-Sheet-/Animations-Frame-Unterstützung; das ist ein Editor für einzelne statische Bilder.

## Einschränkungen

- **Nur ein einzelnes Bild** — keine Frames, keine Animation, kein gekachelter Sprite-Sheet-Export (das GridX/GridY-Overlay ist nur visuelle Hilfe).
- **Kein Rotieren**, nur horizontales/vertikales Spiegeln.
- **Bucket Fill ignoriert den Symmetrie-Modus.**
- **Sprite-Inhalt wird im angedockten Forge-Fenster nicht über Neuladen hinweg persistiert** — `getState()`/`setState()` existieren an der Klasse, aber der Forge-Fenstermanager ruft sie nie auf, sodass nur der Öffnen-/Geschlossen-Zustand des Fensters ein Neuladen überlebt, nicht das, was ihr gezeichnet habt.
- Die eigenständige Seite kann keine Pushes von Xtractor empfangen (kein gemeinsamer Event-Bus) und hat kein eigenes Paste-Routing über das hinaus, was die Klasse selbst bietet.
