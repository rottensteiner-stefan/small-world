# Material Studio (PBR-Map-Generator)

::: tip Was dieses Werkzeug tatsächlich ist
Der Name legt einen Material-*Editor* nahe — etwas, das euch erlaubt, ein `StandardMaterial`/`GlassMaterial` an einem ausgewählten Szenenobjekt anzupassen, so wie es [Maker](/guides/maker) tut. Das ist es nicht. **Material Studio ist ein PBR-Textur-Map-Generator**: ihr gebt ihm ein Diffuse-Bild, und er leitet daraus über 2D-Bildverarbeitungs-Heuristiken eine Height-, Normal-, Specular-, Roughness-, Ambient-Occlusion- und Edge-Map ab — und lässt euch das Ergebnis dann auf einem Beispiel-Mesh in einer isolierten Sandbox-Szene vorschauen. Er rührt eure tatsächlich laufende Spielszene nie an.
:::

## Aktivieren

`enableInspector: true` in eurer `SmallWorld`-Konfiguration setzen, dann öffnet sich Material Studio als eines der angedockten Forge-Fenster:

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
Ein enger Verwandter lebt unter `/tools/pbr-gen.html` — er dupliziert dieselbe Bildverarbeitungs-Pipeline und UI inline (statt die `MaterialStudio`-Klasse zu importieren) und nutzt aus dem gemeinsamen Modul nur die 3D-Vorschau-Hälfte (`MaterialStudioApp`) wieder. Behandelt ihn als separat gepflegten Fork, nicht als dünnen Wrapper.
:::

## Ein Quellbild laden

Ein Bild per Drag-and-Drop auf die Dropzone ziehen, darauf klicken, um einen Dateiauswahl-Dialog zu öffnen, oder direkt einfügen (`Strg/Cmd+V`, während Material Studio das oberste Forge-Fenster ist). PNG/JPG/WebP bis 8MB. Ist nichts geladen, wird standardmäßig eine gebündelte Stein-Textur verwendet — und fällt auf eine synthetische, prozedurale Rausch-Textur zurück, falls selbst das nicht geladen werden kann.

## Maps erzeugen

Ein "Preset Profile"-Dropdown (Default, Stone, Metal, Wood) setzt einen Ausgangspunkt für sieben Gruppen von Reglern, von denen jede eine abgeleitete Map einstellt:

- **Height Map** — Blur-Radius, Kontrast, Invertieren.
- **Normal Map** — Bump-Stärke, OpenGL-/DirectX-Format, Rotkanal invertieren.
- **Specular Map** — sigmoidaler Kontrast und Mittelpunkt-Schwellenwert.
- **Roughness Map** — Gamma-Exponent.
- **Ambient Occlusion** — Weichschatten-Blur, Kerbenstärke, Intensität.
- **Edge Map** — Kontrast-Schwellenwert und Dicke.
- **3D-Vorschau** — Metallic-Basis und Roughness-Override, die nur die lokale Vorschau betreffen, keine exportierte Map.

Jede Regler-Änderung verarbeitet das Bild sofort neu (mit einem kurzen Lade-Overlay). Bei höheren "Working Max Resolution"-Einstellungen (1024px oder Originalgröße) läuft diese Neuberechnung im Hauptthread und kann die UI für einen Moment merklich stocken lassen — der Kompromiss dafür, keine Worker-basierte Pipeline auszuliefern.

::: warning Das sind schnelle Näherungen, keine gebackenen PBR-Maps
Normal Maps entstehen aus einem Sobel-Gradienten über die Luminanz der Height Map, nicht aus einem echten High-to-Low-Poly-Bake. Ambient Occlusion ist eine Laplace-Kerben-plus-Blur-Heuristik, nicht raytraced oder SSAO. Specular/Roughness sind Gamma-/Sigmoid-Kurventransformationen derselben Höhendaten. Das ist ein echt nützlicher Schnellstart für ein plausibel aussehendes Material, kein physikalisch akkurater Map-Backer — erwartet kein Studio-Niveau-Ergebnis aus einem einzelnen Diffuse-Foto.
:::

## Vorschau und Export

Zwischen Tabs wechseln, um eine einzelne Map, das volle Raster aller sieben, oder eine **"Small World Engine Preview"** anzusehen — eine live, automatisch rotierende Sphere/Cube/Torus/Plane, gerendert mit euren erzeugten Maps auf einem `StandardMaterial`, in Material Studios eigener isolierter Vorschau-Szene (sie hat nichts mit der tatsächlichen Szene oder den Objekten eures Spiels zu tun).

Export ist reines PNG, kein Bündeln:

- Klick auf das Canvas einer einzelnen Map, oder deren Download-Icon in der Rasteransicht, speichert diese eine Map als `<dateiname>_<maptyp>.png`.
- **Download All Maps** löst alle sechs Downloads (Height/Normal/Specular/Roughness/AO/Edge) nacheinander aus — es gibt kein Zip-Bündeln.

Es gibt keinen Material-JSON-Export und keine Möglichkeit, das Ergebnis zurück auf ein Objekt in eurer laufenden Szene anzuwenden — die erzeugten Texturen in euer tatsächliches Spiel zu übernehmen ist ein manueller Schritt (die heruntergeladenen PNGs so laden wie jedes andere Textur-Asset).

## Einschränkungen

- **Nur `StandardMaterial` wird unterstützt** — es gibt keinen Materialtyp-Selektor, und keine der anderen Material-Klassen der Engine (Glass, Terrain, Phong, eigene Shader usw.) ist irgendwo in diesem Werkzeug repräsentiert.
- **Keine Szenen-Integration.** Ihr könnt kein lebendes Objekt/Material auswählen und bearbeiten — alles passiert in einer isolierten Vorschau-Sandbox.
- **Keine Persistenz.** Das erneute Öffnen des Fensters startet immer mit dem Standardbild und Standard-Preset; nichts, was ihr konfiguriert habt, überlebt ein Neuladen.
- **Nur PNG-Export**, kein Material-Konfigurations-JSON, kein Zip-Bündeln der sechs Maps.
- Die erzeugten Maps sind approximative, bildverarbeitungsbasierte Heuristiken — siehe die Warnung oben.
