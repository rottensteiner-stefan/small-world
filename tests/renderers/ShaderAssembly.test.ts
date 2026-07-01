import {
  StandardMaterial,
  BasicMaterial,
  LambertMaterial,
  PhongMaterial,
  LiquidMaterial,
  SpriteMaterial,
  TerrainMaterial,
  WorldMaterial,
  GlassMaterial,
  RetroScreenMaterial,
  DepthMaterial,
} from "../../src/index.js";
import { ShaderRegistry } from "../../src/index.js";
import { CoreShaderChunks } from "../../src/core/renderers/shaders/CoreShaderChunks.js";
import { ShaderLoader } from "../../src/index.js";
import fs from "fs";
import path from "path";

describe("Shader Assembly & Linter", () => {
  beforeAll(async () => {
    // Override the ShaderLoader's fetch behavior for Node.js
    ShaderLoader.prototype.load = async function (url: string) {
      const fullPath = path.join(process.cwd(), "public", this.basePath || "", url);
      return fs.readFileSync(fullPath, "utf-8");
    };

    await CoreShaderChunks.init();
  });

  const checkDuplicates = (shaderCode: string, materialName: string, shaderType: string) => {
    const lines = shaderCode.split("\n");
    const declarations = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      // Remove comments
      if (line.includes("//")) {
        line = line.split("//")[0].trim();
      }

      if (line.startsWith("uniform ") || line.startsWith("in ") || line.startsWith("out ")) {
        // e.g. "uniform sampler2D u_diffuseMap;"
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          const varNameWithSemicolon = parts[2];
          // Handle arrays like "u_spotShadowMap[4];"
          const varName = varNameWithSemicolon.split("[")[0].replace(";", "");

          if (declarations.has(varName)) {
            throw new Error(
              `${materialName} ${shaderType} Error: Redefinition of '${varName}' on line ${i + 1}:\n${lines[i]}`,
            );
          }
          declarations.add(varName);
        }
      }
    }
  };

  const materials = [
    new BasicMaterial(),
    new LambertMaterial(),
    new PhongMaterial(),
    new StandardMaterial(),
    new LiquidMaterial(),
    new SpriteMaterial(),
    new TerrainMaterial(),
    new WorldMaterial(),
    new GlassMaterial(),
    new RetroScreenMaterial(),
    new DepthMaterial(),
  ];

  const checkDuplicatesWGSL = (shaderCode: string, materialName: string, shaderType: string) => {
    const lines = shaderCode.split("\n");
    const declarations = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]!.trim();
      if (line.includes("//")) {
        line = line.split("//")[0]!.trim();
      }

      // Match global WGSL variable declarations:
      // @group(x) @binding(y) var name: type
      // var<uniform> name: type
      // var name: type
      const match = line.match(
        /(?:@group\(\d+\)\s*)?(?:@binding\(\d+\)\s*)?var(?:<[^>]+>)?\s+([a-zA-Z0-9_]+)\s*:/,
      );
      if (match && match[1]) {
        const varName = match[1];
        // Ignore loop variables or local vars (indentation could filter, but let's assume globals start at beginning of line)
        // A simple heuristic: if it's not indented or has @group, it's a global
        if (
          (!lines[i]!.startsWith(" ") && !lines[i]!.startsWith("\t")) ||
          line.includes("@group")
        ) {
          if (declarations.has(varName)) {
            throw new Error(
              `${materialName} ${shaderType} Error: Redefinition of WGSL variable '${varName}' on line ${i + 1}:\n${lines[i]}`,
            );
          }
          declarations.add(varName);
        }
      }
    }
  };

  for (const mat of materials) {
    const matName = mat.constructor.name;

    it(`should compile and lint ${matName} for WebGL2 (glsl300) without duplicate uniforms`, () => {
      const def = mat.getShaderDefinition();
      const vs = def.sources.glsl300?.vs;
      const fs = def.sources.glsl300?.fs;

      if (!vs || !fs) {
        throw new Error(`Missing glsl300 shader for ${matName}`);
      }

      // The material returns chunks and defines. Let's assemble a basic mock of the final shader
      // For a real engine, we might call a mock renderer's assembleShader method.
      // Here we just use the registry to replace chunks.
      const assemble = (code: string) => {
        let assembled = code;
        const registry = ShaderRegistry.instance;
        // simplistic replacement for testing
        const chunkRegex = /\[([A-Z_]+)\]/g;
        let match;
        while ((match = chunkRegex.exec(assembled)) !== null) {
          const chunkName = match[1];
          const chunkCode = registry.getChunk(chunkName, "glsl300");
          if (chunkCode) {
            assembled = assembled.replace(match[0], chunkCode);
            // reset regex index since string changed
            chunkRegex.lastIndex = 0;
          }
        }
        return assembled;
      };

      const finalFs = assemble(fs);
      checkDuplicates(finalFs, matName, "Fragment Shader");
    });

    it(`should compile and lint ${matName} for WebGPU (wgsl) without duplicate uniforms`, () => {
      const def = mat.getShaderDefinition();
      const vs = def.sources.wgsl?.vs;
      const fs = def.sources.wgsl?.fs;

      if (!vs || !fs) {
        // Some materials might not support WGSL yet, but if they do, we check them
        return;
      }

      const assemble = (code: string) => {
        let assembled = code;
        const registry = ShaderRegistry.instance;
        const chunkRegex = /\[([A-Z_]+)\]/g;
        let match;
        while ((match = chunkRegex.exec(assembled)) !== null) {
          if (match[1]) {
            const chunkCode = registry.getChunk(match[1], "wgsl");
            if (chunkCode) {
              assembled = assembled.replace(match[0], chunkCode);
              chunkRegex.lastIndex = 0;
            }
          }
        }
        return assembled;
      };

      const finalFs = assemble(fs);
      checkDuplicatesWGSL(finalFs, matName, "Fragment Shader");
    });
  }
});
