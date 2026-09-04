# Review: Materials, Lights, Shader Registry, Showcase — Änderungen der letzten 48h (`1d70c608..HEAD`)

**Reviewer:** Agent B (Fortsetzung) · **Status:** ⚠️ mit einem kritischen Fund fertig

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

Scope: `src/core/materials/**` (Liquid-Material-Konsolidierung: `LiquidWaveMaterial`,
`OpenWaterMaterial`, `StylizedWaterMaterial`, `FluidSurfaceMaterial`, `LavaMaterial`,
`SlimeMaterial`, alle zugehörigen Shader), `src/core/lights/**`,
`src/core/renderers/shaders/**`, `src/core/showcase/AbstractShowcase.ts`. Diff-Basis:
`git diff 1d70c608..HEAD`, jede betroffene Datei in ihrer aktuellen Vollversion gelesen.

---

## 🔴 WebGPU überschreibt `waterAbsorption.r`/`.g` von `OpenWaterMaterial`/`StylizedWaterMaterial` unconditional mit 0 — die Skinning-Uniform-Wiederverwendung kollidiert real, nicht nur theoretisch

`LiquidWaveMaterial.getRenderManifest()` (`src/core/materials/LiquidWaveMaterial.ts:113-118`)
begründet die Wiederverwendung von `u_isSkinned`/`u_boneOffset`/`u_pad1` explizit so:

```ts
// u_isSkinned/u_boneOffset/u_pad1 are skeletal-animation-only fields, meaningless for a
// water plane -- repurposed to carry the 3 waterAbsorption channels (no free vec3/vec4
// uniform slot remains; wave1/2/3 already occupy all three).
this._renderManifest.properties["u_isSkinned"] = this.waterAbsorption[0];
this._renderManifest.properties["u_boneOffset"] = this.waterAbsorption[1];
this._renderManifest.properties["u_pad1"] = this.waterAbsorption[2];
```

Diese Annahme ("skeletal-animation-only, meaningless for water, safe to repurpose") stimmt für
`u_pad1`, aber **nicht** für `u_isSkinned`/`u_boneOffset`. Diese beiden Felder werden vom
WebGPU-Renderer generisch — **materialtyp-unabhängig, für jedes Objekt in jedem Frame** —
überschrieben, direkt nachdem die Material-Properties in den Uniform-Puffer kopiert wurden:

`src/renderers/WebGPU/WebGPURenderer.ts:1733-1753` (`_packObjectUniforms`):

```ts
// Copy properties
for (const k in m.properties) {
  values[k] = m.properties[k];      // <- hier landet waterAbsorption[0]/[1] korrekt in values
}

values["u_model"] = this._scratchModelMatrix;
if (values["u_color"] === undefined && o.material) { ... }

if ("skeleton" in o && (o as unknown as { skeleton?: Skeleton }).skeleton) {
  values["u_isSkinned"] = 1.0;
  values["u_boneOffset"] = this._getBoneMatrixOffset(o as unknown as SkinnedMesh);
} else {
  values["u_isSkinned"] = 0.0;      // <- überschreibt waterAbsorption[0] IMMER mit 0
  values["u_boneOffset"] = 0.0;     // <- überschreibt waterAbsorption[1] IMMER mit 0
}

UniformPacker.packInto(shaderDef.layout, values, this._scratchObjBufferData);
```

Eine `OpenWaterMaterial`/`StylizedWaterMaterial`-Instanz sitzt praktisch immer auf einem
`Object3D` **ohne** `skeleton` (Wasserflächen sind keine geskinnten Meshes) — der `else`-Zweig
greift also für jedes reale Water-Objekt, jedes Frame, auf allen WebGPU-Renderpfaden. Das
Ergebnis: `waterAbsorption[0]`/`[1]` (rot/grün-Kanal der Beer-Lambert-Tiefenabsorption, siehe
`OpenWaterMaterial.ts:24-27`, Default `[0.3, 0.06, 0.02]`) kommen auf der GPU **immer als `0.0`
an**, unabhängig vom im Material gesetzten Wert — nur `waterAbsorption[2]` (via `u_pad1`, das der
Renderer nicht anfasst) überlebt.

`OpenWater.frag.wgsl:48` / `StylizedWater.frag.wgsl:57` lesen exakt diese drei Felder zurück:

```wgsl
let waterAbsorption = vec3<f32>(obj.isSkinned, obj.boneOffset, obj.pad1);
```

**Failure-Szenario:** Jede `OpenWaterMaterial`/`StylizedWaterMaterial`-Instanz, die unter WebGPU
gerendert wird, zeigt eine sichtbar andere (falsche) Tiefenfärbung als unter WebGL1/WebGL2 — der
Beer-Lambert-Falloff nutzt effektiv nur noch den blauen Kanal, rot/grün fallen mit der Tiefe
überhaupt nicht ab. Bei den Default-Werten (`waterAbsorption = [0.3, 0.06, 0.02]`, rot fällt am
schnellsten) ist der Effekt eines komplett fehlenden Rot/Grün-Falloffs deutlich sichtbar (tieferes
Wasser bleibt bläulich-grün statt zunehmend satt-blau/dunkel zu werden) — exakt der in der
Doku (`OpenWaterMaterialOptions.waterAbsorption`) beschriebene "red typically fades fastest"-Effekt
fehlt unter WebGPU komplett.

**Warum der Browser-Screenshot-Check das nicht gefangen hat:** Der Effekt ist subtil genug
(Farbverschiebung in der Tiefenabsorption, kein Rendering-Fehler/Crash/Blackscreen), um bei einem
Side-by-Side-Screenshot-Vergleich aller drei Renderer leicht als "sieht ähnlich genug aus"
durchzurutschen, wenn nicht gezielt auf Wasserklarheit in der Tiefe geachtet wird — anders als ein
fehlender Chunk oder ein Compile-Error, der sofort auffällt.

**Verifiziert:**
- Codepfad gelesen und nachvollzogen (`WebGPURenderer.ts:1690-1757`, komplette
  `_packObjectUniforms`-Methode) — keine Sonderbehandlung für Nicht-Standard-Layouts, der
  `if/else`-Block läuft unconditional für jedes Objekt.
- `grep -n 'values\["u_'  src/renderers/WebGPU/WebGPURenderer.ts` zeigt: außer `u_model` und
  (bedingt) `u_color` sind `u_isSkinned`/`u_boneOffset` die **einzigen** Felder, die der Renderer
  generisch nach dem Properties-Copy überschreibt — alle anderen von `LiquidWaveMaterial`
  wiederverwendeten Slots (`u_texOffset`/`u_texRepeat`/`u_extraParams`/`u_liquidParams`/
  `u_thresholds`/`u_pad1`/`u_isTerrain`/`u_metallic`/`u_roughness`/`u_useEnvMap`/
  `u_useReflectionMap`/`u_pad2`/`u_pad3`) sind tatsächlich frei und werden unangetastet
  durchgereicht — der Fund betrifft **exakt und ausschließlich** `u_isSkinned`/`u_boneOffset`.
- WebGL1/WebGL2 haben **keine** äquivalente Überschreibung: Skinning läuft dort komplett getrennt
  über einen eigenen `u_boneMatrices`-Uniform-Location-Lookup
  (`src/renderers/WebGL2/WebGL2Renderer.ts:1400-1418`), der die generische
  Properties→Uniforms-Pipeline gar nicht berührt — GLSL-Wasser bekommt `waterAbsorption`
  korrekt. Das erklärt, warum dieselbe "borrow a free slot"-Konvention auf WebGL1/WebGL2
  tatsächlich sicher ist und nur auf WebGPU bricht — eine reine Backend-Asymmetrie in der
  Uniform-Pipeline, keine der drei Shader-Sprachen an sich ist "falsch".
- `tests/core/OpenWaterMaterial.test.ts:25-38` deckt nur `material.getRenderManifest()` direkt ab
  (die Werte sind dort korrekt!) — der Test geht nie durch `WebGPURenderer._packObjectUniforms()`,
  kann diesen Bug also strukturell nicht fangen. `npx vitest run tests/core/OpenWaterMaterial.test.ts`
  ist grün, obwohl das Feature auf WebGPU kaputt ist.

**Fix-Richtung:** Am saubersten: `_packObjectUniforms()`s Skinning-Override nur ausführen, wenn
`shaderDef.layout.uniforms["u_isSkinned"]` tatsächlich die Skinning-Semantik hat — z.B. indem
Materialien, die diese Slots umwidmen (wie `LiquidWaveMaterial`), das im Layout kennzeichnen
(ein `skipGenericSkinningOverride`-Flag o.ä.), oder indem der Renderer den Override nur setzt, wenn
`values["u_isSkinned"] === undefined` war (analog zum bereits vorhandenen
`u_color`-Fallback-Muster in Zeile 1739, das genau dieses "nur setzen, wenn nicht schon vom
Material belegt"-Pattern korrekt vormacht). Die zweite Variante ist der kleinere, risikoärmere Fix
und würde außerdem den Sonderfall "geskinntes Objekt mit `LiquidWaveMaterial`" (heute ohnehin
sinnlos, aber durch nichts verhindert) nicht noch verschärfen. Langfristig zeigt der Fund aber vor
allem: `StandardWebGPULayout` hat *keine* wirklich freien Slots mehr, und weitere
"Slot-Wiederverwendung" für zukünftige Materialien sollte gegen jede generische
Renderer-Post-Processing-Zeile geprüft werden, nicht nur gegen die Shader-Quelltexte selbst.

---

## ✅ Was in diesem Fenster korrekt gebaut/gefixt wurde (selbst verifiziert)

- **`LiquidWaveMaterial.getRenderManifest()` ist für die vorher schon existierenden
  `OpenWaterMaterial`-Felder (wave1/2/3, edgeColor/edgeSoftness, deepWaterColor, speed, time)
  Zeile-für-Zeile identisch** zur alten, separaten Implementierung
  (`git show 1d70c608:src/core/materials/OpenWaterMaterial.ts` diff-verglichen) — keine stille
  Divergenz beim Zusammenlegen. Öffentliche API von `new OpenWaterMaterial(options)` ist
  vollständig rückwärtskompatibel: alle alten Optionsfelder und Defaults unverändert, nur neue
  optionale Felder (`refractionStrength`, `waterAbsorption`, `foam*`) kamen hinzu.
- **FluidSurfaceMaterial's `u_extraParams.x`/`u_liquidParams.z`/`.w`-Wiederverwendung für Emissive
  ist tatsächlich kollisionsfrei** — verifiziert gegen den Vorzustand
  (`git show 1d70c608:...FluidSurfaceMaterial.ts`): `u_extraParams[0]` war zuvor ein
  nie-synchronisierter, fest auf `1.0` initialisierter Platzhalter, `u_liquidParams[2]/[3]` waren
  fest `0`; kein Shader-Backend las diese Werte vor der Änderung. Zusätzlich betrifft dieser
  Slot (anders als `u_isSkinned`/`u_boneOffset`) keine generische Renderer-Post-Processing-Zeile
  — `grep` bestätigt, `u_extraParams`/`u_liquidParams` werden von keinem Renderer nach dem
  Properties-Copy überschrieben.
- **`FluidSurfaceMaterial`s neuer `type`-Konstruktorparameter erzeugt keine neue
  ShaderRegistry-Kollision:** `LavaMaterial`/`SlimeMaterial` übergeben jeweils eine eigene,
  distinkte `MaterialType` (`LAVA`/`SLIME`), und `getShaderDefinition()`s Rückgabewert hängt nur
  von der Klasse ab (statischer Shader-Quelltext), nicht von Instanz-Optionen — die
  bereits seit längerem bestehende "first-registration-wins"-Semantik von
  `registerMaterialShaderProvider()` (`ShaderRegistry.ts:19-23`, prozessweite Map, unverändert in
  diesem Zeitfenster) bleibt dadurch unproblematisch. Ein *theoretisches* Risiko bliebe nur, wenn
  Aufrufer-Code direkt `new FluidSurfaceMaterial({}, MaterialType.LAVA)` aufriefe (den `type`-Param
  am `LavaMaterial`-Preset vorbei manuell setzt) — dafür existiert aber keine Call-Site im
  Repository (`grep -rn "new FluidSurfaceMaterial" src/ showcases/` zeigt nur die beiden
  Preset-Konstruktoren selbst).
- **Alle Shader-Chunk-Tokens (`LIQUID_GERSTNER_WAVE`/`LIQUID_WORLEY_NOISE`,
  `WGSL_LIQUID_GERSTNER_WAVE`/`WGSL_LIQUID_WORLEY_NOISE`) sind in allen drei Sprachvarianten
  registriert und kommen in jeder Verwendungsstelle genau einmal vor** — insbesondere für WGSL
  wichtig, wo Vertex- und Fragment-Quelltext zu **einem** Modul konkateniert werden
  (`OpenWaterMaterial._getLiquidWaveShaderSources()`: `` `${vertWGSL}\n[WGSL_PBR_MATH]\n${fragWGSL}` ``)
  — Gerstner-Wave-Token sitzt nur im Vertex-Teil, Worley-Noise-Token nur im Fragment-Teil, keine
  doppelte Funktionsdefinition im selben Modul. Die GLSL-Chunk-Quelltexte selbst sind bewusst in
  reinem GLSL-ES-1.00-kompatiblen Stil gehalten (kein `texture()`/`textureSize()`, keine
  `in`/`out`-Qualifier) und funktionieren identisch unter glsl300 und glsl100.
- **Gelöschte `shaders/Liquid.*.{wgsl,glsl,glsl100}` sind wirklich vollständig verwaist** —
  `grep -rn "Liquid\.\(vert\|frag\)" src showcases` liefert keinen Treffer mehr.
- **`DirectionalLight`s CSM-Fix für Orthographic-Kameras (ISOMETRIC-Strategie) ist korrekt
  implementiert**, nicht nur oberflächlich: eigener `_computeCascadeSplits()`-Zweig für
  Orthographic (linearer statt Practical-Split, mit nachvollziehbarer Begründung
  `DirectionalLight.ts:225-235`), eigener `_updateOrthoFrustumCorners()` mit korrekter
  konstanter Frustum-Breite/Höhe (kein `tan(fov/2)`-Term, wie es für eine Parallelprojektion sein
  muss), teilt sich `_setCorner()`/Texel-Snapping mit dem Perspective-Pfad. Test
  `tests/core/DirectionalLight.test.ts` deckt explizit den ISOMETRIC/Orthographic-Fall ab und ist
  grün (`npx vitest run` bestätigt, 17/17 Tests über die 5 angefragten Suiten bestehen).
- **`Color.WHITE`-Singleton-Aliasing ist in allen sieben zuvor betroffenen Klassen konsistent
  behoben** (`AbstractLight`, `LambertMaterial`, `PhongMaterial` (beide Farbfelder),
  `SkyboxMaterial`, `StandardMaterial`, `TerrainMaterial`, `WireframeMaterial|) — sogar robuster
  als im vorherigen Review vorgeschlagen: statt nur den Default auf `new Color(...)` zu ändern,
  klont der Konstruktor zusätzlich jede übergebene Farbe, falls sie eingefroren ist
  (`Object.isFrozen(color) ? color.clone() : color`) — das fängt zusätzlich auch den Fall ab, dass
  ein Aufrufer explizit `Color.WHITE` (oder eine andere künftige eingefrorene Konstante) übergibt,
  nicht nur den Default-Fall. `tests/core/ColorMutability.test.ts` grün.
- **`AbstractShowcase`'s nicht entfernbarer `keydown`-Listener ist sauber gefixt:** Handler als
  benanntes Instanzfeld (`_showcaseKeyDownHandler`), `destroy()`-Override entfernt sowohl den
  Listener als auch alle in `_navButtons` gesammelten Navigations-Buttons aus dem DOM, bevor
  `super.destroy()` läuft. `tests/core/AbstractShowcase.test.ts` grün.
- **`CloneUtils.shallowCloneWithValueTypes()`s Array-Deep-Clone-Fix (aus dem vorherigen Review)
  deckt die neuen Liquid-Material-Felder automatisch mit ab** — `wave1`/`wave2`/`wave3`/
  `waterAbsorption` sind Plain-Number-Arrays und werden dank der bereits gehärteten
  generischen Array-Behandlung (`CloneUtils.ts:37-46`) beim `.clone()` korrekt tief kopiert, ohne
  dass `OpenWaterMaterial`/`StylizedWaterMaterial` dafür ein eigenes `clone()` bräuchten — ein
  konkreter Beleg dafür, dass die generische Lösung (statt Klassen-für-Klasse-Fix) tatsächlich
  zukünftige Materialklassen automatisch absichert, wie im vorherigen Review erhofft.
- **`UniformPacker`s MAT4-Alignment-Fix** (`_getTypeAlignment(MAT4)` von `16` auf `4` Floats
  korrigiert, mit einem präzisen Verweis auf die WGSL/std140-Spezifikation) ist eine echte,
  korrekt begründete Korrektur — betrifft potenziell auch `StandardWebGPULayout`, das nach
  `u_model` (MAT4) direkt mit `u_color` (COLOR/VEC4) weitermacht; mit dem alten,
  zu-groben 16-Float-Alignment wäre das zwar bei Offset 0 noch harmlos gewesen (kein Bug bisher),
  aber die Korrektur ist trotzdem sachlich richtig und zukunftssicher.
- **`cluster_cull.wgsl`s Y-Achsen-Fix** (`lightCellRangeY`: NDC-Y (Y-up) wurde vorher ohne Flip
  direkt auf Framebuffer-Pixelkoordinaten (Y-down) gemappt) ist plausibel korrekt und konsistent
  mit der unveränderten `lightCellRangeX` (X braucht keinen Flip zwischen NDC und Framebuffer) —
  eine echte Bugfix, kein Nebenprodukt der Liquid-Arbeit, aber sauber im Scope.
- **AreaLight-PBR-Integration** (aus dem 2026-09-03-Review als offener 🔴-Fund vermerkt) ist in
  diesem Zeitfenster tatsächlich nachgezogen worden — `light_calc_pbr.frag.glsl` (WebGL1 **und**
  WebGL2) und `lighting_pbr.wgsl` (WebGPU) bekamen alle drei denselben Rect-Light-GGX-Block
  (Closest-Point-on-Rect + Cook-Torrance-Specular), Zeile für Zeile strukturell identisch über alle
  drei Sprachen hinweg.

---

## Fazit

Der handwerkliche Kern der Liquid-Material-Konsolidierung (Klassenhierarchie, Shader-Chunk-Extraktion,
Rückwärtskompatibilität der öffentlichen `OpenWaterMaterial`/`StylizedWaterMaterial`-API,
Emissive-Packing bei `FluidSurfaceMaterial`) hält der harten Nachprüfung stand — die vom Auftrag
explizit angezweifelten Stellen (1:1-Identität der übernommenen Manifest-Logik, Shader-Registry-
Kollisionsrisiko durch den neuen `type`-Parameter, Token-Duplikate bei Mehrfach-Chunk-Import)
erwiesen sich bei genauer Prüfung tatsächlich als sauber.

Der eine substantielle Fund liegt genau dort, wo die Selbstkritik im Auftrag ihn vermutet hat: bei
der **Uniform-Slot-Wiederverwendung** — aber nicht in der Kollision zwischen zwei Material-eigenen
Feldern (die sind alle sauber geprüft und frei), sondern in der Kollision mit einer **generischen,
materialtyp-unabhängigen Renderer-Zeile** (`WebGPURenderer._packObjectUniforms()`s
Skinning-Override), die beim Wiederverwenden von `u_isSkinned`/`u_boneOffset` als
"freie Skalar-Slots" schlicht übersehen wurde, weil sie nicht im Shader-Quelltext, sondern im
TypeScript-Renderer-Code sitzt — ein Ort, an dem ein reiner Shader-Code-Review sie nicht gefunden
hätte, ein Renderer-Pipeline-Review (wie dieses) aber schon. Der Bug ist WebGPU-exklusiv (WebGL1/2
sind durch ihren komplett getrennten Skinning-Uniform-Pfad nicht betroffen) und bricht konkret die
Beer-Lambert-Tiefenabsorptionsfarbe von `OpenWaterMaterial`/`StylizedWaterMaterial` unter WebGPU.

**Priorität für den nächsten Schritt:**

1. 🔴 `WebGPURenderer._packObjectUniforms()`s unconditionalen `u_isSkinned`/`u_boneOffset`-Override
   gegen bereits vom Material gesetzte Werte absichern (`values["u_isSkinned"] === undefined`-Guard,
   analog zum bestehenden `u_color`-Fallback-Muster direkt darüber) — kleinster, risikoärmster Fix,
   der beide Liquid-Wave-Materialien unter WebGPU korrekt macht, ohne die Skinning-Logik für echte
   geskinnte Meshes zu berühren.
2. Danach: einen Vitest-Test ergänzen, der `WebGPURenderer._packObjectUniforms()` (oder eine
   äquivalente Integrationsebene) tatsächlich für `OpenWaterMaterial` durchläuft und
   `u_isSkinned`/`u_boneOffset` im gepackten Puffer prüft — die aktuelle Testsuite deckt nur die
   Manifest-Ebene ab und hätte diesen Bug strukturell nie fangen können.

**Status: ⚠️ mit einem kritischen, browser-verifizierbaren Fund fertig.**
