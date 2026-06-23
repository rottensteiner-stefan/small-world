/// src/core/renderers/shaders/CoreShaderChunks.ts

import { ShaderRegistry } from "./ShaderRegistry.js";
import { ShaderLoader } from "../../../loaders/ShaderLoader.js";

import FOG_DEFS from "../../materials/shaders/chunks/fog_defs.glsl?raw";
import FOG_CALC from "../../materials/shaders/chunks/fog_calc.glsl?raw";
import FILTER_GLITCH_DISTORT_GLSL from "../../materials/shaders/chunks/filter_glitch_distort.glsl?raw";
import FILTER_GLITCH_DISTORT_WGSL from "../../materials/shaders/chunks/filter_glitch_distort.wgsl?raw";
import FILTER_VHS_DISTORT_GLSL from "../../materials/shaders/chunks/filter_vhs_distort.glsl?raw";
import FILTER_VHS_DISTORT_WGSL from "../../materials/shaders/chunks/filter_vhs_distort.wgsl?raw";
import FILTER_COLOR_GRADING_GLSL from "../../materials/shaders/chunks/filter_color_grading.glsl?raw";
import FILTER_COLOR_GRADING_WGSL from "../../materials/shaders/chunks/filter_color_grading.wgsl?raw";

/**
 * Utility to load and register all standard shader chunks used by the engine.
 */
export class CoreShaderChunks {
  private static _isInitialized: boolean = false;

  /**
   * Initializes the registry with all standard chunks for all supported languages.
   */
  public static async init(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    const registry = ShaderRegistry.instance;
    const loader = new ShaderLoader();

    // --- WebGL 2 Chunks ---
    loader.setBasePath("/resources/shaders/web_gl2/chunks/");
    const [
      gl2BaseVsHeader,
      gl2BaseVsMain,
      gl2BaseFsHeader,
      gl2LightDefs,
      gl2LightCalc,
      gl2PbrMath,
      gl2LightCalcPbr,
    ] = await Promise.all([
      loader.load("base_vertex_header.vert.glsl"),
      loader.load("base_vertex_main.vert.glsl"),
      loader.load("base_fragment_header.frag.glsl"),
      loader.load("lights.frag.glsl"),
      loader.load("light_calc.frag.glsl"),
      loader.load("pbr_math.frag.glsl"),
      loader.load("light_calc_pbr.frag.glsl"),
    ]);

    registry.registerChunk("BASE_VERTEX_HEADER", gl2BaseVsHeader, "glsl300");
    registry.registerChunk("BASE_VERTEX_MAIN", gl2BaseVsMain, "glsl300");
    registry.registerChunk("BASE_FRAGMENT_HEADER", gl2BaseFsHeader, "glsl300");
    registry.registerChunk("LIGHT_DEFS", gl2LightDefs, "glsl300");
    registry.registerChunk("LIGHT_CALC", gl2LightCalc, "glsl300");
    registry.registerChunk("PBR_MATH", gl2PbrMath, "glsl300");
    registry.registerChunk("LIGHT_CALC_PBR", gl2LightCalcPbr, "glsl300");
    registry.registerChunk("FOG_DEFS", FOG_DEFS, "glsl300");
    registry.registerChunk("FOG_CALC", FOG_CALC, "glsl300");

    // --- WebGL 1 Chunks ---
    loader.setBasePath("/resources/shaders/web_gl1/chunks/");
    const [gl1LightDefs, gl1LightCalc, gl1PbrMath, gl1LightCalcPbr] = await Promise.all([
      loader.load("lights.frag.glsl"),
      loader.load("light_calc.frag.glsl"),
      loader.load("pbr_math.frag.glsl"),
      loader.load("light_calc_pbr.frag.glsl"),
    ]);

    loader.setBasePath("/resources/shaders/web_gl1/");
    const [gl1BaseVs, gl1BaseFs] = await Promise.all([
      loader.load("base.vert.glsl"),
      loader.load("base.frag.glsl"),
    ]);

    registry.registerChunk("BASE_VS", gl1BaseVs, "glsl100");
    registry.registerChunk("BASE_FS_HEADER", gl1BaseFs, "glsl100");
    registry.registerChunk("LIGHT_DEFS", gl1LightDefs, "glsl100");
    registry.registerChunk("LIGHT_CALC", gl1LightCalc, "glsl100");
    registry.registerChunk("PBR_MATH", gl1PbrMath, "glsl100");
    registry.registerChunk("LIGHT_CALC_PBR", gl1LightCalcPbr, "glsl100");
    registry.registerChunk("FOG_DEFS", FOG_DEFS, "glsl100");
    registry.registerChunk("FOG_CALC", FOG_CALC, "glsl100");

    // --- WebGPU Chunks ---
    loader.setBasePath("/resources/shaders/web_gpu/chunks/");
    const [wgslStructs, wgslLighting, wgslPbrMath, wgslPbrLighting, wgslFogCalc] =
      await Promise.all([
        loader.load("structs.wgsl"),
        loader.load("lighting.wgsl"),
        loader.load("pbr_math.wgsl"),
        loader.load("lighting_pbr.wgsl"),
        loader.load("fog_calc.wgsl"),
      ]);

    registry.registerChunk("WGSL_STRUCTS", wgslStructs, "wgsl");
    registry.registerChunk("WGSL_LIGHTING", wgslLighting, "wgsl");
    registry.registerChunk("WGSL_PBR_MATH", wgslPbrMath, "wgsl");
    registry.registerChunk("WGSL_PBR_LIGHTING", wgslPbrLighting, "wgsl");
    registry.registerChunk("WGSL_FOG_CALC", wgslFogCalc, "wgsl");

    loader.setBasePath("/resources/shaders/web_gpu/");
    const wgslBaseVs = await loader.load("base.vert.wgsl");
    registry.registerChunk("WGSL_VS", wgslBaseVs, "wgsl");

    // --- Post-Processing Filter Chunks ---
    registry.registerChunk("FILTER_GLITCH_DISTORT", FILTER_GLITCH_DISTORT_GLSL, "glsl300");
    registry.registerChunk("FILTER_GLITCH_DISTORT", FILTER_GLITCH_DISTORT_WGSL, "wgsl");

    registry.registerChunk("FILTER_VHS_DISTORT", FILTER_VHS_DISTORT_GLSL, "glsl300");
    registry.registerChunk("FILTER_VHS_DISTORT", FILTER_VHS_DISTORT_WGSL, "wgsl");

    registry.registerChunk("FILTER_COLOR_GRADING", FILTER_COLOR_GRADING_GLSL, "glsl300");
    registry.registerChunk("FILTER_COLOR_GRADING", FILTER_COLOR_GRADING_WGSL, "wgsl");

    this._isInitialized = true;
  }
}
