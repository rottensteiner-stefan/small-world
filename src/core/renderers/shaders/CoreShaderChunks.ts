import FOG_DEFS from "../../materials/shaders/chunks/fog_defs.glsl?raw";
import FOG_CALC from "../../materials/shaders/chunks/fog_calc.glsl?raw";
import FILTER_GLITCH_DISTORT_GLSL from "../../materials/shaders/chunks/filter_glitch_distort.glsl?raw";
import FILTER_GLITCH_DISTORT_WGSL from "../../materials/shaders/chunks/filter_glitch_distort.wgsl?raw";
import FILTER_VHS_DISTORT_GLSL from "../../materials/shaders/chunks/filter_vhs_distort.glsl?raw";
import FILTER_VHS_DISTORT_WGSL from "../../materials/shaders/chunks/filter_vhs_distort.wgsl?raw";

import filterNightVisionGLSL from "../../materials/shaders/chunks/filter_night_vision.glsl?raw";
import filterNoirGLSL from "../../materials/shaders/chunks/filter_noir.glsl?raw";
import filterCyberGlitchGLSL from "../../materials/shaders/chunks/filter_cyber_glitch.glsl?raw";
import filterVhsTapeGLSL from "../../materials/shaders/chunks/filter_vhs_tape.glsl?raw";
import filterUnderworldGLSL from "../../materials/shaders/chunks/filter_underworld.glsl?raw";
import filterOldProjectorGLSL from "../../materials/shaders/chunks/filter_old_projector.glsl?raw";
import filterThermalVisionGLSL from "../../materials/shaders/chunks/filter_thermal_vision.glsl?raw";

import filterNightVisionWGSL from "../../materials/shaders/chunks/filter_night_vision.wgsl?raw";
import filterNoirWGSL from "../../materials/shaders/chunks/filter_noir.wgsl?raw";
import filterCyberGlitchWGSL from "../../materials/shaders/chunks/filter_cyber_glitch.wgsl?raw";
import filterVhsTapeWGSL from "../../materials/shaders/chunks/filter_vhs_tape.wgsl?raw";
import filterUnderworldWGSL from "../../materials/shaders/chunks/filter_underworld.wgsl?raw";
import filterOldProjectorWGSL from "../../materials/shaders/chunks/filter_old_projector.wgsl?raw";
import filterThermalVisionWGSL from "../../materials/shaders/chunks/filter_thermal_vision.wgsl?raw";

// --- WebGL 2 ---
import gl2BaseVsHeader from "./source/web_gl2/chunks/base_vertex_header.vert.glsl?raw";
import gl2BaseVsMain from "./source/web_gl2/chunks/base_vertex_main.vert.glsl?raw";
import gl2BaseFsHeader from "./source/web_gl2/chunks/base_fragment_header.frag.glsl?raw";
import gl2LightDefs from "./source/web_gl2/chunks/lights.frag.glsl?raw";
import gl2LightCalc from "./source/web_gl2/chunks/light_calc.frag.glsl?raw";
import gl2PbrMath from "./source/web_gl2/chunks/pbr_math.frag.glsl?raw";
import gl2LightCalcPbr from "./source/web_gl2/chunks/light_calc_pbr.frag.glsl?raw";
import gl2SdfMath from "./source/web_gl2/chunks/sdf_math.glsl?raw";

// --- WebGL 1 ---
import gl1LightDefs from "./source/web_gl1/chunks/lights.frag.glsl?raw";
import gl1LightCalc from "./source/web_gl1/chunks/light_calc.frag.glsl?raw";
import gl1PbrMath from "./source/web_gl1/chunks/pbr_math.frag.glsl?raw";
import gl1LightCalcPbr from "./source/web_gl1/chunks/light_calc_pbr.frag.glsl?raw";
import gl1BaseVs from "./source/web_gl1/base.vert.glsl?raw";
import gl1BaseFs from "./source/web_gl1/base.frag.glsl?raw";

// --- WebGPU ---
import wgslStructs from "./source/web_gpu/chunks/structs.wgsl?raw";
import wgslLighting from "./source/web_gpu/chunks/lighting.wgsl?raw";
import wgslPbrMath from "./source/web_gpu/chunks/pbr_math.wgsl?raw";
import wgslPbrLighting from "./source/web_gpu/chunks/lighting_pbr.wgsl?raw";
import wgslFogCalc from "./source/web_gpu/chunks/fog_calc.wgsl?raw";
import wgslSdfMath from "./source/web_gpu/chunks/sdf_math.wgsl?raw";
import wgslScreenFootprint from "./source/web_gpu/chunks/screen_footprint.wgsl?raw";
import wgslBaseVs from "./source/web_gpu/base.vert.wgsl?raw";
import { ShaderRegistry } from "./ShaderRegistry.js";

/**
 * Utility to load and register all standard shader chunks used by the engine.
 */
export class CoreShaderChunks {
  private static _bootstrapped: WeakSet<ShaderRegistry> = new WeakSet();

  /**
   * Initializes the registry with all standard chunks for all supported languages.
   */
  public static async init(registry: ShaderRegistry = ShaderRegistry.instance): Promise<void> {
    if (this._bootstrapped.has(registry)) {
      return;
    }

    // --- WebGL 2 Chunks ---
    registry.registerChunk("BASE_VERTEX_HEADER", gl2BaseVsHeader, "glsl300");
    registry.registerChunk("BASE_VERTEX_MAIN", gl2BaseVsMain, "glsl300");
    registry.registerChunk("BASE_FRAGMENT_HEADER", gl2BaseFsHeader, "glsl300");
    registry.registerChunk("LIGHT_DEFS", gl2LightDefs, "glsl300");
    registry.registerChunk("LIGHT_CALC", gl2LightCalc, "glsl300");
    registry.registerChunk("PBR_MATH", gl2PbrMath, "glsl300");
    registry.registerChunk("LIGHT_CALC_PBR", gl2LightCalcPbr, "glsl300");
    registry.registerChunk("SDF_MATH", gl2SdfMath, "glsl300");
    registry.registerChunk("FOG_DEFS", FOG_DEFS, "glsl300");
    registry.registerChunk("FOG_CALC", FOG_CALC, "glsl300");

    // --- WebGL 1 Chunks ---
    registry.registerChunk("BASE_VS", gl1BaseVs, "glsl100");
    registry.registerChunk("BASE_FS_HEADER", gl1BaseFs, "glsl100");
    registry.registerChunk("LIGHT_DEFS", gl1LightDefs, "glsl100");
    registry.registerChunk("LIGHT_CALC", gl1LightCalc, "glsl100");
    registry.registerChunk("PBR_MATH", gl1PbrMath, "glsl100");
    registry.registerChunk("LIGHT_CALC_PBR", gl1LightCalcPbr, "glsl100");
    registry.registerChunk("SDF_MATH", gl2SdfMath, "glsl100");
    registry.registerChunk("FOG_DEFS", FOG_DEFS, "glsl100");
    registry.registerChunk("FOG_CALC", FOG_CALC, "glsl100");

    // --- WebGPU Chunks ---
    registry.registerChunk("WGSL_STRUCTS", wgslStructs, "wgsl");
    registry.registerChunk("WGSL_LIGHTING", wgslLighting, "wgsl");
    registry.registerChunk("WGSL_PBR_MATH", wgslPbrMath, "wgsl");
    registry.registerChunk("WGSL_PBR_LIGHTING", wgslPbrLighting, "wgsl");
    registry.registerChunk("WGSL_FOG_CALC", wgslFogCalc, "wgsl");
    registry.registerChunk("WGSL_SDF_MATH", wgslSdfMath, "wgsl");
    registry.registerChunk("WGSL_SCREEN_FOOTPRINT", wgslScreenFootprint, "wgsl");
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
    if (1u == u_filterMode) { // Night Vision
        ${filterNightVisionWGSL}
    } else if (2u == u_filterMode) { // Noir Detective
        ${filterNoirWGSL}
    } else if (3u == u_filterMode) { // Cyber Glitch
        ${filterCyberGlitchWGSL}
    } else if (4u == u_filterMode) { // VHS Tape
        ${filterVhsTapeWGSL}
    } else if (5u == u_filterMode) { // Underworld
        ${filterUnderworldWGSL}
    } else if (6u == u_filterMode) { // Old Projector
        ${filterOldProjectorWGSL}
    } else if (7u == u_filterMode) { // Thermal Vision
        ${filterThermalVisionWGSL}
    }
    `;

    registry.registerChunk("FILTER_COLOR_GRADING", filterColorGradingGLSL, "glsl300");
    registry.registerChunk("FILTER_COLOR_GRADING", filterColorGradingWGSL, "wgsl");

    this._bootstrapped.add(registry);
  }
}
