/// src/core/renderers/shaders/CoreShaderChunks.ts

import { ShaderRegistry } from "./ShaderRegistry.js";
import { ShaderLoader } from "../../../loaders/ShaderLoader.js";

import FOG_DEFS from "../../materials/shaders/chunks/fog_defs.glsl?raw";
import FOG_CALC from "../../materials/shaders/chunks/fog_calc.glsl?raw";
import FILTER_GLITCH_DISTORT_GLSL from "../../materials/shaders/chunks/filter_glitch_distort.glsl?raw";
import FILTER_GLITCH_DISTORT_WGSL from "../../materials/shaders/chunks/filter_glitch_distort.wgsl?raw";
import FILTER_VHS_DISTORT_GLSL from "../../materials/shaders/chunks/filter_vhs_distort.glsl?raw";
import FILTER_VHS_DISTORT_WGSL from "../../materials/shaders/chunks/filter_vhs_distort.wgsl?raw";

// Individual color grading GLSL filter imports
import filterNightVisionGLSL from "../../materials/shaders/chunks/filter_night_vision.glsl?raw";
import filterNoirGLSL from "../../materials/shaders/chunks/filter_noir.glsl?raw";
import filterCyberGlitchGLSL from "../../materials/shaders/chunks/filter_cyber_glitch.glsl?raw";
import filterVhsTapeGLSL from "../../materials/shaders/chunks/filter_vhs_tape.glsl?raw";
import filterUnderworldGLSL from "../../materials/shaders/chunks/filter_underworld.glsl?raw";
import filterOldProjectorGLSL from "../../materials/shaders/chunks/filter_old_projector.glsl?raw";
import filterThermalVisionGLSL from "../../materials/shaders/chunks/filter_thermal_vision.glsl?raw";

// Individual color grading WGSL filter imports
import filterNightVisionWGSL from "../../materials/shaders/chunks/filter_night_vision.wgsl?raw";
import filterNoirWGSL from "../../materials/shaders/chunks/filter_noir.wgsl?raw";
import filterCyberGlitchWGSL from "../../materials/shaders/chunks/filter_cyber_glitch.wgsl?raw";
import filterVhsTapeWGSL from "../../materials/shaders/chunks/filter_vhs_tape.wgsl?raw";
import filterUnderworldWGSL from "../../materials/shaders/chunks/filter_underworld.wgsl?raw";
import filterOldProjectorWGSL from "../../materials/shaders/chunks/filter_old_projector.wgsl?raw";
import filterThermalVisionWGSL from "../../materials/shaders/chunks/filter_thermal_vision.wgsl?raw";

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

    // Dynamically assemble GLSL color grading filters
    const filterColorGradingGLSL = `
    if (u_filterMode == 1) { // Night Vision
        ${filterNightVisionGLSL}
    } else if (u_filterMode == 2) { // Noir Detective
        ${filterNoirGLSL}
    } else if (u_filterMode == 3) { // Cyber Glitch
        ${filterCyberGlitchGLSL}
    } else if (u_filterMode == 4) { // VHS Tape
        ${filterVhsTapeGLSL}
    } else if (u_filterMode == 5) { // Underworld
        ${filterUnderworldGLSL}
    } else if (u_filterMode == 6) { // Old Projector
        ${filterOldProjectorGLSL}
    } else if (u_filterMode == 7) { // Thermal Vision
        ${filterThermalVisionGLSL}
    }
    `;

    // Dynamically assemble WGSL color grading filters
    const filterColorGradingWGSL = `
    if (1u == u.filterMode) { // Night Vision
        ${filterNightVisionWGSL}
    } else if (2u == u.filterMode) { // Noir Detective
        ${filterNoirWGSL}
    } else if (3u == u.filterMode) { // Cyber Glitch
        ${filterCyberGlitchWGSL}
    } else if (4u == u.filterMode) { // VHS Tape
        ${filterVhsTapeWGSL}
    } else if (5u == u.filterMode) { // Underworld
        ${filterUnderworldWGSL}
    } else if (6u == u.filterMode) { // Old Projector
        ${filterOldProjectorWGSL}
    } else if (7u == u.filterMode) { // Thermal Vision
        ${filterThermalVisionWGSL}
    }
    `;

    registry.registerChunk("FILTER_COLOR_GRADING", filterColorGradingGLSL, "glsl300");
    registry.registerChunk("FILTER_COLOR_GRADING", filterColorGradingWGSL, "wgsl");

    this._isInitialized = true;
  }
}
