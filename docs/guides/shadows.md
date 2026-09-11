# Schatten

Small World rendert Echtzeit-Schatten über Shadow Mapping: Cascaded Shadow Maps (CSM) für
`DirectionalLight`, und einzelne Shadow Maps für `SpotLight`. Beide sind vollständig nur auf
**WebGL2 und WebGPU** implementiert — WebGL1 hat heute überhaupt keinen Shadow-Mapping-Pfad, dort werden
schattenbezogene Eigenschaften schlicht ignoriert.

## Überblick

Jedes Licht kann Schatten werfen, und jedes Objekt kann sie empfangen und/oder werfen:

```typescript
import { DirectionalLight, Object3D, Color } from "small-world";

const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.0 });
sun.direction.set(-1, -1, -1);
sun.castShadow = true;
scene.add(sun);

const cube = new Object3D("Cube");
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);
```

- `light.castShadow` (boolean, Standard `false`) — ob dieses Licht überhaupt eine Shadow Map rendert.
- `object.castShadow` / `object.receiveShadow` (boolean, jeweils Standard `false`) — ob dieses
  Objekt in Shadow Maps gerendert wird, und ob sein eigenes Shading sie sampelt.

## Gemeinsame Licht-Eigenschaften (`AbstractLight`)

Jedes schattenwerfende Licht teilt diese Stellschrauben:

- `shadowResolution` (Zahl, Standard `512`) — Texturgröße der Shadow Map. Directional Lights
  packen alle ihre Kaskaden in ein Atlas dieser Größe (siehe unten); Spot Lights bekommen
  eine Map dieser Größe pro Licht.
- `shadowBias` (Zahl) — Tiefen-Bias, um Shadow Acne zu vermeiden. Zu klein verursacht Acne
  (Selbstschattierungs-Streifen); zu groß verursacht Peter-Panning (der Schatten löst sich sichtbar
  von seinem Werfer).
- `shadowNormalBias` (Zahl) — Normal-Offset-Bias: statt nur den verglichenen Tiefenwert zu
  verschieben, wird die *Sample-Position* der Shadow Map entlang der Oberflächennormale verschoben
  (skaliert mit NdotL, siehe `REFERENCES.md`s Catlike-Coding-Quellenangabe). Reduziert Acne und
  Peter-Panning gleichzeitig, sodass ihr in der Praxis viel weniger `shadowBias` braucht, sobald das
  eingestellt ist.

## Cascaded Shadow Maps (Directional Light)

`DirectionalLight` teilt das Kamerafrustum in mehrere Kaskaden auf — nahe Kaskaden bekommen mehr
vom Texel-Budget der Shadow Map (schärfere Schatten nahe der Kamera), ferne Kaskaden decken mehr
Weltraum-Fläche bei geringerer Texeldichte ab.

```typescript
const sun = new DirectionalLight({
  numCascades: 4, // Standard; 1-4 unterstützt
  cascadeSplitLambda: 0.5, // 0 = gleichmäßige Splits, 1 = logarithmische Splits
});
```

Auf WebGL2 teilen sich alle Kaskaden ein einziges Shadow-Map-**Textur-Atlas** (gepackt in ein
`ceil(sqrt(numCascades))`-Spalten-Raster), sodass `shadowResolution` die Größe des *Atlas* ist,
nicht die Auflösung jeder einzelnen Kaskade. Auf WebGPU ist jede Kaskade eine Voll-Auflösungs-Ebene
eines `texture_depth_2d_array` — dort ist kein Atlas-Packing nötig.

Zwei Politur-Durchgänge laufen automatisch, ohne Konfiguration nötig:

- **Texel-Snapping** — das lichtraumbezogene Zentrum jeder Kaskade wird auf das eigene Texel-Raster
  dieser Kaskade gerundet, bevor die Ortho-Projektion gebaut wird, damit es nicht um Sub-Texel-Beträge
  driftet, während sich die Kamera glatt bewegt. Ohne das "flimmern"/"kriechen" CSM-Schatten sichtbar
  von Frame zu Frame.
- **Kaskaden-Blending** — nahe der fernen Kante einer Kaskade blendet der Shader zum Schatten-Sample
  der nächsten Kaskade über, statt hart abzuschneiden, sodass die Auflösungsnaht zwischen Kaskaden
  nicht sichtbar aufploppt, während die Kamera durch die Szene bewegt wird.

## Spot-Light-Schatten

`SpotLight` rendert eine einzelne perspektivische Shadow Map von der Position des Lichts aus,
geformt durch seine eigenen `angle`/`penumbra`/`distance`-Werte. Keine Kaskaden, kein Texel-Snapping
(ein einzelnes perspektivisches Frustum flimmert nicht auf dieselbe Weise wie CSMs gekachelte
Ortho-Frustums).

## Filterung: PCF und PCSS

Beide Lichttypen nutzen **Percentage-Closer Filtering** (PCF) — ein 3×3-Tap-Mittelwert um das
Shadow-Map-Sample herum, der die harte binäre Im-Schatten/Außerhalb-des-Schattens-Kante weichzeichnet
(siehe `REFERENCES.md` für das ursprüngliche Reeves/Salesin/Cook-Paper von 1987).

Directional-Light-Schatten gehen mit **PCSS** (Percentage-Closer Soft Shadows, Fernando 2005) noch
einen Schritt weiter: eine *Blocker-Suche* liest die rohe (nicht-vergleichende) Shadow-Map-Tiefe um
das Sample herum, um abzuschätzen, wie weit der nächste Verdecker entfernt ist, und skaliert dann den
PCF-Radius basierend auf dieser Distanz — Schatten lesen sich direkt am Kontaktpunkt scharf und
werden progressiv weicher, je weiter sie von ihrem Werfer entfernt sind, statt überall gleichmäßig
weich zu sein. Das gilt nur für die **primäre** Kaskade, in die ein Fragment fällt; das sekundäre
Kaskaden-Blend-Sample (siehe oben) nutzt weiterhin PCF mit festem Radius, um die Kosten in der
Blend-Zone nicht zu verdoppeln. **Spot-Light-Schatten nutzen nur PCF mit festem Radius** — kein
PCSS — da sie in heutigen Szenen typischerweise kleiner/weniger prominent sind; siehe
`docs/research/aaa-engine-techniques.md` für den genauen Umfang und die Abwägungsgründe.

## Tuning-Tipps

- Startet mit `shadowNormalBias` um `0,02–0,05` und `shadowBias` um `0,001–0,005`; erhöht zuerst
  `shadowNormalBias`, wenn ihr Acne seht, da das Acne behebt, ohne — wie ein Erhöhen von `shadowBias` —
  Peter-Panning einzuführen.
- Ein Erhöhen von `numCascades` schärft nahe Schatten, kostet aber mehr Atlas-Platz pro Kaskade auf
  WebGL2 (jede Kaskade bekommt eine kleinere Scheibe desselben `shadowResolution`-Atlas) — erhöht
  `shadowResolution` mit, wenn Kaskaden anfangen, blockig auszusehen.
- Schatten sind relativ teuer; der Auto-Downgrade-Pfad der Engine (`DeviceCaps`) senkt
  `maxShadowResolution` auf Geräten niedriger Performance-Stufe (siehe `docs/guides/configuration.md`).
