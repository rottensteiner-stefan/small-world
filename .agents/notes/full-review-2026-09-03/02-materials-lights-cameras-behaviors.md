# Review: Materials, Lights, Cameras, Behaviors, Showcase (`src/core/materials`, `src/core/lights`, `src/core/cameras`, `src/core/behaviors`, `src/core/showcase`)

**Reviewer:** Agent B · **Status:** ⚠️ mit kritischen Funden fertig

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

---

## 🔴 AreaLight wird von StandardMaterial (PBR) komplett ignoriert

`src/core/lights/AreaLight.ts:40-44` pusht sich korrekt in `data.aLights` (Cap `4`, siehe eigener
Fund weiter unten). Das Problem liegt auf der Konsum-Seite: **keiner der drei PBR-Lighting-Chunks**
wertet Area-Lights überhaupt aus:

- `src/core/renderers/shaders/source/web_gpu/chunks/lighting_pbr.wgsl` (komplett gelesen,
  Zeile 1-214) hat Directional-, Point- und Spot-Lights inkl. Clustered Lookup, IBL-Ambient,
  Emissive, Tonemapping — aber **keine einzige Zeile** zu `aLights`/`AreaLight`.
- `grep -n "AreaLight" src/core/renderers/shaders/source/web_gl2/chunks/light_calc_pbr.frag.glsl
  src/core/renderers/shaders/source/web_gl1/chunks/light_calc_pbr.frag.glsl` → keine Treffer.

Area-Lights werden ausschließlich vom **nicht-PBR** Lighting-Chunk (`LIGHT_CALC`, d.h.
`light_calc.frag.glsl` / `lighting.wgsl`) verarbeitet (`u_areaLights[4]` in
`src/core/renderers/shaders/source/web_gl2/chunks/lights.frag.glsl:59`,
`aLights[j]` in `src/core/renderers/shaders/source/web_gpu/chunks/lighting.wgsl:126-149`).
Welcher Chunk in ein Material eingebettet wird, ist rein statisch pro Material-Klasse (Platzhalter
im `.frag.glsl`-Template, kein Laufzeit-Fallback):

```
src/core/materials/shaders/Standard.frag.glsl:78:    [LIGHT_CALC_PBR]   <- StandardMaterial (PBR)
src/core/materials/shaders/Phong.frag.glsl:31:  [LIGHT_CALC]           <- PhongMaterial (legacy)
src/core/materials/shaders/Lambert.frag.glsl:26:  [LIGHT_CALC]         <- LambertMaterial (legacy)
src/core/materials/shaders/Terrain.frag.glsl:30:  [LIGHT_CALC]         <- TerrainMaterial (legacy)
```

**Failure-Szenario:** Ein Objekt mit `StandardMaterial` (die im Code als "physically based
rendering (PBR) material" dokumentierte, empfohlene Standard-Material-Klasse,
`StandardMaterial.ts:63`) steht neben einer `AreaLight` — auf allen drei Backends (WebGL1, WebGL2,
WebGPU) bekommt es schlicht keinen Lichtbeitrag von dieser Lampe, ohne Warnung, ohne
Degradation-Hinweis. Nur Objekte mit `PhongMaterial`/`LambertMaterial`/`TerrainMaterial` sehen die
Area-Light. Das ist kein dokumentierter Trade-off (kein ADR erwähnt AreaLight-PBR-Lücke, anders als
z.B. der PointLight/SpotLight-Cap in ADR 0004 oder die WebGL1/WebGL2-Scope-Grenzen in ADR 0006/0007)
— es sieht nach einer schlicht vergessenen Portierung aus, als die PBR-Pipeline (Standard-Material)
gebaut wurde, während Punkt-/Spot-/Directional-Lights alle korrekt in beide Chunk-Familien
übernommen wurden.

**Verifiziert:** `grep -rn "AreaLight\|areaLights\|numAreaLights"` über alle `*_pbr*`-Shader-Dateien
(GLSL100/GLSL300/WGSL) liefert keinen einzigen Treffer; derselbe Grep über die nicht-PBR-Pendants
(`light_calc.frag.glsl`, `lighting.wgsl`, `lights.frag.glsl`) liefert volle Area-Light-Blöcke
(Rect-Light-Diffuse/Specular-Berechnung inkl. `L_center`/`L_normal`/`L_right`/`L_up`/`size`).

**Fix-Richtung:** Area-Light-Block aus `lighting.wgsl`/`light_calc.frag.glsl` 1:1 in die drei
`*_pbr*`-Chunks übernehmen (die GGX-Spezularantwort bräuchte dafür idealerweise die
Closest-Point-on-Rect-Approximation, die im PBR-Kontext ohnehin genauer wäre) — oder, falls
AreaLight+PBR bewusst (noch) nicht unterstützt werden soll, das explizit dokumentieren (ADR oder
zumindest ein Kommentar an `AreaLight.applyTo()`), damit es nicht wie eine übersehene Lücke wirkt.

---

## 🟡 AreaLight-Cap ist ein unbenannter Magic-Number, PointLight/SpotLight haben eine benannte Konstante

`src/core/lights/AreaLight.ts:41`:

```ts
if (4 > data.aLights.length) {
  data.aLights.push(this);
}
```

Im Gegensatz dazu referenzieren `PointLight.applyTo()`/`SpotLight.applyTo()`
(`PointLight.ts:49`, `SpotLight.ts:124`) die dokumentierte, exportierte Konstante
`MAX_CLUSTERED_LIGHTS_PER_TYPE` aus `AbstractLight.ts:13`. Der Wert `4` bei AreaLight ist an
**vier weiteren Stellen** unabhängig hart codiert und muss von Hand synchron gehalten werden:

- `src/core/renderers/shaders/source/web_gl2/chunks/lights.frag.glsl:59` (`AreaLight u_areaLights[4]`)
- `src/core/renderers/shaders/source/web_gl2/chunks/base_vertex_header.vert.glsl:72` (dieselbe Deklaration)
- `src/core/materials/shaders/Liquid.vert.glsl:56` und `FluidSurface.vert.glsl:57` (dieselbe Deklaration)

Verstößt gegen die im `coding-guide`-Skill explizit genannte Regel "No Magic Strings/Numbers ... Check
`src/enums/` first" — hier böte sich ein exportierter `MAX_AREA_LIGHTS`-Const in `AreaLight.ts` (oder neben
`MAX_CLUSTERED_LIGHTS_PER_TYPE` in `AbstractLight.ts`) an, den zumindest die TS-Seite (`AreaLight.ts`)
referenziert; die GLSL-Deklarationen können den Wert nicht importieren, aber ein Kommentar mit Verweis auf
die TS-Konstante würde die Kopplung wenigstens sichtbar machen. Kein akuter Bug (Werte sind aktuell
konsistent bei `4`), aber eine stille Drift-Falle: würde jemand den Cap in `AreaLight.ts` erhöhen (z.B. auf
8), ohne alle vier Shader-Stellen mitzuziehen, würden überzählige Lights im JS-Array einfach über das Ende
des GLSL-Arrays hinauslaufen bzw. beim WebGPU-Storage-Buffer (`alDataSize = aLights.length * 24`, dynamisch,
kein Hardcap dort) inkonsistent zur GLSL-Seite werden.

---

## 🟠 CSM-Schattenkaskaden (DirectionalLight) brechen komplett unter ISOMETRIC-Kamera-Strategie

`src/core/lights/DirectionalLight.ts:90-94`:

```ts
public updateCascades(cam: CameraInterfaceData): void {
  if (!this.castShadow || this.numCascades <= 0) return;
  if (!cam.projection || cam.projection.type !== ProjectionType.PERSPECTIVE) {
    return;
  }
  ...
```

`updateCascades()` verlässt sich komplett auf `PerspectiveProjection` (`proj.fov`/`proj.aspect` für
`_updateFrustumCorners()`) und bricht mit einem stillen Early-Return ab, sobald die Hauptkamera eine
Orthographic-Projektion nutzt. Genau das ist aber der Fall, sobald die Kamera-Strategie `ISOMETRIC`
verwendet wird: `src/core/cameras/strategies/IsometricStrategy.ts:24-26` guarded selbst explizit auf
`camera.projection instanceof OrthographicProjection` — ISOMETRIC *ist* der dokumentierte,
first-class Anwendungsfall für Orthographic-Kameras in diesem Projekt (`CameraStrategy` in
`CONTEXT.md` nennt STIFF/SMOOTH/FPS/ISOMETRIC nebeneinander als gleichrangige Strategien).

**Failure-Szenario:** Eine isometrische Szene (z.B. ein Strategiespiel/Diorama-Showcase) mit einer
schattenwerfenden `DirectionalLight` — die Kaskadenkameras werden nach dem initialen Konstruktor-Setup
(`left/right/bottom/top = -10..10`, hartcodierte Box um den Ursprung, `DirectionalLight.ts:72-79`)
**nie wieder aktualisiert**, weil `updateCascades()` bei jedem Frame sofort zurückkehrt. Ergebnis:
entweder komplett fehlende Schatten außerhalb dieser 20x20-Box, oder (falls die Renderer-Seite den
Erstzustand einfach weiterrendert) eingefrorene, an der Ursprungsbox klebende Schattenprojektion,
während die Kamera frei über die isometrische Szene schwenkt. Kein ADR erwähnt diese Einschränkung
(anders als z.B. ADR 0006, das WebGL2-Spot-PCSS explizit als bewussten Scope-Cut dokumentiert) — sieht
nach einer beim CSM-Bau schlicht nicht bedachten Kamera-Strategie aus, nicht nach Absicht.

**Nicht verifiziert per Test/Showcase** (kein laufender Browser in diesem Review-Scope), aber die
Codepfad-Logik ist eindeutig: `ProjectionType.PERSPECTIVE`-Guard + Orthographic-only ISOMETRIC-Strategie
schließen sich gegenseitig aus, ohne Fallback dazwischen.

**Fix-Richtung:** `updateCascades()` um einen zweiten Zweig für `OrthographicProjection` ergänzen (dort
sind die Frustum-Ecken trivialer als bei Perspective — direkt aus `left/right/bottom/top/near/far`
lesbar, kein `tan(fov/2)` nötig), oder zumindest den Early-Return durch ein einmaliges Warning/Log
sichtbar machen statt lautlos nichts zu tun.

---

## 🔴 `clone()` verspricht Unabhängigkeit, hält sie aber nur für `Vector3D`/`Quaternion`/`Color` — Vector2D/Array-Felder leaken

`AbstractMaterial.clone()` (`AbstractMaterial.ts:54-62`) dokumentiert explizit: "own `color`/other
value-type fields ... Used by `Object3D.clone()` (Maker's Duplicate command) so a duplicated
object's material edits don't leak back onto the original." Es delegiert an
`shallowCloneWithValueTypes()` (`src/core/CloneUtils.ts:22-38`), das aber **nur** Instanzen von
`Vector3D`, `Quaternion` und `Color` deep-cloned (Zeile 28: `if (value instanceof Vector3D ||
value instanceof Quaternion || value instanceof Color)`). Jedes andere mutierbare
Referenz-Feld — `Vector2D`, ein Plain-Array/Tuple, ein Plain-Object — läuft durch den vorherigen
`Object.assign(copy, source)` als **geteilte Referenz** durch, ohne dass irgendein Fehler oder
Test das anzeigt.

Betroffen sind alle Material-Subklassen, die **kein eigenes** `clone()` überschreiben (nur
`StandardMaterial` und `FrostglassMaterial` tun das, siehe `grep -n "override clone" src/core/materials/*.ts`)
und trotzdem ein Vector2D-/Array-Feld besitzen:

- `PhongMaterial.normalScale` (Vector2D, `PhongMaterial.ts:64`)
- `LambertMaterial.normalScale` (Vector2D, `LambertMaterial.ts:39`)
- `TerrainMaterial.thresholds` (`[number,number,number,number]`, `TerrainMaterial.ts:56`)
- `OpenWaterMaterial.wave1`/`wave2`/`wave3` (je `[number,number,number,number]`, `OpenWaterMaterial.ts:33-35`)

**Verifiziert** (Wegwerf-Test unter `tests/core/materials/_verify_clone_leak.test.ts`, danach
wieder gelöscht):

```ts
const original = new PhongMaterial();
const clone = original.clone() as PhongMaterial;
clone.normalScale.x = 999;
expect(original.normalScale.x).toBe(1); // FAILS: erhält tatsächlich 999
```

Beide Fälle (`PhongMaterial`, `LambertMaterial`) schlagen exakt so fehl — `clone.normalScale` und
`original.normalScale` sind dasselbe Objekt. `npx vitest run` bestätigt: `expected 999 to be 1` für
beide.

**Failure-Szenario:** Maker's "Duplicate"-Befehl (der explizit genannte Use-Case im Docblock)
dupliziert ein Objekt mit `PhongMaterial`/`LambertMaterial`, der Nutzer ändert danach im
Property-Panel `normalScale` **des Duplikats** — und die Änderung erscheint unerwartet auch am
Original. Bei `TerrainMaterial`/`OpenWaterMaterial` dieselbe Falle, sobald `thresholds`/`waveN` per
Index mutiert statt komplett neu zugewiesen werden (in Spielcode ein gängigeres Pattern als
Objekt-Reassignment, z.B. `mat.thresholds[0] = x` statt `mat.thresholds = [x, ...]`).

**Fix-Richtung:** entweder `shallowCloneWithValueTypes()` generisch um Vector2D und Array-Werte
erweitern (`Array.isArray(value)` → `[...value]`, `value instanceof Vector2D` → `value.clone()`),
oder jede betroffene Material-Klasse bekommt (wie `StandardMaterial`/`FrostglassMaterial` bereits
vorgemacht) ein eigenes `clone()`. Die generische Lösung in `CloneUtils.ts` ist die robustere, weil
sie zukünftige Vector2D-/Array-Felder automatisch mit abdeckt, statt bei jeder neuen Material-Klasse
erneut vergessen werden zu können.

*(Zusätzlich betroffen, gleiche Ursache: `CustomShaderMaterial.properties`/`.textures` — beides
Plain-`Record`-Objekte, siehe eigener Fund weiter unten — würden bei einem `.clone()`-Aufruf
ebenfalls unverändert als geteilte Referenz durchgereicht, auch wenn dort aktuell kein Call-Site
existiert, der `.clone()` auf `CustomShaderMaterial` aufruft.)*

**Derselbe Defekt betrifft auch `Behavior.clone()`** (`src/core/behaviors/Behavior.ts:43-47`,
identisches `shallowCloneWithValueTypes()`-Delegat) — z.B. `FlickerBehavior.options`
(`FlickerBehavior.ts:85`, ein Plain-Object mit `minStableTime`/`maxStableTime`/etc., dessen Felder
das Property-Panel per `path: "options.minStableTime"` direkt beschreibt, siehe
`FlickerBehavior.ts:41` und Konsorten). **Verifiziert** (Wegwerf-Test, danach gelöscht):

```ts
const original = new FlickerBehavior({ onUpdate: () => {}, minStableTime: 2.0 });
const clone = original.clone() as FlickerBehavior;
clone.options.minStableTime = 999;
expect(original.options.minStableTime).toBe(2.0); // FAILS: erhält tatsächlich 999
```

Duplizierte Objekte mit `FlickerBehavior` (z.B. ein Duplikat einer flackernden Lampe in Maker)
teilen sich also ihre `minStableTime`/`maxStableTime`/etc.-Werte mit dem Original, bis eine der
beiden Instanzen sie über den vollen `options`-Objektpfad neu zuweist. Dieser Fund ist somit kein
material-spezifisches, sondern ein `CloneUtils`-weites Problem, das jede `Behavior`/`Material`-Klasse
mit einem Plain-Object- oder Array-Feld betrifft, unabhängig vom konkreten Anwendungsfall.

---

## 🟠 `CustomShaderMaterial` mutiert das vom Aufrufer übergebene `layout`-Objekt in-place

`CustomShaderMaterial.ts:60-78` (Konstruktor): fehlen `u_texRepeat`/`u_texOffset` in
`options.properties`, schreibt der Konstruktor sie nicht nur auf `this.properties`, sondern auch
direkt in `this.layout.uniforms[...]` und pusht in `this.layout.uniformLayout` — und `this.layout`
ist exakt dieselbe Objektreferenz wie das vom Aufrufer übergebene `options.layout`
(`this.layout = options.layout;`, Zeile 49, keine Kopie):

```ts
if (this.layout.uniformLayout && !this.layout.uniformLayout.includes("u_texRepeat")) {
  this.layout.uniformLayout.push("u_texRepeat");
}
```

**Failure-Szenario:** `ShaderLayout`-Objekte beschreiben rein strukturelle Schema-Daten (welche
Uniforms/Texturen ein Shader erwartet) — genau die Art Wert, die man als Modul-Konstante einmal
definiert und für mehrere `CustomShaderMaterial`-Instanzen desselben Custom-Shaders wiederverwendet
(die Klasse ist laut Docblock explizit für wiederverwendbare "very specific visual effects"
gedacht). Wird dasselbe `layout`-Objekt an zwei `new CustomShaderMaterial({ layout, ... })`-Aufrufe
übergeben, mutiert die erste Instanz das gemeinsame Objekt (Push in `uniformLayout`), und die zweite
Instanz erbt diese Mutation bereits beim Lesen — nicht falsch an sich (dieselbe Ergänzung würde
ohnehin passieren), aber sobald ein Aufrufer das ursprüngliche `layout`-Objekt nach der
Material-Erzeugung noch selbst inspiziert oder für einen anderen Zweck weiterreicht, sieht er
unerwartet die von diesem Material injizierten Zusatzfelder.

**Fix-Richtung:** `this.layout = { ...options.layout, uniforms: { ...options.layout.uniforms },
uniformLayout: [...(options.layout.uniformLayout ?? [])] }` (flache Kopie der mutierten
Unterstrukturen) statt der aktuellen reinen Referenzübernahme.

---

## 🟡 `CustomShaderMaterial`/`DepthMaterial` allozieren `state` bei jedem Aufruf neu, statt in-place zu mutieren

`CustomShaderMaterial.ts:121-128` und `DepthMaterial.ts:81-87` machen beide dasselbe:

```ts
this._renderManifest.state = {
  ...this._renderManifest.state,
  depthTest: this.depthTest,
  ...
};
```

Jede andere Material-Klasse im Baum (`StandardMaterial`, `PhongMaterial`, `LambertMaterial`, etc.)
nutzt `AbstractMaterial._syncBaseManifestState()`, das denselben `state`-Objektverweis
wiederverwendet und nur seine Felder überschreibt (`AbstractMaterial.ts:118-128`) — passend zum
Kommentar "Cached render manifest to avoid frequent allocations" (`AbstractMaterial.ts:41`). Beide
Ausreißer erzeugen bei jedem `getRenderManifest()`-Aufruf ein frisches `state`-Objekt statt es zu
mutieren.

**Unterschiedliche Praxisrelevanz:** Bei `CustomShaderMaterial` (typischerweise wenige Instanzen für
gezielte Spezialeffekte) ist das vernachlässigbar. Bei `DepthMaterial` ist die Sache differenzierter:
`grep -n "_depthMaterial" src/renderers/passes/{DepthPrePassGPU,CascadedShadowPassGPU,SpotShadowPassGPU}.ts`
zeigt, dass alle drei Shadow-Passes **eine einzige geteilte** `DepthMaterial`-Instanz
(`this._depthMaterial ??= new DepthMaterial()`) verwenden und `getRenderManifest()` jeweils **einmal
pro Pass pro Frame** aufrufen (nicht pro Objekt) — also real 1-6x/Frame (Prepass + bis zu 4
CSM-Kaskaden + Spotlight-Schatten), nicht pro-Objekt-Frequenz. Die Allocation ist damit weniger
gravierend als zunächst vermutet, aber weiterhin unnötige Churn auf einem Pfad, der laut Kommentar
bewusst "extremely fast" sein soll (`DepthMaterial.ts:23`), und ein inkonsistentes Pattern gegenüber
jeder Schwesterklasse. Fix für beide: `Object.assign(this._renderManifest.state, { depthTest:
this.depthTest, ... })` statt Objekt-Spread mit Neuzuweisung.

---

## 🔴 Default-Farbe ist die eingefrorene `Color.WHITE`-Singleton-Referenz — jede In-Place-Farbänderung crasht

`Color.WHITE` ist bewusst als unveränderliche Konstante deklariert:

```ts
// src/core/colors/Color.ts:51
public static readonly WHITE: Color = Object.freeze(new Color(1, 1, 1, 1)) as Color;
```

Das ist für sich genommen ein gutes Pattern — bis auf die Tatsache, dass **sieben** Klassen in
genau meinem Scope diese eingefrorene Instanz standardmäßig direkt (ohne Kopie) als eigenes,
öffentlich-mutable Farbfeld übernehmen:

```ts
// AbstractLight.ts:91-100 -- betrifft PointLight/SpotLight/DirectionalLight/AmbientLight/AreaLight
const { color = Color.WHITE, ... } = options;
...
this.color = color;   // <- keine Kopie, direkte Referenz auf die gefrorene Singleton-Instanz
```

Dieselbe Machart in `StandardMaterial.ts:135+156`, `PhongMaterial.ts:79+89` (**zweimal**: `color`
*und* `specularColor`), `LambertMaterial.ts:44+49`, `TerrainMaterial.ts:65+75`,
`SkyboxMaterial.ts:39-40`, `WireframeMaterial.ts:30+34` (`grep -n "Color.WHITE" src/core/materials/*.ts`
bestätigt alle sechs Material-Fundstellen).

**Das Problem:** Jede Stelle im Projekt, die eine Materialfarbe/Lichtfarbe **in-place** ändert
(`color.r = x` oder `color.copyFrom(other)`, statt die ganze Objektreferenz zu ersetzen) wirft eine
`TypeError`, sobald das betroffene Objekt seine Default-Farbe nie explizit gesetzt bekommen hat —
was der mit Abstand häufigste Fall ist (`new StandardMaterial()`, `new PointLight()` ganz ohne
Farboption sind Alltag). Zwei konkrete, tatsächlich existierende Call-Sites, die genau das tun:

1. **`RainbowBehavior.update()`** (`src/core/behaviors/RainbowBehavior.ts:35,37`):
   `this.target.material.color.copyFrom(color)` bzw. `this.target.color.copyFrom(color)` — für
   jedes `Object3D`+`StandardMaterial` oder jedes `AbstractLight`, das seine Default-Farbe behalten
   hat, crasht das Behavior in seinem allerersten `update()`-Aufruf.
2. **Makers Property-Panel-Farbfeld** (`src/tools/maker/PropertyPanel.ts:489-497`, `_bindColorField`):
   `colorObj.r = ev.value.r / 255;` bei jedem Farb-Drag im Inspector — jedes frisch erzeugte,
   nie-explizit-eingefärbte Licht oder Material crasht beim ersten Versuch, seine Farbe im Maker zu
   verändern.

**Verifiziert** (zwei Wegwerf-Tests, danach gelöscht):

```ts
const mat = new StandardMaterial();
expect(mat.color).toBe(Color.WHITE);          // ✓ echte Referenzgleichheit, keine Kopie
expect(Object.isFrozen(mat.color)).toBe(true); // ✓ tatsächlich eingefroren
expect(() => { mat.color.r = 0.5; }).toThrow(); // ✓ wirft TypeError

// End-to-end über den echten Call-Pfad:
const obj = new Object3D("test");
obj.material = new StandardMaterial();
const behavior = new RainbowBehavior(1.0);
behavior.target = obj;
expect(() => behavior.update(0.1)).toThrow();  // ✓ wirft

const light = new PointLight();
behavior.target = light;
expect(() => behavior.update(0.1)).toThrow();  // ✓ wirft ebenfalls
```

Alle vier Assertions bestanden (`npx vitest run`, danach Testdateien wieder entfernt).

**Warum das bisher vermutlich nicht aufgefallen ist:** Showcases setzen fast immer eine explizite
`color`-Option, und `RainbowBehavior` dürfte bisher nur an Objekten mit bereits gesetzter Farbe
ausprobiert worden sein. Aber jede Kombination "Default-Objekt ohne Farboption" + "irgendein Code,
der die Farbe in-place animiert/editiert" ist strukturell kaputt, nicht nur ein Rand-Fall.

**Fix-Richtung:** Konstruktoren sollen bei fehlender Farboption eine **neue** `Color`-Instanz
anlegen (`new Color(1, 1, 1, 1)`, wie `GlassMaterial`/`FrostglassMaterial` es bereits richtig
machen, siehe `GlassMaterial.ts:35`), statt die gefrorene Singleton-Referenz zu teilen — analog zu
`AbstractMaterial.color = new Color(1, 1, 1)` (Instanzfeld-Default, `AbstractMaterial.ts:29`, das
korrekt eine frische Instanz anlegt). `Color.WHITE` bleibt dann ein reiner Lese-Referenzwert für
Vergleiche/Konstanten, aber niemals ein tatsächliches Default-Objektfeld.

---

## 🔴 `CameraStrategyFactory` liefert geteilte Singleton-Instanzen für zustandsbehaftete Strategien — Cross-Camera State-Leak

`CameraStrategyFactory.ts:14-22` legt **genau eine** Instanz pro `CameraStrategyType` als
Modul-/Klassen-weites statisches Konstrukt an:

```ts
private static _strategies = new Map<CameraStrategyType, CameraStrategy>([
  [CameraStrategyType.STIFF, new StiffStrategy()],
  [CameraStrategyType.SMOOTH, new SmoothStrategy()],
  [CameraStrategyType.HYBRID_SYNC, new HybridSyncStrategy()],
  ...
]);
public static get(type: CameraStrategyType): CameraStrategy {
  return this._strategies.get(type)!; // dieselbe Instanz bei jedem Aufruf
}
```

`Camera.setStrategy()` (`src/core/Camera.ts:184-190`) übernimmt diese Instanz **direkt als
Referenz**, ohne Kopie: `this._strategy = CameraStrategyFactory.get(type);` — und **jede** neue
`Camera` ruft `setStrategy()` bereits im Konstruktor auf (`Camera.ts:59`). Das Problem: mehrere der
Strategien sind **nicht zustandslos**, sondern tragen genau das pro-Kamera-Runtime-State, das die
Kamera-Orbit-Mathematik braucht:

- `StiffStrategy`/`SmoothStrategy`: `private _isInitialized: boolean`, `public radius: number`
  (`StiffStrategy.ts:16,24`, `SmoothStrategy.ts:16,26`)
- `HybridSyncStrategy`: `private _lastPosition: Vector3D`, `private _isInitialized: boolean`
  (`HybridSyncStrategy.ts:18-19`)

Jede `Camera`, die per `setStrategy(CameraStrategyType.STIFF)` (oder `SMOOTH`/`HYBRID_SYNC`) auf
dieselbe Strategie wechselt, bekommt **dasselbe** Objekt wie jede andere Kamera im selben
Page-Kontext, die ebenfalls diese Strategie nutzt — nicht nur innerhalb einer Engine-Instanz mit
mehreren Kameras (z.B. Split-Screen), sondern auch über mehrere `SmallWorld`-Instanzen auf
derselben Seite hinweg, da die Factory als reines statisches Klassenfeld lebt. Das ist exakt der
Fall, den das Projekt unter "No Global Singletons" (`AGENTS.md` #2: "Small World must support
multiple engine instances per page. Never use global singletons.") explizit verbietet — hier aber
über einen Factory-Layer eingeschleust, nicht offensichtlich als klassischer globaler Singleton
erkennbar. Vergleichbar mit dem bereits bekannten `[[project_frustumculler_static_pollution]]`-Muster
(statische Felder sind seitenweit, nie cross-instanz vertrauen).

**Verifiziert** (Wegwerf-Test unter `tests/core/cameras/_verify_strategy_singleton_leak.test.ts`,
danach gelöscht), drei Assertions, alle bestanden:

1. `camA.setStrategy(STIFF); camB.setStrategy(STIFF); expect(camA.strategy).toBe(camB.strategy)`
   → **wahr**, identische Objektreferenz.
2. `camA.setConstraints(A); camB.setConstraints(B)` → `camA.strategy.constraints` zeigt danach auf
   **Camera B's** Constraints-Objekt, nicht mehr auf Camera A's eigene — Kamera A's Constraints
   wurden von Kamera B's `setConstraints()`-Aufruf lautlos überschrieben.
3. **Konkretes Bewegungs-Bug-Szenario:** Kamera A steht bei `position.z = 50` (Radius 50 vom
   Ziel), wechselt zu `STIFF`, ruft `update()` auf → Singleton initialisiert `radius = 50`,
   `_isInitialized = true`. Kamera B steht tatsächlich nur 5 Einheiten vom Ziel entfernt
   (`position.z = 5`), wechselt ebenfalls zu `STIFF` und ruft `update()` auf — bekommt aber **keine**
   eigene Radius-Neuberechnung (weil `_isInitialized` vom geteilten Objekt bereits `true` ist) und
   wird stattdessen auf den fremden Radius `50` von Kamera A gesnappt. `camB.position.z` landet bei
   `50`, nicht bei den erwarteten `5`.

**Failure-Szenario:** Jede Multi-Kamera-Situation (Split-Screen, Kamera-Vorschau im Maker neben der
Haupt-Editor-Kamera, mehrere `SmallWorld`-Instanzen auf einer Seite) mit mindestens zwei Kameras,
die dieselbe nicht-manuelle Strategie nutzen, produziert sofort sichtbare Sprünge/Constraint-Leaks
zwischen den Kameras — und das nicht als Rand-Fall, sondern als Kernverhalten des Factory-Patterns.

**Fix-Richtung:** `CameraStrategyFactory.get()` muss bei jedem Aufruf eine **neue** Instanz
zurückgeben (`new StiffStrategy()` etc. statt Map-Lookup einer vorkonstruierten Instanz) — oder,
falls die Absicht war, wirklich zustandslose Strategie-Objekte zu teilen, muss das pro-Kamera-State
(`_isInitialized`, `radius`, `_lastPosition`) aus den Strategie-Klassen heraus und stattdessen in
`CameraInterfaceData`/`Camera` selbst wandern, wo es tatsächlich pro Instanz existiert. Die erste
Variante ist der kleinere, risikoärmere Fix.

---

## 🟡 `clampVector`-Utility existiert genau um Duplikation zu vermeiden — zwei Strategien nutzen sie trotzdem nicht

`src/core/cameras/strategies/CameraStrategyUtils.ts:4-7` dokumentiert sich selbst explizit als
Anti-Duplikations-Maßnahme: "Shared by the camera strategies to avoid duplicating the same min/max
branching in each of them." `StiffStrategy`/`SmoothStrategy` (und `HybridSyncStrategy` implizit,
da es Constraints anders handhabt) nutzen sie korrekt (`import { clampVector } ...`,
`StiffStrategy.ts:8,53`; `SmoothStrategy.ts:8,57`). Zwei Strategien tun das **nicht** und
reimplementieren dieselbe Min/Max-Verzweigung manuell:

- `IsometricStrategy.ts:29-40` — kein Import von `CameraStrategyUtils` überhaupt, komplett eigene
  `if (this.constraints.min) { ... Math.max(...) }` / `if (this.constraints.max) { ... Math.min(...) }`
  -Blöcke.
- `FixedStrategy.ts:28-40` — dieselbe manuelle Wiederholung, sogar mit einem dritten,
  in `clampVector` nicht vorhandenen Zweig (`vector.clamp(min, max)` bei *beiden* gesetzt, sonst
  einzeln) — im Ergebnis funktional gleichwertig zu `clampVector`, aber unabhängig gepflegt.

Kein Bug heute (beide Implementierungen sind korrekt), aber genau die Art Duplikation, die die
Utility-Funktion laut eigenem Kommentar verhindern sollte — künftige Änderungen an der
Constraint-Semantik (z.B. ein drittes Constraint-Feld) müssten an drei Stellen synchron gepflegt
werden statt an einer.

**Fix-Richtung:** `IsometricStrategy`/`FixedStrategy` auf `clampVector(vector, this.constraints)`
umstellen, analog zu `StiffStrategy`/`SmoothStrategy`.

---

## 🔴 `HoverBehavior.onDetach()` fehlt — Pointer-Handler überleben das Detach und mutieren weiter direkt das Material

`HoverBehavior.onAttach()` (`src/core/behaviors/HoverBehavior.ts:19-49`) klont das Material
korrekt (guter Move, siehe unten) und verdrahtet danach zwei Closures direkt auf das Objekt:

```ts
target.onPointerEnter = (): void => {
  this._targetScale = this._baseScale * this._hoverMultiplier;
  if (target.material instanceof StandardMaterial) {
    target.material.emissiveColor.set(0.2, 0.5, 1.0);
    target.material.emissiveIntensity = 2.0;
  }
};
target.onPointerLeave = (): void => { ... };
```

`Object3D.onPointerEnter`/`onPointerLeave` (`Object3D.ts:91-92`) sind **einzelne Callback-Slots**,
keine Multi-Listener-Events. `HoverBehavior` überschreibt **kein** `onDetach()` — die Basisklasse
(`Behavior.onDetach()`, `Behavior.ts:34-36`) setzt nur `this.target = undefined`, räumt aber nichts
objekt-seitig auf. Die beiden Closures referenzieren jedoch nicht `this.target`, sondern den
**Konstruktor-Parameter** `target` direkt (korrektes JS-Closure-Capturing) — sie bleiben also nach
dem Detach voll funktionsfähig und mutieren weiterhin direkt `target.material.emissiveColor`/
`emissiveIntensity`, unabhängig vom Lifecycle-Zustand des Behaviors.

**Ergebnis eines "sauberen" Detach:** Die Scale-Animation stoppt korrekt (weil `update()` nicht
mehr aufgerufen wird, sobald das Behavior aus `behaviors[]` entfernt ist) — aber Hovern des Objekts
schaltet **weiterhin** den Emissive-Glow um, als wäre das Behavior nie entfernt worden. Ein halb
totes, halb lebendiges Verhalten, das UI-technisch wie ein Bug wirkt (Glow reagiert, Scale nicht).

**Verifiziert** (Wegwerf-Test, danach gelöscht):

```ts
const obj = new Object3D("test");
obj.material = new StandardMaterial();
const behavior = new HoverBehavior(1.5);
attachBehavior(obj.behaviors, behavior, obj);
detachBehavior(obj.behaviors, behavior);

expect(behavior.target).toBeUndefined();        // ✓ Lifecycle sagt "detached"
expect(obj.behaviors.includes(behavior)).toBe(false); // ✓ nicht mehr in der Liste
obj.onPointerEnter!();                            // trotzdem noch aufrufbar
expect((obj.material as StandardMaterial).emissiveIntensity).toBe(2.0); // ✓ Glow schaltet trotzdem
```

**Fix-Richtung:** `HoverBehavior` sollte `onDetach()` überschreiben und dort
`target.onPointerEnter = undefined; target.onPointerLeave = undefined; target.isPickable =
false;` (nur falls dieses Behavior sie ursprünglich gesetzt hat) zurücksetzen — analog zum
allgemeinen Cleanup-Vertrag, den `onAttach`/`onDetach` laut Docblock (`Behavior.ts:24-36`)
eigentlich symmetrisch erfüllen sollen.

**Positiver Gegenbeleg im selben Ordner:** `DraggableBehavior.onDetach()`
(`src/core/behaviors/DraggableBehavior.ts:64-71`) macht exakt das Richtige — setzt
`onPointerDown`/`onPointerUp`/`onPointerMove` explizit auf `undefined` zurück, bevor
`super.onDetach()` aufgerufen wird. Das zeigt, dass das korrekte Pattern im Projekt bereits bekannt
ist; `HoverBehavior` hat es nur schlicht vergessen.

---

## 🟡 `FirstPersonController`: `audio`-Option als "Required" dokumentiert, aber nie validiert und nie gelesen

`FirstPersonControllerOptions.audio` (`src/core/behaviors/FirstPersonController.ts:29-30`):
`/** Audio system reference. Required — no global fallback. */ audio?: AudioSystem;` — wird im
Konstruktor unkommentiert per Type-Assertion übernommen (`audio: options.audio as AudioSystem,`,
Zeile 64), aber im Gegensatz zu `input` (das dieselbe "Required — no global fallback"-Doku trägt,
Zeile 27-28) gibt es **keine** Laufzeitprüfung — `input` wird per `if (!this._options.input) throw
new Error(...)` (Zeile 66-68) hart erzwungen, `audio` nirgends.

Wichtiger: `grep -n "audio" src/core/behaviors/FirstPersonController.ts` zeigt, dass `_options.audio`
nach der Zuweisung im Konstruktor **kein einziges Mal mehr gelesen wird** — keine Footstep-Sounds,
kein Audio-Cue beim Kollidieren, nichts. Das Feld ist vollständig totes Konfigurationsgewicht: als
zwingend dokumentiert, aber weder durchgesetzt noch je konsumiert. Der Klassenkommentar zu
`distanceMoved`/`bobPhase`/`isMoving` (Zeile 44: "Public state for other behaviors (like weapon
bobbing or footsteps) to read") deutet darauf hin, dass Footstep-Audio absichtlich in ein
*separates* Behavior ausgelagert werden sollte, das diese öffentlichen Felder liest — was den
`audio`-Options-Eintrag hier vollends überflüssig macht, falls das die tatsächliche Architektur ist.

**Fix-Richtung:** Entweder die `audio`-Option ganz entfernen (folgt dem Muster aus
`[[project_gltfloaderoptions_test_coverage]]` — spekulative, unbenutzte API-Fläche lieber
rausnehmen als stehenlassen), oder falls tatsächlich geplant, mindestens dieselbe
Pflicht-Validierung wie bei `input` ergänzen, damit "Required" nicht nur ein Kommentar ist.

---

## 🟡 `DraggableBehavior.onPointerMove` alloziert einen `Vector3D` pro Pointer-Move-Event statt `MathPool` zu nutzen

`src/core/behaviors/DraggableBehavior.ts:52`:

```ts
const p0_minus_o = new Vector3D().copyFrom(this._planePoint).sub(ray.origin);
```

Jeder andere zeitkritische Vektor in dieser Klasse (`_planeNormal`, `_planePoint`, `_dragOffset`)
ist als vorallozierte Instanzvariable angelegt — nur diese eine temporäre Zwischenrechnung in
`onPointerMove` (das während eines aktiven Drags potenziell mehrfach pro Frame feuert, je nach
Pointer-Event-Frequenz des Browsers) legt bei jedem Aufruf einen frischen `Vector3D` an, statt
`MathPool.acquireVector()`/`releaseVector()` zu nutzen (das dedizierte, projektweite Facility genau
für diesen Zweck, siehe `CONTEXT.md`: "MathPool ... the one canonical, engine-wide facility"). Kein
Korrektheitsproblem, aber ein unnötiger Allocation-Punkt auf einem Pfad, der bei intensivem Dragging
(z.B. Maker-Objektmanipulation) durchaus heiß werden kann. Fix: `const p0_minus_o =
MathPool.acquireVector().copyFrom(this._planePoint).sub(ray.origin);` + `MathPool.releaseVector(...)`
vor jedem `return`/Ende der Funktion.

---

## 🟡 `EmissivePulseBehavior`'s `CustomShaderMaterial`-Zweig widerspricht der eigenen `u_specColor`-Konvention und ist nirgends erprobt

`src/core/behaviors/EmissivePulseBehavior.ts:53-59`:

```ts
// Apply to our custom shader fallback (u_specColor.a contains intensity)
else if (mat instanceof CustomShaderMaterial && mat.properties["u_specColor"]) {
  const color = mat.properties["u_specColor"] as Color;
  color.a = finalIntensity;
}
```

Das nimmt an, `properties["u_specColor"]` sei eine echte `Color`-Instanz mit beschreibbarem
`.a`-Feld. Das widerspricht der Konvention, die **jedes** eingebaute Material im Projekt für
`u_specColor` tatsächlich verwendet: immer ein `Float32Array`/Zahlen-Array
(`new Float32Array([1, 1, 1, 1])` in `AbstractMaterial.ts:81`, `WireframeMaterial.ts:45`,
`SkyboxMaterial.ts:51`, `SpriteMaterial.ts:58`, `DepthMaterial.ts:45`, `TerrainMaterial.ts:89`,
`WorldMaterial.ts:41`, `RetroScreenMaterial.ts:91` — durchweg dasselbe Format). Würde ein Nutzer
sein `CustomShaderMaterial` nach genau diesem im ganzen Projekt etablierten Muster aufsetzen
(`properties: { u_specColor: new Float32Array([...]) }`), würde `color.a = finalIntensity` auf dem
Float32Array lautlos ein neues, für den Uniform-Upload irrelevantes Objekt-Property anlegen (Typed
Arrays erlauben beliebige zusätzliche Properties) — der Puls hätte **keinerlei sichtbaren Effekt**,
ohne Fehler oder Warnung.

**Warum das (noch) niemandem aufgefallen sein dürfte:** `grep -rln "new CustomShaderMaterial"
src/ tests/` findet **keine einzige** tatsächliche Instanziierung im gesamten Baum — nur die
`ShaderImporter`-Interface-Signatur referenziert den Typ. Dieser Codepfad ist also komplett
unbenutzt und unverifiziert, dasselbe Muster wie in
`[[project_gltfloaderoptions_test_coverage]]` bereits notiert (spekulative API-Fläche ohne
Konsumenten).

**Fix-Richtung:** Entweder die eigene `u_specColor`-Konvention (Float32Array-Index `[3]`) auch hier
konsequent anwenden (`(mat.properties["u_specColor"] as Float32Array)[3] = finalIntensity`), oder
falls tatsächlich eine `Color`-Instanz vorgesehen ist, das explizit im
`CustomShaderMaterialOptions`-Docblock als abweichende, materialspezifische Konvention
dokumentieren und mit mindestens einem Test/Showcase absichern.

---

## 🟡 `StiffStrategy`/`SmoothStrategy`: nahezu identischer `update()`-Body

`StiffStrategy.update()` (`StiffStrategy.ts:27-60`) und `SmoothStrategy.update()`
(`SmoothStrategy.ts:29-64`) sind bis auf eine einzige Zeile identisch (Init-Block,
Theta/Phi-Rotation aus `dx`/`dy`, Positions-Rekonstruktion aus Radius/Theta/Phi, sowie eine
wortgleiche `zoom()`-Methode) — der einzige funktionale Unterschied ist, wie `camera.target`
aktualisiert wird: `StiffStrategy` kopiert `targetPos` direkt (`camera.target.copyFrom(targetPos)`),
`SmoothStrategy` lerpt dorthin (`camera.target.x += (targetPos.x - camera.target.x) *
this.lerpFactor`, etc.). Kein Bug, aber ca. 45 von 60 Zeilen sind 1:1-Duplikate zwischen den beiden
Dateien. Ein gemeinsamer `AbstractOrbitStrategy` mit einer abstrakten `_approachTarget()`-Methode
(oder einer einfachen `lerpFactor`-Eigenschaft, die bei `StiffStrategy` implizit `1.0` ist) würde
die Duplikation eliminieren, ohne die beiden Strategien architektonisch zu verändern.

---

## 🔴 `AbstractShowcase` registriert einen nicht entfernbaren globalen `keydown`-Listener — bricht `SmallWorld.destroy()`s eigenes Lifecycle-Versprechen

`src/core/showcase/AbstractShowcase.ts:28` (Konstruktor):

```ts
window.addEventListener("keydown", (event: KeyboardEvent): void => this.onKeyDown(event));
```

`SmallWorld.destroy()` (`src/core/SmallWorld.ts:399-410`) dokumentiert sich selbst explizit als
Lifecycle-Vertrag: "Destroys the engine instance, freeing memory and **removing all global event
listeners**" — und tut das korrekt für seine eigenen Listener, die als gebundene Instanzfelder
gespeichert sind (`window.removeEventListener("resize", this._onResize)`,
`window.removeEventListener("keydown", this._onKeyDown)`, `"pagehide"` analog).

`AbstractShowcase` — die Basisklasse, von der **jede einzelne** Showcase im gesamten `showcases/`-Baum
erbt — registriert im Konstruktor einen **zweiten, eigenen** `keydown`-Listener, aber als anonyme
Inline-Arrow-Funktion statt als gespeichertes Instanzfeld. Das ist strukturell nicht reparierbar:
`removeEventListener` benötigt exakt dieselbe Funktionsreferenz, die bei `addEventListener` übergeben
wurde — eine anonyme Arrow-Funktion, die nirgends zwischengespeichert wird, kann von Natur aus **nie
wieder entfernt werden**, unabhängig davon, ob `AbstractShowcase` (das hier ohnehin gar kein eigenes
`destroy()` überschreibt) es versucht.

**Failure-Szenario:** Ruft irgendein Code `showcase.destroy()` auf (z.B. ein Test-Harness, das
mehrere Showcases nacheinander in derselben Seite instanziiert und wieder abbaut, oder eine
zukünftige SPA-artige Showcase-Galerie, die zwischen Showcases wechselt, ohne die ganze Seite neu zu
laden) — `SmallWorld.destroy()` räumt seine eigenen Listener korrekt ab, aber `AbstractShowcase`s
`keydown`-Listener bleibt für die gesamte Lebensdauer des `window`-Objekts aktiv und ruft weiterhin
`this.onKeyDown(event)` auf der eigentlich "zerstörten" Instanz auf (Standardverhalten:
`this.debug = !this.debug` bei `B`, siehe `AbstractShowcase.ts:134-138`; jede Subklasse, die
`onKeyDown` überschreibt, führt beliebige Showcase-spezifische Logik auf einer toten Instanz aus).
Bei mehreren nacheinander erzeugten/zerstörten Showcase-Instanzen akkumulieren sich diese toten
Listener unbegrenzt — ein klassischer, unbegrenzt wachsender Event-Listener-Leak, exakt die Art
Lifecycle-Fehler, die dieses Projekt sonst konsequent jagt (vgl. den DOM-Leak-Fund im separaten
PropertyPanel-Review, `[[project_frustumculler_static_pollution]]`).

**Verifiziert per Code-Lesung** (nicht per Laufzeittest, da `SmallWorld`/`AbstractShowcase` einen
echten Canvas+Renderer-Kontext brauchen, der headless nur eingeschränkt verfügbar ist, siehe
`[[project_webgpu_headless_limitation]]` — die Closure-Identitätsregel von
`addEventListener`/`removeEventListener` ist aber JS-Sprachsemantik, kein laufzeitabhängiges
Verhalten): `grep -n "removeEventListener" src/core/showcase/AbstractShowcase.ts` liefert **keinen**
Treffer; die Klasse überschreibt `destroy()` überhaupt nicht.

**Fix-Richtung:** Den Handler als gebundenes Instanzfeld speichern (analog zu `SmallWorld._onKeyDown`)
und `AbstractShowcase` ein eigenes `override destroy(): void { window.removeEventListener("keydown",
this._onShowcaseKeyDown); super.destroy(); }` geben.

---

## 🟡 `totalShowcases = 34` ist ein unbenannter, hart codierter Magic-Number im Navigations-Utility

`src/core/showcase/AbstractShowcase.ts:42`: `const totalShowcases = 34;` — steuert den
Prev/Next-Wraparound der Showcase-Navigationspfeile. Kein Bezug zu einer tatsächlichen Quelle der
Wahrheit (z.B. Verzeichnis-Scan, generierte Konstante, Manifest) — laut Memory-Log war dieser Wert
bereits mehrfach manuell nachgeführt ("Showcase Unification" nennt 25 Showcases per 2026-07-27,
hier bereits 34). Verstößt gegen die `coding-guide`-Regel "No Magic Strings/Numbers" und bedeutet:
jede neue/entfernte Showcase erfordert einen manuellen, leicht vergessbaren Fix an dieser einen
Stelle, sonst wickelt die Navigation entweder zu früh (übersehene neue Showcases nie erreichbar)
oder zu spät (Sprung auf eine nicht existierende Showcase-Nummer, vermutlich 404). Fix-Richtung:
aus einem generierten Manifest/Verzeichnis-Listing ableiten statt hart zu kodieren.

---

## 🟡 Unaufgeräumter "Denk-laut"-Kommentar in `FluidSurfaceMaterial`

`src/core/materials/FluidSurfaceMaterial.ts:84`:

```ts
this.depthWrite = false; // Usually true for liquids, but for soft edges we want blending. Let's
                          // keep it false for soft edges to work well, or true if we want opaque
                          // body. Let's stick to true transparent for now.
```

Ein stehengebliebener Selbstgespräch-Kommentar, der sich selbst widerspricht (endet mit "Let's
stick to **true** transparent", während die Zeile `depthWrite = **false**` setzt — zwei
unterschiedliche Flags, die der Kommentar munter vermischt) und keine der beiden im `coding-guide`
verlangten Kommentar-Kategorien erfüllt ("only explain WHY", nicht das eigene Abwägen laut
protokollieren). Harmlos, aber genau die Art Rest-Artefakt, die der `deslop`-Skill des Projekts
explizit adressiert. Fix: durch einen kurzen, einzeiligen WHY-Kommentar ersetzen (z.B. "Soft edges
need blending without an opaque depth write") oder ganz entfernen.

---

## ✅ Was gut gemacht ist

- **`StageMovementBehavior`**: Das mit Abstand am gründlichsten dokumentierte File im ganzen Scope.
  Die Kommentare zu `facingOffset` und zur `atan2(-worldDx, -depthDelta)`-Vorzeichenwahl
  (`StageMovementBehavior.ts:204-212`) erklären nicht nur das WHY, sondern auch, *wie* es verifiziert
  wurde ("confirmed live", "verified by directly computing `Matrix4.compose()`'s output for known
  angles, not just derived on paper") — genau das Kommentar-Ideal aus dem `coding-guide`
  ("only explain WHY ... non-obvious intent"). Sichtbares Ergebnis einer bereits durchlaufenen
  Bugfix-Iteration (siehe `[[project_stagemovementbehavior_facing_bug]]`), nicht Zufall.
- **`ShakeEffect`**: Trauma²-Hüllkurve + kontinuierliches Simplex-Noise statt Weißrauschen, mit
  Zitat der Quelle (Squirrel Eiserloh, GDC "Juicing Your Cameras With Math",
  `ShakeEffect.ts:6-9`) — ein durchdachtes, korrekt referenziertes Pattern statt einer naiven
  Zufallszahlen-Wackelei.
- **`HoverBehavior`s Material-Klon-Disziplin**: klont das Material vor jeder Mutation
  (`HoverBehavior.ts:26-32`) mit einer expliziten Begründung, warum ein direktes Tinten eines
  geteilten Materials alle Objekte einer Instanz-Batch gleichzeitig zum Glühen bringen würde — genau
  die Art Cross-Object-Interferenz, die an anderer Stelle in diesem Review (Clone-Referenzleck)
  gerade *nicht* konsequent vermieden wurde. Der Kontrast zeigt: das Team kennt das Risiko und
  behandelt es meistens richtig.
- **`DraggableBehavior.onDetach()`**: sauberer, vollständiger Event-Handler-Rückbau
  (`onPointerDown`/`onPointerUp`/`onPointerMove` → `undefined`) — der positive Gegenentwurf zu
  `HoverBehavior`s fehlendem `onDetach()` (siehe eigener Fund).
- **Generische, callback-getriebene Behaviors** (`OscillatorBehavior`, `PulsatingBehavior`,
  `FlickerBehavior`, `ProximitySensorBehavior`): kennen nicht, *was* sie animieren — nur eine
  Zahl/einen Faktor und einen `onUpdate`-Callback. Sauberste Umsetzung des in `CONTEXT.md`
  festgehaltenen Behavior-Konzepts, wiederverwendbar für Licht, Skalierung, Materialfarbe oder
  beliebige andere Zielgrößen ohne Code-Duplikation pro Anwendungsfall.
- **`Color.toFloat32Array()`**: nutzt einen pro-Instanz gecachten `Float32Array` (`Color.ts:19`)
  statt bei jedem Aufruf neu zu allozieren — sauberer Zero-Allocation-Baustein, auf dem praktisch
  jede Material-`getRenderManifest()`-Implementierung im Scope aufbaut.
- **DirectionalLight CSM Texel-Snapping**: der Kommentar zu Sub-Texel-Drift/Shimmering
  (`DirectionalLight.ts:161-169`) erklärt präzise, *warum* die Rundung auf den Zentrum statt auf
  Min/Max angewendet wird, inklusive einer explizit benannten, bewusst in Kauf genommenen
  Unschärfe zwischen WebGL2-Atlas- und WebGPU-Array-Layer-Auflösung — Trade-offs werden dokumentiert,
  nicht verschwiegen.
- **`FrostglassMaterial.clone()`**: einziges Material neben `StandardMaterial`, das eine echte,
  bewusst begründete `clone()`-Überschreibung liefert (Docblock erklärt exakt das
  Multi-Instanz-Szenario, das es verhindert) — ein Beleg, dass das Team das
  Referenz-Leck-Problem an einer Stelle bereits richtig gelöst hat, nur eben nicht überall
  (siehe `CloneUtils`-Fund).

---

## Fazit

Der Scope (Materials/Lights/Cameras/Behaviors/Showcase) ist architektonisch sauber geschnitten und
in weiten Teilen sorgfältig gebaut — die Behavior-Schicht folgt konsequent dem im `CONTEXT.md`
festgelegten "dumme Callback-Engine"-Muster, die Lighting-Attenuation-Formeln (windowed
inverse-square für Punktlichter, Spot-Cone via Cosine-Schwelle) sind physikalisch plausibel und
konsistent zwischen den drei Renderer-Backends, und mehrere Stellen (StageMovementBehavior,
DirectionalLight CSM, ShakeEffect) zeigen, dass frühere Bugs gründlich nachverfolgt und mit
verifizierten Kommentaren dokumentiert wurden.

Der eigentliche rote Faden dieses Reviews ist aber **Zustand, der über mehrere Instanzen hinweg
geteilt wird, obwohl er es nicht sein sollte** — dreimal unabhängig voneinander gefunden, an drei
verschiedenen Architekturebenen:

1. **`Color.WHITE` als geteilte, aber trotzdem als beschreibbares Default-Feld verwendete
   Singleton-Instanz** (7 Fundstellen in Materials/Lights) — crasht bei jeder In-Place-Farbänderung
   eines default-eingefärbten Objekts.
2. **`CameraStrategyFactory`s Singleton-Strategie-Instanzen** — mehrere Kameras mit derselben
   Strategie teilen sich `_isInitialized`/`radius`/Constraints und springen/überschreiben sich
   gegenseitig.
3. **`CloneUtils.shallowCloneWithValueTypes()`s unvollständige Typ-Abdeckung** (nur
   Vector3D/Quaternion/Color, nicht Vector2D/Array/Plain-Object) — Duplikate in Maker teilen
   stillschweigend Referenzen mit ihrem Original.

Alle drei sind unabhängig entstanden, aber dasselbe Muster: eine performance- oder
DRY-motivierte Abkürzung (eine gefrorene Konstante wiederverwenden, eine Factory-Instanz cachen,
eine generische Clone-Hilfsfunktion auf die häufigsten drei Typen beschränken), die genau dort
bricht, wo das Projekt selbst am meisten Wert auf Instanz-Isolation legt (Multi-Engine-Fähigkeit,
Maker-Duplicate-Befehl, Multi-Kamera-Szenen).

**Top-3-Priorität für den nächsten Schritt:**

1. 🔴 `CameraStrategyFactory.get()` von Singleton-Map auf Neuinstanziierung umstellen — betrifft
   jede Multi-Kamera-Szene sofort und sichtbar.
2. 🔴 `Color.WHITE`-Aliasing beheben (frische `Color`-Instanz statt Singleton-Referenz in allen
   sieben betroffenen Default-Parametern) — behebt einen reproduzierbaren Crash in einem
   Kernpfad (`RainbowBehavior`, Makers Farb-Inspector).
3. 🔴 `AbstractShowcase`s nicht entfernbaren `keydown`-Listener beheben (als Instanzfeld speichern +
   `destroy()`-Override) — betrifft strukturell jede der ~34 Showcases.

Rundherum: `CloneUtils` generisch für Vector2D/Array/Plain-Object erweitern schließt den dritten,
am breitesten wirkenden (aber am wenigsten akut sichtbaren) Fund in einem einzigen, kleinen Patch.

**Status: ⚠️ mit kritischen Funden fertig.**
