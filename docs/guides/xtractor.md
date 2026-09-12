# Xtractor (Bild-Zuschnitt & -Schnitte)

Sprites aus einem Referenzblatt oder Screenshot herauszuziehen bedeutet normalerweise einen Umweg über einen externen Bildeditor. **Xtractor** ist eine In-Browser-Werkbank, um ein Bild zu laden, einen Bereich davon auszuwählen und diesen Ausschnitt direkt an [Pixler](/guides/pixler) zur weiteren Pixel-Bearbeitung zu übergeben — ohne die Seite zu verlassen.

## Aktivieren

Wie die anderen eingebauten Entwickler-Werkzeuge wird Xtractor automatisch verdrahtet, sobald ihr `enableInspector: true` in eurer `SmallWorld`-Konfiguration setzt:

```typescript
import { SmallWorld } from "small-world";

class MyGame extends SmallWorld {
  constructor() {
    super({ enableInspector: true });
  }
}
```

**Strg+Alt+G** (oder **Cmd+Alt+G**) drücken, um das Forge-Overlay zu öffnen, in dem Xtractor als "Asset Extractor"-Fenster erscheint.

::: tip Eigenständige Seite
Xtractor ist außerdem unter `/tools/xtractor.html` als in sich geschlossene Seite verfügbar. Beachtet, dass es sich um eine **separate, von Hand duplizierte Kopie** des HTML/CSS/JS des Werkzeugs handelt, nicht um einen dünnen Wrapper um dieselbe Klasse — Feature-Parität zwischen beiden wird von Hand gepflegt. Die eigenständige Seite hat keinen gemeinsamen Event-Bus, kann also Ausschnitte nicht an Pixler übergeben (siehe [Einschränkungen](#einschraenkungen) unten).
:::

::: warning Noch nicht Teil des veröffentlichten Pakets
`Xtractor` lebt in `packages/engine/src/tools/` und wird noch nicht vom Root-Einstiegspunkt der Engine re-exportiert. `enableInspector: true` ist heute der unterstützte Weg, es zu nutzen.
:::

## Ein Bild laden

Drei Wege, ein Bild auf das Canvas zu bekommen, die alle im selben 1:1-Pixelmaßstab-Canvas landen (Zoom auf dem Bildschirm ist CSS-Skalierung, kein Resampling):

- **Hochladen** — der "Upload Image"-Button öffnet einen Dateiauswahl-Dialog.
- **Drag & Drop** — eine Bilddatei irgendwo auf das Canvas ziehen.
- **URL** — eine URL in das Textfeld einfügen und "Load" klicken. Cross-Origin-Bilder, die keine freizügigen CORS-Header senden, laden nicht; Xtractor zeigt eine erklärende Meldung statt die Anfrage zu proxen — das Bild herunterzuladen und lokal hochzuladen ist der verlässliche Fallback.
- **Aus der Zwischenablage einfügen** — `Strg/Cmd+V`, während Xtractor das oberste sichtbare Forge-Fenster ist, fügt ein Bild direkt aus eurer Zwischenablage ein. Das funktioniert nur, wenn Xtractor im Forge-Overlay angedockt ist; die eigenständige Seite hat kein Paste-Handling.

## Einen Bereich auswählen

Zwei Auswahlwerkzeuge, umschaltbar über die Toolbar:

- **Rect** (Standard) — per Klick-und-Ziehen eine rechteckige Auswahl zeichnen (mindestens 10×10px).
- **Circle** — dieselbe Klick-und-Zieh-Geste, schneidet aber auf einen elliptischen/kreisförmigen Bereich statt ein Rechteck zu.
- **Hand** — verschiebt das Canvas, statt eine Auswahl zu zeichnen.

Sobald eine Auswahl existiert, könnt ihr:

- Sie **ziehen**, um sie neu zu positionieren, oder die **X/Y/W/H**-Zahlenfelder für pixelgenaue Anpassung bearbeiten.
- Mit den +/- -Buttons oder `Strg` + Mausrad **zoomen** (10 %–1000 %, zoomt um den Cursor).
- Sie mit **Clear Selection** löschen.

## Einen Ausschnitt an Pixler senden

Sobald eine Auswahl existiert, erscheint über dem Chat-Panel eine Vorschau-Pille mit einem **"An Pixler"**-Button. Ein Klick darauf sendet den Ausschnitt (als PNG-Data-URL) direkt in das angedockte [Pixler](/guides/pixler)-Fenster über den gemeinsamen Event-Bus der Engine — das ist die eine voll funktionsfähige Werkzeug-übergreifende Integration in diesem Werkzeug. Eine entsprechende Übergabe an Map Generator oder Material Studio gibt es nicht.

## Das Chat-Panel

::: warning Das ist eine Attrappe, kein echter KI-Assistent
Das Chat-Panel rechts sieht aus wie ein KI-Assistent, ist aber mit keinem Vision-Modell oder Backend verbunden. Es ist eine fest verdrahtete, regex-basierte Demo: enthält eure Nachricht (bei aktiver Auswahl) ein Schlüsselwort wie "10", "slice" oder "schneide", zerschneidet es die Auswahl in 10 vertikale Streifen fester Breite und zeigt jeden als herunterladbares PNG. Alles andere bekommt eine generische "sag mir, was ich tun soll"-Antwort. Der Quellcode hat eine explizite `@DEVELOPER_NOTE`, die dies als Platzhalter für einen echten `fetch()`-Aufruf an ein Vision-Modell-Backend markiert.
:::

Das ist heute der einzige Export-Pfad im Werkzeug — es gibt keinen "Ausschnitt herunterladen"- oder "In Zwischenablage kopieren"-Button für eine Auswahl allein; ihr sendet sie entweder an Pixler oder bittet den Attrappen-Chat, sie in zehn Teile zu schneiden.

## Einschränkungen {#einschraenkungen}

- **PDF-Upload funktioniert nicht.** Der Dateiauswahl-Dialog akzeptiert PDFs, aber die Auswahl einer solchen zeigt nur eine Meldung, dass PDF-Unterstützung für "Phase 2" geplant ist — es existiert noch keine PDF.js-Integration.
- **Der Chat-Assistent ist vollständig attrappenhaft** (siehe oben) — es ist kein echtes KI-Backend angebunden.
- **Das Zerschneiden ist fest auf 10 gleiche vertikale Streifen verdrahtet.** Es gibt keine konfigurierbare Rastergröße, keine Zeilen, keinen Atlas-/Metadaten-Export — das bleibt weit hinter einem allgemeinen Sprite-Atlas-Generator zurück.
- **Kein Zustands-Erhalt.** Das Wiederöffnen des Forge-Fensters verliert euer geladenes Bild, die Auswahl und den Chat-Verlauf.
- **Die eigenständige `xtractor.html`-Seite ist eine separate Kopie** des Werkzeugs ohne Event-Bus — keine Pixler-Übergabe, kein Zwischenablage-Einfügen. Jedes Feature, das der echten `Xtractor`-Klasse hinzugefügt wird, muss von Hand dorthin portiert werden, um synchron zu bleiben.
