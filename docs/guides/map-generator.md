# Map Generator (Raster-Level-Editor)

**Map Generator** ist ein manueller, Kachel-für-Kachel-Rastermaler zum Bauen von ASCII-Level-Layouts, die [`GridLevelBuilder`](/guides/extensions) in echte 3D-Geometrie verwandeln kann. Trotz des Namens generiert er nichts prozedural — versteht ihn eher als tabellenkalkulationsartiges Malwerkzeug für Leveldaten, nicht als Zufalls-Dungeon-Generator.

## Aktivieren

`enableInspector: true` in eurer `SmallWorld`-Konfiguration setzen, dann öffnet sich Map Generator als eines der angedockten Forge-Fenster:

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
Map Generator ist außerdem unter `/tools/map-gen.html` als in sich geschlossene Seite verfügbar — dieselbe Klasse, nur direkt in die Seite eingebunden statt in ein Forge-Fenster. Sie lädt vorab einen kleinen Demo-Raum, statt aus `localStorage` zu lesen.
:::

## Eine Karte malen

Das Raster startet bei 40×25 Zellen. Auf ein Farbfeld in der Palette klicken, um einen Kacheltyp auszuwählen, dann per Klick-und-Ziehen auf dem Canvas malen:

| Zeichen | Kachel | Zeichen | Kachel |
|---|---|---|---|
| `W` | Wand | `I` | Item |
| `G` | Wand 2 | `l` | Fackel |
| `+` | Tür | `T` | Lava |
| `O` | Geheimnis | `~` | Schleim |
| `P` | Spieler | `.` | Leer |
| `E` | Gegner | | |
| `b` | Fass | | |

Weitere Steuerelemente:

- **Resize** — neue `W`/`H`-Werte setzen und auf Resize klicken; bestehender Inhalt bleibt erhalten (oben-links verankert), neuer Bereich wird mit Leer aufgefüllt.
- **Bucket Fill (Empty)** — trotz des Namens kein Flood-Fill von einem Klickpunkt aus. Es ersetzt *jede* Leer-Zelle (`.`) im gesamten Raster durch die aktuell ausgewählte Kachel — nützlich, um vor dem Detaillieren einen Grundboden zu legen.
- **Clear Map** — setzt jede Zelle auf Leer zurück (fragt zuerst nach Bestätigung).
- **Export String / Import String** — führt die Karte per Textfeld als einfaches, zeilengetrenntes Zeichenraster hin und zurück, ein Zeichen pro Zelle.

Es gibt keine Tastaturkürzel — Malen erfolgt komplett per Maus — und kein Undo/Redo.

## In ein Spiel exportieren

Auf **▶ In YAD spielen** klicken, um die aktuelle Karte in `localStorage` zu speichern (Schlüssel `yad_custom_map`) und die [YAD](/guides/custom-game)-Showcase in einem neuen Tab zu öffnen, die diesen Schlüssel beim Start liest und statt ihres gebündelten Standard-Levels verwendet. Das ist der einzige Code-Pfad, der diesen Schlüssel schreibt; Map Generator und YAD lesen ihn nur zurück.

::: warning Map Generators Palette und YADs Legende stimmen nicht vollständig überein
YADs tatsächliche Level-Legende nutzt `1`/`2`/`3` für Leben-/Rüstungs-/Waffen-Items — sie liest `I` nie. Und obwohl YAD `lavaFloorChars: ["T"]` konfiguriert, hat seine Legende keinen `T`-Eintrag, sodass eine hier gemalte `T`-Kachel in YAD aktuell auf normalen Boden zurückfällt, statt als Lava zu rendern. Baut ihr Level speziell für YAD, behandelt die Palette des Editors als Ausgangspunkt, nicht als garantiertes 1:1-Mapping — schaut in YADs Legende in `src/apps/yad/App.ts`s `setupScene()` nach, was tatsächlich gerendert wird.
:::

## Den exportierten String selbst nutzen

Das Export-Format ist bewusst generisch gehalten — es sind schlicht Zeilen von Zeichen, eines pro Rasterzelle — und wird von `GridLevelBuilder.build(scene, mapString, config)` konsumiert, den ihr mit eurem eigenen `legend: Record<char, GridLegendEntry>`-Mapping konfiguriert, das jedes Zeichen einer `"block"`-, `"floor"`-, `"sprite"`- oder `"custom"`-Kacheldefinition zuordnet. Map Generator weiß nichts über die spezifische Kachel-Semantik eures Spiels — dieses Mapping liegt vollständig bei euch, wenn ihr `GridLevelBuilder` selbst aufruft. Siehe YADs `YadLevelBuilder` für ein durchgearbeitetes Beispiel, wie man spielspezifische Bedeutung (KI-fähige Gegner, animierte Türen, wippende Item-Pickups) über den Basis-Grid-Builder legt.

## Einschränkungen

- **Keine prozedurale Generierung** — trotz des Klassennamens ein manueller Maler.
- **"Bucket Fill" ist ein Ganz-Raster-Ersatz, kein Flood-Fill** von der angeklickten Zelle aus.
- **Kein Undo/Redo**, keine Tastaturkürzel, keine Mehrfach-Zellen-Auswahl oder Linien-/Rechteck-Werkzeuge.
- **Import-/Export-Asymmetrie**: Import trimmt Whitespace von *beiden* Enden jeder Zeile, während `GridLevelBuilder` nur nachgestellten Whitespace trimmt — vom Builder unterstützte "Einrückungs"-Tricks mit führenden Leerzeichen überleben einen Roundtrip über Import String nicht.
- **Keine Größenlimits oder Validierung** bei den Resize-Eingaben — sehr große Breiten-/Höhenwerte können den Browser beim Bauen des Canvas hängen lassen.
- Kartendaten sind in `localStorage` nicht versioniert — sobald ihr eine eigene Karte in YAD gespielt habt, bleibt sie unbegrenzt das aktive Level (überschreibt das gebündelte Level), bis sie manuell geleert wird.
