# Konfiguration (EngineOptions)

Small World ist auf umfangreiche Konfigurierbarkeit ausgelegt. Durch Übergabe eines `EngineOptions`-Objekts an den `SmallWorld`-Konstruktor lassen sich Rendering-Fähigkeiten, Post-Processing-Pipelines, Qualitätsgrenzen und Physik feinabstimmen.

> **Hinweis:** Die Engine versuchte früher, `small-world.json` zur Laufzeit über einen internen HTTP-Request zu laden. Das wurde zugunsten von **Inversion of Control (IoC)** entfernt. Die Konfiguration muss jetzt explizit übergeben werden.

## Grundlegende Einrichtung

In modernen Build-Tools wie Vite oder Webpack kann die JSON-Datei einfach importiert und an die Engine übergeben werden.

```typescript
import config from "./config/small-world.json"; // Der Bundler übernimmt das automatisch
import { SmallWorld } from "small-world";

class MyGame extends SmallWorld {
  constructor() {
    super(config); // Konfiguration injizieren
  }

  protected async setupScene() {
    // ...
  }
}
```

## Die EngineOptions-Struktur

Das `EngineOptions`-Objekt definiert den gesamten Zustand der Kern-Engine. Unten stehen die wichtigsten Abschnitte des Konfigurationsobjekts.

### Wurzel-Optionen

- `canvasId` (string): Die ID des HTML-Canvas-Elements, in das gerendert wird.
- `rendererType` (string): Der bevorzugte Renderer (z. B. `BEST`, `WEB_GPU`, `WEB_GL2`).
- `projectionType` (string): Entweder `PERSPECTIVE` oder `ORTHOGRAPHIC`.
- `fullscreen` (boolean): Ob das Canvas automatisch auf die Fenstergröße skalieren soll.
- `gravity` (number[]): Ein 3-elementiges Array, das den Physik-Schwerkraftvektor definiert (z. B. `[0, -9.81, 0]`).

### Renderer-Backend-Attribute (`renderer`)

Kontext-Attribute pro Backend (an `getContext()` übergeben), nach Backend-Namen indiziert — **keine** Fallback-Reihenfolge-Liste. Die tatsächliche Fallback-Kette (WebGPU → WebGL2 → WebGL1, wenn ein Backend nicht unterstützt wird) ist fest in der Engine verdrahtet und hängt überhaupt nicht von diesem Objekt ab — es gibt hier also kein `type`-getaggtes Array, wie es sonst vielleicht nötig erscheinen könnte.

```json
"renderer": {
  "WEB_GPU": {},
  "WEB_GL2": { "attributes": { "antialias": false } },
  "WEB_GL1": {}
}
```

### Qualitäts-Optionen (`quality`)

Diese steuern die grafische Wiedergabetreue der Engine.

- `autoDowngrade` (boolean, Standard: true): Bei `true` überschreibt die Engine automatisch aufwendige Einstellungen (wie MSAA oder HDR), sobald sie ein leistungsschwaches Gerät erkennt (z. B. Smartphones).
- `maxPixelRatio` (number, Standard: 2): Begrenzt `window.devicePixelRatio`. Extrem hochauflösende Displays (wie moderne Smartphones mit 3.0 oder 4.0 DPR) können massive GPU-Engpässe verursachen. Dies auf `2` oder `1.5` zu begrenzen sorgt für flüssige Framerates ohne sichtbaren Qualitätsverlust.
- `msaa` (number): Multisample-Anti-Aliasing-Stufe (0, 2, 4, 8).
- `maxAnisotropy` (number): Anisotrope-Filterung-Stufe (1, 4, 8, 16) für schärfere Texturen bei flachen Blickwinkeln.
- `hdr` (boolean): Aktiviert High-Dynamic-Range-(Float16-)Rendering-Pipelines.
- `toneMapping` (string): Der zu verwendende Tone-Mapping-Algorithmus (z. B. `aces`, `reinhard`, `none`).
- `maxShadowResolution` (number): Maximale Texturgröße für Shadow Maps.
- `disableTextures` (boolean): Bei `true` werden alle Texturen umgangen und Fallback-Farben gerendert (nützlich zum Debuggen).

### Post-Processing (`postProcessing`)

Konfiguriert die Post-Processing-Pipeline. Allgemeine Pipeline-Einstellungen (`enabled`, `filterMode`) sitzen auf oberster Ebene; die eigenen einstellbaren Werte jedes einzelnen Effekts sind eine Ebene tiefer verschachtelt, unter `effects` — ein flaches Objekt mit einem optionalen Schlüssel pro Effekt, kein `type`-getaggtes Array (die Effekt-Reihenfolge der Pipeline ist intern fest verdrahtet, nicht von der Config-Reihenfolge abhängig). Jeder einzelne Effekt hat außerdem sein eigenes `enabled`-Flag, sodass Einstellungen für einen Effekt hinterlegt werden können, ohne ihn schon einzuschalten.

```json
"postProcessing": {
  "enabled": true,
  "effects": {
    "toneMapping": { "enabled": true, "mode": "aces", "exposure": 1.0, "gamma": 2.2 },
    "vignette": { "enabled": true, "offset": 0.8, "darkness": 0.5, "roundness": 2.0 },
    "grain": { "enabled": true, "intensity": 0.05 },
    "bloom": { "enabled": true, "threshold": 1.0, "softThreshold": 0.5, "intensity": 1.0, "radius": 0.85 },
    "quantize": { "enabled": false, "steps": 8 },
    "hbao": { "enabled": false, "radius": 0.5, "intensity": 1.0 },
    "taa": { "enabled": false, "feedback": 0.9 },
    "motionTrail": { "enabled": false, "feedback": 0.92 }
  }
}
```

Jedes Feld ist optional und überschreibt nur diesen bestimmten Wert oberhalb des eigenen Standards des Effekts — Felder, die nicht geändert werden sollen, müssen nicht angegeben werden.

- **`bloom`** — weiches Glühen um helle Bereiche via Dual-Kawase-Filter-Weichzeichnung (siehe `REFERENCES.md`). `color` kann auch als `{ "r", "g", "b" }` oder ein 3-elementiges Array gesetzt werden.
- **`vignette`** / **`grain`** / **`quantize`** — klassische Randabdunkelung, Filmkorn-Rauschen bzw. Farbbänderung/Posterisierung.
- **`hbao`** — Screen-Space Ambient Occlusion (ein vereinfachtes HBAO, kein GTAO — siehe `docs/research/aaa-engine-techniques.md` für den genauen Umfang). Nur WebGL/WebGPU.
- **`taa`** — vereinfachtes temporales Anti-Aliasing: Subpixel-Kamera-Jitter + eine exponentielle History-Überblendung, keine Bewegungsvektor-Reprojektion. Glättet Kanten in statischen/langsamen Szenen; sichtbares Geistern bei schneller Bewegung. Nur WebGL/WebGPU.
- **`motionTrail`** — ein *bewusster* Geister-/Nachbild-Effekt (kein Anti-Aliasing), der denselben History-Überblendungs-Mechanismus wie `taa` mit deutlich höherem Feedback-Wert wiederverwendet. Nur WebGL/WebGPU.

### Projektionen & Audio

- `projection`: Kamera-Optionen wie `fov`, `near`, `far` usw.
- `audio`: Sound-Konfigurationen (z. B. globale Lautstärke, Distanzmodell).

## Vollständiges Konfigurationsbeispiel

```json
{
  "canvasId": "SmallWorld",
  "rendererType": "BEST",
  "projectionType": "PERSPECTIVE",
  "fullscreen": true,
  "gravity": [0, -9.81, 0],
  "quality": {
    "autoDowngrade": true,
    "maxPixelRatio": 2,
    "hdr": true,
    "toneMapping": "aces",
    "msaa": 4,
    "maxAnisotropy": 16,
    "maxShadowResolution": 2048
  },
  "postProcessing": {
    "enabled": true,
    "effects": {
      "bloom": { "enabled": true, "intensity": 0.8 }
    }
  }
}
```
