# Ein neues Material hinzufügen

Diese Anleitung richtet sich an Engine-Mitwirkende: sie erklärt, wie ein neues Material zu Small World hinzugefügt wird, nicht, wie die eingebauten genutzt werden (siehe dafür [Materialien & Shader](/guides/materials)).

## Zwei Wege, ein Material hinzuzufügen

**`CustomShaderMaterial`** — rohen Shader-Quellcode schreiben und einer einzigen, fertigen Material-Klasse übergeben. Keine neue TypeScript-Klasse, keine Engine-Änderungen. Gut für einmalige Effekte, Shadertoy/ComputeToys-Importe oder Prototyping.

**Eine neue `AbstractMaterial`-Unterklasse** — eine richtige TypeScript-Klasse mit typisierten Konstruktor-Optionen und öffentlichen Eigenschaften schreiben (`material.roughness = 0.4` usw.), unterlegt mit einem eigenen Shader. Gut für alles, was projektweit wiederverwendet, dokumentiert und aus der Engine exportiert werden soll.

Der Rest dieser Anleitung behandelt den zweiten Weg — er ist auch das, was `CustomShaderMaterial` intern tut, nur ohne eine eigene Klasse, die ihn umhüllt.

## Die zwei Methoden, die jedes Material implementiert

`AbstractMaterial` (`src/core/materials/AbstractMaterial.ts`) verlangt genau zwei Methoden:

```typescript
public abstract getRenderManifest(): RenderManifest;
public abstract getShaderDefinition(): ShaderDefinition;
```

`getShaderDefinition()` wird einmal pro Shader-Variante aufgerufen und beschreibt den Shader selbst: seinen Quellcode für jeden Renderer-Dialekt, und sein `layout` (welche Uniforms und Texturen er erwartet). `getRenderManifest()` wird jeden Frame aufgerufen und liefert die *aktuellen Werte* für diese Uniforms/Texturen zurück — der Renderer liest ausschließlich dieses Manifest, er inspiziert nie direkt die Felder deines Materials.

Ein minimales echtes Beispiel, gekürzt aus `PhongMaterial.ts`:

```typescript
public override getShaderDefinition(): ShaderDefinition {
  return {
    id: this.type, // eine eindeutige String-ID, z. B. MaterialType.PHONG oder ein eigener String
    sources: {
      glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: fragGLSL },
      glsl100: { vs: "[BASE_VS]", fs: fragGLSL100 },
      wgsl: `[WGSL_STRUCTS]\n[WGSL_PBR_MATH]\n[WGSL_VS]\n${fragWGSL}`,
    },
    layout: {
      ...StandardWebGPULayout,
      textures: {
        u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
        u_normalMap: { type: ShaderPropertyType.TEXTURE },
        u_specularMap: { type: ShaderPropertyType.TEXTURE },
      },
    },
  };
}

public override getRenderManifest(): RenderManifest {
  if (undefined === this._renderManifest) this._renderManifest = this._createBaseManifest();
  this._syncBaseManifestState();

  const props = this._renderManifest.properties as Record<string, unknown>;
  const texs = this._renderManifest.textures as Record<string, unknown>;
  props["u_color"] = this.color.toFloat32Array();
  props["u_shininess"] = this.shininess;
  texs["u_diffuseMap"] = this.diffuseMap;
  return this._renderManifest;
}
```

`AbstractMaterial._createBaseManifest()`/`_syncBaseManifestState()` füllen bereits die Eigenschaften vor, die sich jedes Material teilt (Farbe, Culling, Blending, Nebel-Parameter, …) — ruf sie zuerst auf und überschreibe nur das, was dein Material tatsächlich hinzufügt.

Die Tokens `[BASE_VERTEX_HEADER]`, `[WGSL_PBR_MATH]` usw. sind gemeinsame Shader-Bausteine, registriert in `CoreShaderChunks.ts` und von `ShaderRegistry.instance.assemble()` expandiert. Nutze sie wieder, statt Beleuchtungs-/Nebel-/PBR-Mathematik von Hand neu herzuleiten.

## Die drei Shader-Dialekte

Ein Material kann bis zu drei unabhängige Shader-Quellen liefern: `wgsl` (WebGPU), `glsl300` (WebGL2), `glsl100` (WebGL1). Jeder Renderer kompiliert ausschließlich seinen eigenen Dialekt — es gibt keinen Auto-Transpiler zwischen ihnen. Ein Material muss nur die Renderer unterstützen, die für es relevant sind; wird `glsl100` weggelassen, wirft dieses Material schlicht einen Fehler, wenn die App unter `WebGL1Renderer` läuft (das ist beabsichtigt, z. B. für reine WGSL-Shadertoy-Importe, siehe `CustomShaderMaterial`).

Da die drei Quellen von Hand und unabhängig gepflegt werden, *werden* sie auseinanderdriften — ein Uniform, das in der WGSL-Version vorhanden ist, in der GLSL300-Version aber fehlt (oder falsch geschrieben ist), ist eine häufige Fehlerquelle, und das zeigt sich nicht als Compile-Fehler, sondern nur darin, dass eine Textur/ein Uniform stillschweigend nicht gesetzt wird. Nach dem Ändern oder Hinzufügen der Shader eines Materials:

```bash
npm run build:showcases && npm run preview
node .agents/scratches/sweep-renderer.mjs WEB_GL1
node .agents/scratches/sweep-renderer.mjs WEB_GL2
```

gegen einen Showcase ausführen, der das Material nutzt, für beide Renderer-Dialekte. Es lädt jeden Showcase headless und meldet echte GL-Compile-/Link-/`GL_INVALID_OPERATION`-Fehler — das projekteigene `npm run test:showcases` kann WebGL2 in dieser Sandbox nicht initialisieren und fällt stillschweigend auf WebGL1 zurück, erkennt einen reinen WebGL2-Shader-Bug also nicht.

## Uniform- und Textur-Bindung ist automatisch

Die WebGL1/WebGL2-Renderer ermitteln die Uniforms und Sampler-Textureinheiten eines kompilierten Shaders, indem sie direkt beim gelinkten GPU-Programm nachfragen (`gl.getActiveUniform`), statt eine handgepflegte Liste erwarteter Namen zu konsultieren. Das bedeutet: **sobald ein Uniform oder eine Textur im Shader-Quellcode deklariert und in `layout.uniforms`/`layout.textures` aufgeführt ist, "funktioniert es einfach"** — nichts in `WebGL1Renderer.ts`/`WebGL2Renderer.ts` muss angefasst werden, um das zu unterstützen, und es gibt keine interne Namensliste, deren Aktualisierung vergessen werden könnte.

Das eine, das weiterhin per Konvention übereinstimmen muss: die Property-/Textur-Schlüssel, die in `getRenderManifest()` geschrieben werden (z. B. `texs["u_diffuseMap"]`), müssen exakt so geschrieben sein wie das entsprechende `uniform sampler2D u_diffuseMap;` im Shader-Quellcode. Eine Abweichung ist kein Compile-Fehler — das Uniform wird schlicht nie geschrieben, sodass der Sampler bei dem bleibt, was der GPU-Treiber standardmäßig einsetzt.

Hat ein Name in `layout.uniforms`/`layout.textures` kein passendes aktives Uniform im kompilierten Shader (Tippfehler, oder der Shader-Compiler hat es wegoptimiert, weil es tatsächlich ungenutzt ist), protokolliert `WebGL1Renderer` eine Konsolen-Warnung mit der Namensnennung der Abweichung — ein schneller Weg, einen Tippfehler zu finden, ohne die Render-Ausgabe durchsuchen zu müssen.

Cube- vs. 2D-Texturen werden ebenfalls automatisch erkannt, anhand des im Shader deklarierten Sampler-Typs (`samplerCube` vs. `sampler2D`), nicht anhand des Namens des Uniforms — ein neues Cube-Sampler-Uniform braucht also ebenfalls keinen namensbasierten Sonderfall.

Shadow-Map- und IBL-Sampler (Irradiance/Prefilter/BRDF) sind die eine Ausnahme: sie sind szenenglobal statt pro Material, und werden über dedizierte Code-Pfade in `WebGL2Renderer` mit festen Textureinheiten gebunden, unabhängig davon, was ein neues Material deklariert. Dafür muss nichts getan werden — das ist nur relevant, wenn das Schatten-/IBL-System selbst verändert wird.
