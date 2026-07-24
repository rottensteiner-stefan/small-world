# Shader Importers

The Small World Engine includes a powerful `CustomShaderMaterial` system that allows you to run external shader code. To facilitate copying and pasting code from popular shader platforms, the engine provides built-in **Shader Importers**.

These importers automatically translate external shader syntax into the engine's internal formats and layout structures.

## Built-in Importers

The engine ships with three built-in importers:

1. **`ShadertoyImporter`**: Parses Shadertoy (WebGL2/GLSL300) code, translating `mainImage` and resolving built-in uniforms like `iTime` and `iResolution`.
2. **`GLSLSandboxImporter`**: Parses GLSLSandbox code, translating legacy `gl_FragColor` assignments and mapping `time` / `mouse` uniforms.
3. **`ComputeToysImporter`**: Parses Compute.toys (WGSL) code.

### The ComputeToysImporter Heuristic

It is important to note that the `ComputeToysImporter` operates using a **"Best-Effort" Regex Heuristic**. 

Compute.toys uses *Compute Shaders*, while Small World's `CustomShaderMaterial` runs in a *Fragment Shader* pipeline. To bridge this gap, the built-in importer uses Regular Expressions to find signatures like `textureStore(screen, id, color)` and dynamically transforms them into fragment-friendly `return color;` statements.

**Limitation:** Because this is a Regex-based translation and not a full Abstract Syntax Tree (AST) parser, it is inherently fragile. If a WGSL shader uses complex nested function calls, breaks `textureStore` across multiple lines, or relies heavily on compute-specific memory features, the heuristic will fail and the shader will not compile. 

Building a complete WGSL AST transpiler is outside the scope of the Small World core engine. However, the engine's architecture allows the community to easily swap this out!

## Writing a Custom Importer

The shader importer system is completely decoupled via the `ShaderImporter` interface. The engine does not care if an importer comes from the core library or from your own project.

If the built-in `ComputeToysImporter` is too limited for your needs, you can easily build your own robust WGSL Parser and use it instead.

### 1. Implement the Interface

Create a class that implements the `ShaderImporter` interface. Your class must provide a `parse(sourceCode: string)` method that returns a `CustomShaderMaterialOptions` object.

```typescript
import { 
  ShaderImporter, 
  CustomShaderMaterialOptions, 
  ShaderPropertyType 
} from "small-world";

export class AdvancedWGSLParser implements ShaderImporter {
  public parse(sourceCode: string): CustomShaderMaterialOptions {
    // 1. Write your advanced parsing logic (e.g., using an AST parser)
    const transpiledCode = myAdvancedAstParser(sourceCode);
    
    // 2. Return the structured options required by the engine
    return {
      sources: {
        wgsl: transpiledCode, // Provide the transpiled WGSL code
      },
      layout: {
        uniforms: {
          time: { type: ShaderPropertyType.FLOAT },
          resolution: { type: ShaderPropertyType.VEC2 },
          // Define other uniforms your transpiled shader needs
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

### 2. Inject it into the Material

Since the engine relies on Dependency Injection for the importers, you simply pass an instance of your custom importer directly into the `CustomShaderMaterial` when creating it.

```typescript
import { CustomShaderMaterial } from "small-world";
import { AdvancedWGSLParser } from "./AdvancedWGSLParser";

// The raw WGSL code from compute.toys or another source
const RAW_WGSL_CODE = `...`;

// Inject your custom parser!
const material = new CustomShaderMaterial(
  new AdvancedWGSLParser().parse(RAW_WGSL_CODE)
);
```

By leveraging this architecture, the community can develop, share, and utilize highly advanced shader compilers as standalone packages without requiring any Pull Requests or changes to the Small World Engine core.
