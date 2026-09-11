# Shader-Importer

Die Small World Engine enthält ein mächtiges `CustomShaderMaterial`-System, mit dem ihr externen Shader-Code ausführen könnt. Um das Kopieren und Einfügen von Code aus populären Shader-Plattformen zu erleichtern, stellt die Engine eingebaute **Shader-Importer** bereit.

Diese Importer übersetzen externe Shader-Syntax automatisch in die internen Formate und Layout-Strukturen der Engine.

## Eingebaute Importer

Die Engine liefert drei eingebaute Importer mit:

1. **`ShadertoyImporter`**: Parst Shadertoy-Code (WebGL2/GLSL300), übersetzt `mainImage` und löst eingebaute Uniforms wie `iTime` und `iResolution` auf.
2. **`GLSLSandboxImporter`**: Parst GLSLSandbox-Code, übersetzt veraltete `gl_FragColor`-Zuweisungen und mappt `time`-/`mouse`-Uniforms.
3. **`ComputeToysImporter`**: Parst Compute.toys-Code (WGSL).

### Die ComputeToysImporter-Heuristik

Wichtig zu wissen: der `ComputeToysImporter` arbeitet mit einer **"Best-Effort"-Regex-Heuristik**.

Compute.toys nutzt *Compute-Shader*, während `CustomShaderMaterial` von Small World in einer *Fragment-Shader*-Pipeline läuft. Um diese Lücke zu überbrücken, nutzt der eingebaute Importer reguläre Ausdrücke, um Signaturen wie `textureStore(screen, id, color)` zu finden und dynamisch in fragment-freundliche `return color;`-Anweisungen umzuwandeln.

**Einschränkung:** Da dies eine Regex-basierte Übersetzung ist und kein vollständiger Abstract-Syntax-Tree(AST)-Parser, ist sie von Natur aus zerbrechlich. Nutzt ein WGSL-Shader komplexe verschachtelte Funktionsaufrufe, bricht `textureStore` über mehrere Zeilen um, oder stützt sich stark auf compute-spezifische Speicherfeatures, schlägt die Heuristik fehl und der Shader kompiliert nicht.

Einen vollständigen WGSL-AST-Transpiler zu bauen liegt außerhalb des Umfangs der Small-World-Kern-Engine. Die Architektur der Engine erlaubt es der Community aber, das einfach auszutauschen!

## Einen eigenen Importer schreiben

Das Shader-Importer-System ist über das `ShaderImporter`-Interface vollständig entkoppelt. Der Engine ist es egal, ob ein Importer aus der Kernbibliothek oder aus eurem eigenen Projekt stammt.

Ist der eingebaute `ComputeToysImporter` für eure Bedürfnisse zu eingeschränkt, könnt ihr problemlos euren eigenen, robusten WGSL-Parser bauen und stattdessen verwenden.

### 1. Das Interface implementieren

Erstellt eine Klasse, die das `ShaderImporter`-Interface implementiert. Eure Klasse muss eine `parse(sourceCode: string)`-Methode bereitstellen, die ein `CustomShaderMaterialOptions`-Objekt zurückgibt.

```typescript
import { 
  ShaderImporter, 
  CustomShaderMaterialOptions, 
  ShaderPropertyType 
} from "small-world";

export class AdvancedWGSLParser implements ShaderImporter {
  public parse(sourceCode: string): CustomShaderMaterialOptions {
    // 1. Eure fortgeschrittene Parsing-Logik schreiben (z.B. mit einem AST-Parser)
    const transpiledCode = myAdvancedAstParser(sourceCode);
    
    // 2. Die von der Engine benötigten strukturierten Optionen zurückgeben
    return {
      sources: {
        wgsl: transpiledCode, // Den transpilierten WGSL-Code bereitstellen
      },
      layout: {
        uniforms: {
          time: { type: ShaderPropertyType.FLOAT },
          resolution: { type: ShaderPropertyType.VEC2 },
          // Weitere Uniforms definieren, die euer transpilierter Shader braucht
        },
        uniformLayout: ["time", "resolution"]
      },
      properties: {
        time: 0,
        resolution: [800, 600]
      }
    };
  }
}
```

### 2. In das Material injizieren

Da die Engine für die Importer auf Dependency Injection setzt, übergebt ihr beim Erstellen des `CustomShaderMaterial` einfach eine Instanz eures eigenen Importers direkt hinein.

```typescript
import { CustomShaderMaterial } from "small-world";
import { AdvancedWGSLParser } from "./AdvancedWGSLParser";

// Der rohe WGSL-Code von compute.toys oder einer anderen Quelle
const RAW_WGSL_CODE = `...`;

// Euren eigenen Parser injizieren!
const material = new CustomShaderMaterial(
  new AdvancedWGSLParser().parse(RAW_WGSL_CODE)
);
```

Durch diese Architektur kann die Community hochentwickelte Shader-Compiler als eigenständige Pakete entwickeln, teilen und nutzen, ohne dass Pull Requests oder Änderungen am Kern der Small World Engine nötig wären.
