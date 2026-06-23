import { describe, expect, it, beforeAll } from "vitest";
import { PostProcessingGroup, ShaderRegistry, ShaderLoader } from "../../src/index.js";
import { CoreShaderChunks } from "../../src/core/renderers/shaders/CoreShaderChunks.js";
import * as fs from "fs";
import * as path from "path";

describe("Post-Processing Shader Chunks & Groups", () => {
  beforeAll(async () => {
    // Override the ShaderLoader's fetch behavior for Node.js
    ShaderLoader.prototype.load = async function (url: string) {
      const fullPath = path.join(process.cwd(), "public", this.basePath || "", url);
      return fs.readFileSync(fullPath, "utf-8");
    };

    await CoreShaderChunks.init();
  });

  it("should successfully initialize filterMode with default value 0", () => {
    const group = new PostProcessingGroup();
    expect(group.filterMode).toBe(0);

    group.filterMode = 3;
    expect(group.filterMode).toBe(3);
  });

  it("should register the post-processing filter chunks in ShaderRegistry", () => {
    const registry = ShaderRegistry.instance;

    const glitchGLSL = registry.getChunk("FILTER_GLITCH_DISTORT", "glsl300");
    const glitchWGSL = registry.getChunk("FILTER_GLITCH_DISTORT", "wgsl");

    expect(glitchGLSL).toBeDefined();
    expect(glitchWGSL).toBeDefined();
    expect(glitchGLSL).toContain("glitchTime");
    expect(glitchWGSL).toContain("let glitchTime");

    const vhsGLSL = registry.getChunk("FILTER_VHS_DISTORT", "glsl300");
    const vhsWGSL = registry.getChunk("FILTER_VHS_DISTORT", "wgsl");

    expect(vhsGLSL).toBeDefined();
    expect(vhsWGSL).toBeDefined();
    expect(vhsGLSL).toContain("jitterTime");
    expect(vhsWGSL).toContain("let jitterTime");

    const gradingGLSL = registry.getChunk("FILTER_COLOR_GRADING", "glsl300");
    const gradingWGSL = registry.getChunk("FILTER_COLOR_GRADING", "wgsl");

    expect(gradingGLSL).toBeDefined();
    expect(gradingWGSL).toBeDefined();
    expect(gradingGLSL).toContain("u_filterMode");
    expect(gradingWGSL).toContain("u.filterMode");
  });

  it("should assemble GLSL post-processing fragment shader resolving all chunks", () => {
    const glslPath = path.resolve(
      process.cwd(),
      "src/core/materials/shaders/PostProcess.frag.glsl",
    );
    const glslRaw = fs.readFileSync(glslPath, "utf-8");

    // Ensure placeholder strings exist before assembly
    expect(glslRaw).toContain("[FILTER_GLITCH_DISTORT]");
    expect(glslRaw).toContain("[FILTER_VHS_DISTORT]");
    expect(glslRaw).toContain("[FILTER_COLOR_GRADING]");

    const glslAssembled = ShaderRegistry.instance.assemble(glslRaw, "glsl300");

    // Ensure placeholders have been replaced and code injected
    expect(glslAssembled).not.toContain("[FILTER_GLITCH_DISTORT]");
    expect(glslAssembled).not.toContain("[FILTER_VHS_DISTORT]");
    expect(glslAssembled).not.toContain("[FILTER_COLOR_GRADING]");
    expect(glslAssembled).toContain("glitchTime = u_time * 3.0;");
    expect(glslAssembled).toContain("if (u_filterMode == 1)");
    expect(glslAssembled).toContain("else if (u_filterMode == 6)");
    expect(glslAssembled).toContain("else if (u_filterMode == 7)");
  });

  it("should assemble WGSL post-processing fragment shader resolving all chunks", () => {
    const wgslPath = path.resolve(
      process.cwd(),
      "src/core/materials/shaders/PostProcess.frag.wgsl",
    );
    const wgslRaw = fs.readFileSync(wgslPath, "utf-8");

    // Ensure placeholder strings exist before assembly
    expect(wgslRaw).toContain("[FILTER_GLITCH_DISTORT]");
    expect(wgslRaw).toContain("[FILTER_VHS_DISTORT]");
    expect(wgslRaw).toContain("[FILTER_COLOR_GRADING]");

    const wgslAssembled = ShaderRegistry.instance.assemble(wgslRaw, "wgsl");

    // Ensure placeholders have been replaced and code injected
    expect(wgslAssembled).not.toContain("[FILTER_GLITCH_DISTORT]");
    expect(wgslAssembled).not.toContain("[FILTER_VHS_DISTORT]");
    expect(wgslAssembled).not.toContain("[FILTER_COLOR_GRADING]");
    expect(wgslAssembled).toContain("let glitchTime = u.time * 3.0;");
    expect(wgslAssembled).toContain("if (1u == u.filterMode)");
    expect(wgslAssembled).toContain("else if (6u == u.filterMode)");
    expect(wgslAssembled).toContain("else if (7u == u.filterMode)");
  });
});
