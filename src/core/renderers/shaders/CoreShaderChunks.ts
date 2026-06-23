/// src/core/renderers/shaders/CoreShaderChunks.ts

import { ShaderRegistry } from "./ShaderRegistry.js";
import { ShaderLoader } from "../../../loaders/ShaderLoader.js";

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

    // --- Inline Fog Chunks ---
    const fogDefsGLSL = `
uniform int u_fogMode;
uniform vec3 u_fogColor;
uniform float u_fogDensity;
uniform float u_fogNear;
uniform float u_fogFar;
uniform float u_fogHeight;
uniform float u_fogHeightFalloff;
    `;
    const fogCalcGLSL = `
    if (u_fogMode > 0) {
        float fogDist = length(v_worldPos - u_viewPos);
        float fogFactor = 0.0;
        
        if (u_fogMode == 1) { // LINEAR
            fogFactor = (u_fogFar - fogDist) / (u_fogFar - u_fogNear);
        } else if (u_fogMode == 2) { // EXP
            fogFactor = exp(-fogDist * u_fogDensity);
        } else if (u_fogMode == 3) { // EXP2
            fogFactor = exp(-(fogDist * u_fogDensity) * (fogDist * u_fogDensity));
        }
        
        // Height falloff (Unreal style)
        if (u_fogHeightFalloff > 0.0) {
            float heightFactor = exp(-u_fogHeightFalloff * (v_worldPos.y - u_fogHeight));
            heightFactor = clamp(heightFactor, 0.0, 1.0);
            fogFactor = 1.0 - ((1.0 - fogFactor) * heightFactor);
        }
        
        fogFactor = clamp(fogFactor, 0.0, 1.0);
        
        #if __VERSION__ == 300
            fragColor.rgb = mix(u_fogColor, fragColor.rgb, fogFactor);
        #else
            gl_FragColor.rgb = mix(u_fogColor, gl_FragColor.rgb, fogFactor);
        #endif
    }
    `;

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
    registry.registerChunk("FOG_DEFS", fogDefsGLSL, "glsl300");
    registry.registerChunk("FOG_CALC", fogCalcGLSL, "glsl300");

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
    registry.registerChunk("FOG_DEFS", fogDefsGLSL, "glsl100");
    registry.registerChunk("FOG_CALC", fogCalcGLSL, "glsl100");

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
    const filterGlitchDistortGLSL = `
        float glitchTime = u_time * 3.0;
        float blockNoise = step(0.92, random(vec2(floor(uv.y * 12.0), floor(glitchTime * 6.0))));
        float glitchOffset = blockNoise * (random(vec2(floor(uv.y * 8.0), floor(glitchTime))) - 0.5) * 0.05;
        float scanJitter = sin(uv.y * 10.0 + u_time * 20.0) * 0.003 * step(0.95, sin(u_time * 2.0));
        distortUv.x += glitchOffset + scanJitter;
    `;
    const filterGlitchDistortWGSL = `
        let glitchTime = u.time * 3.0;
        let blockNoise = step(0.92, random(vec2f(floor(uv.y * 12.0), floor(glitchTime * 6.0))));
        let glitchOffset = blockNoise * (random(vec2f(floor(uv.y * 8.0), floor(glitchTime))) - 0.5) * 0.05;
        let scanJitter = sin(uv.y * 10.0 + u.time * 20.0) * 0.003 * step(0.95, sin(u.time * 2.0));
        distortUv.x += glitchOffset + scanJitter;
    `;

    const filterVhsDistortGLSL = `
        float jitterTime = u_time * 15.0;
        float jitter = (random(vec2(jitterTime, uv.y)) - 0.5) * 0.003 * step(0.97, random(vec2(jitterTime)));
        float tracking = step(0.92, sin(uv.y * 3.5 - u_time * 1.2));
        float trackingDistort = tracking * (random(vec2(uv.y, u_time)) - 0.5) * 0.012;
        distortUv.x += jitter + trackingDistort;
        
        float bounce = step(0.98, sin(u_time * 0.5)) * (random(vec2(u_time)) - 0.5) * 0.01;
        distortUv.y += bounce;
    `;
    const filterVhsDistortWGSL = `
        let jitterTime = u.time * 15.0;
        let jitter = (random(vec2f(jitterTime, uv.y)) - 0.5) * 0.003 * step(0.97, random(vec2f(jitterTime)));
        let tracking = step(0.92, sin(uv.y * 3.5 - u.time * 1.2));
        let trackingDistort = tracking * (random(vec2f(uv.y, u.time)) - 0.5) * 0.012;
        distortUv.x += jitter + trackingDistort;

        let bounce = step(0.98, sin(u.time * 0.5)) * (random(vec2f(u.time)) - 0.5) * 0.01;
        distortUv.y += bounce;
    `;

    const filterColorGradingGLSL = `
    if (u_filterMode == 1) { // Night Vision
        float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
        float scanline = sin(distortUv.y * 350.0 + u_time * 12.0) * 0.08;
        luma -= scanline;
        float flicker = 1.0 + (sin(u_time * 40.0) * cos(u_time * 25.0) * 0.03);
        luma *= flicker;
        
        float noise = random(distortUv + vec2(u_time, -u_time));
        if (noise > 0.99) {
            luma += 0.25;
        }
        srgb = vec3(luma * 0.12, luma * 1.6, luma * 0.25);
    }
    else if (u_filterMode == 2) { // Noir Detective
        float luma = dot(srgb, vec3(0.2126, 0.7152, 0.0722));
        luma = smoothstep(0.04, 0.96, luma);
        srgb = mix(vec3(luma * 0.85, luma * 0.88, luma * 0.95), vec3(luma * 1.05, luma * 1.0, luma * 0.9), luma);
    }
    else if (u_filterMode == 3) { // Cyber Glitch
        srgb.r *= 1.25;
        srgb.g *= 0.75;
        srgb.b *= 1.5;
        srgb = pow(clamp(srgb, 0.0, 1.0), vec3(1.2));
        float grid = sin(distortUv.y * 450.0) * 0.05;
        srgb -= vec3(grid);
    }
    else if (u_filterMode == 4) { // VHS Tape
        float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
        srgb = mix(srgb, vec3(luma), 0.45);
        float scanline = sin(distortUv.y * 280.0) * 0.06;
        srgb -= vec3(scanline);
        srgb.r *= 1.15;
        srgb.g *= 0.95;
        srgb.b *= 0.82;
        float lineNoise = step(0.99, random(vec2(u_time, distortUv.y)));
        srgb += vec3(lineNoise * 0.2);
    }
    else if (u_filterMode == 5) { // Underworld
        srgb.r *= 1.35;
        srgb.g *= 0.88;
        srgb.b *= 0.52;
        srgb = pow(clamp(srgb, 0.0, 1.0), vec3(1.3));
    }
    else if (u_filterMode == 6) { // Old Projector
        float projFlicker = 0.85 + 0.15 * random(vec2(u_time * 25.0, 9.0));
        srgb *= projFlicker;
        float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
        srgb = vec3(luma * 1.15, luma * 0.95, luma * 0.75);
        
        float scratchX = random(vec2(floor(u_time * 8.0), 12.0));
        float scratchWidth = 0.0012;
        float isScratch = step(scratchX, distortUv.x) * step(distortUv.x, scratchX + scratchWidth);
        float scratchVis = step(0.65, random(vec2(floor(u_time * 4.0), 13.0)));
        float scratchIntensity = isScratch * scratchVis * (0.4 + 0.6 * random(distortUv + u_time));
        srgb = mix(srgb, vec3(1.0), scratchIntensity);
        
        float spotFrame = floor(u_time * 12.0);
        vec2 spotPos = vec2(random(vec2(spotFrame, 14.0)), random(vec2(spotFrame, 15.0)));
        float spotRadius = 0.006 + 0.012 * random(vec2(spotFrame, 16.0));
        float distToSpot = distance(distortUv, spotPos);
        float isSpot = step(distToSpot, spotRadius) * step(0.82, random(vec2(spotFrame, 17.0)));
        
        float hairSeed = random(vec2(spotFrame, 18.0));
        float isHair = 0.0;
        if (hairSeed > 0.80) {
            float hairX = spotPos.x + sin(distortUv.y * 60.0 + spotFrame) * 0.004;
            float hairWidth = 0.0008;
            isHair = step(hairX - hairWidth, distortUv.x) * step(distortUv.x, hairX + hairWidth) * step(abs(distortUv.y - spotPos.y), 0.06);
        }
        float dirtColor = max(isSpot, isHair);
        srgb = mix(srgb, vec3(random(vec2(spotFrame)) > 0.5 ? 0.05 : 0.95), dirtColor);
    }
    else if (u_filterMode == 7) { // Thermal Vision
        float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
        vec3 cold = vec3(0.05, 0.05, 0.45);
        vec3 warm = vec3(0.85, 0.1, 0.05);
        vec3 hot = vec3(0.95, 0.9, 0.05);
        vec3 whiteHot = vec3(1.0, 1.0, 1.0);
        
        vec3 c1 = mix(cold, warm, clamp(luma / 0.3, 0.0, 1.0));
        vec3 c2 = mix(c1, hot, clamp((luma - 0.3) / 0.4, 0.0, 1.0));
        srgb = mix(c2, whiteHot, clamp((luma - 0.7) / 0.3, 0.0, 1.0));
    }
    `;

    const filterColorGradingWGSL = `
    if (1u == u.filterMode) { // Night Vision
        var luma = dot(srgb, vec3f(0.299, 0.587, 0.114));
        let scanline = sin(distortUv.y * 350.0 + u.time * 12.0) * 0.08;
        luma -= scanline;
        let flicker = 1.0 + (sin(u.time * 40.0) * cos(u.time * 25.0) * 0.03);
        luma *= flicker;

        let noise = random(distortUv + vec2f(u.time, -u.time));
        if (noise > 0.99) {
            luma += 0.25;
        }

        srgb = vec3f(luma * 0.12, luma * 1.6, luma * 0.25);
    }
    else if (2u == u.filterMode) { // Noir Detective
        var luma = dot(srgb, vec3f(0.2126, 0.7152, 0.0722));
        luma = smoothstep(0.04, 0.96, luma);
        srgb = mix(vec3f(luma * 0.85, luma * 0.88, luma * 0.95), vec3f(luma * 1.05, luma * 1.0, luma * 0.9), luma);
    }
    else if (3u == u.filterMode) { // Cyber Glitch
        srgb.x *= 1.25;
        srgb.y *= 0.75;
        srgb.z *= 1.5;
        srgb = pow(clamp(srgb, vec3f(0.0), vec3f(1.0)), vec3f(1.2));
        let grid = sin(distortUv.y * 450.0) * 0.05;
        srgb -= vec3f(grid);
    }
    else if (4u == u.filterMode) { // VHS Tape
        let luma = dot(srgb, vec3f(0.299, 0.587, 0.114));
        srgb = mix(srgb, vec3f(luma), 0.45);
        let scanline = sin(distortUv.y * 280.0) * 0.06;
        srgb -= vec3f(scanline);
        srgb.x *= 1.15;
        srgb.y *= 0.95;
        srgb.z *= 0.82;
        let lineNoise = step(0.99, random(vec2f(u.time, distortUv.y)));
        srgb += vec3f(lineNoise * 0.2);
    }
    else if (5u == u.filterMode) { // Underworld
        srgb.x *= 1.35;
        srgb.y *= 0.88;
        srgb.z *= 0.52;
        srgb = pow(clamp(srgb, vec3f(0.0), vec3f(1.0)), vec3f(1.3));
    }
    else if (6u == u.filterMode) { // Old Projector
        let projFlicker = 0.85 + 0.15 * random(vec2f(u.time * 25.0, 9.0));
        srgb *= projFlicker;
        let luma = dot(srgb, vec3f(0.299, 0.587, 0.114));
        srgb = vec3f(luma * 1.15, luma * 0.95, luma * 0.75);
        
        let scratchX = random(vec2f(floor(u.time * 8.0), 12.0));
        let scratchWidth = 0.0012;
        let isScratch = step(scratchX, distortUv.x) * step(distortUv.x, scratchX + scratchWidth);
        let scratchVis = step(0.65, random(vec2f(floor(u.time * 4.0), 13.0)));
        let scratchIntensity = isScratch * scratchVis * (0.4 + 0.6 * random(distortUv + vec2f(u.time)));
        srgb = mix(srgb, vec3f(1.0), scratchIntensity);
        
        let spotFrame = floor(u.time * 12.0);
        let spotPos = vec2f(random(vec2f(spotFrame, 14.0)), random(vec2f(spotFrame, 15.0)));
        let spotRadius = 0.006 + 0.012 * random(vec2f(spotFrame, 16.0));
        let distToSpot = distance(distortUv, spotPos);
        let isSpot = step(distToSpot, spotRadius) * step(0.82, random(vec2f(spotFrame, 17.0)));
        
        let hairSeed = random(vec2f(spotFrame, 18.0));
        let hairX = spotPos.x + sin(distortUv.y * 60.0 + spotFrame) * 0.004;
        let hairWidth = 0.0008;
        let isHair = select(0.0, step(hairX - hairWidth, distortUv.x) * step(distortUv.x, hairX + hairWidth) * step(abs(distortUv.y - spotPos.y), 0.06), hairSeed > 0.80);
        let dirtColor = max(isSpot, isHair);
        srgb = mix(srgb, vec3f(select(0.95, 0.05, random(vec2f(spotFrame, 19.0)) > 0.5)), dirtColor);
    }
    else if (7u == u.filterMode) { // Thermal Vision
        let luma = dot(srgb, vec3f(0.299, 0.587, 0.114));
        let cold = vec3f(0.05, 0.05, 0.45);
        let warm = vec3f(0.85, 0.1, 0.05);
        let hot = vec3f(0.95, 0.9, 0.05);
        let whiteHot = vec3f(1.0, 1.0, 1.0);

        let c1 = mix(cold, warm, clamp(luma / 0.3, 0.0, 1.0));
        let c2 = mix(c1, hot, clamp((luma - 0.3) / 0.4, 0.0, 1.0));
        srgb = mix(c2, whiteHot, clamp((luma - 0.7) / 0.3, 0.0, 1.0));
    }
    `;

    registry.registerChunk("FILTER_GLITCH_DISTORT", filterGlitchDistortGLSL, "glsl300");
    registry.registerChunk("FILTER_GLITCH_DISTORT", filterGlitchDistortWGSL, "wgsl");

    registry.registerChunk("FILTER_VHS_DISTORT", filterVhsDistortGLSL, "glsl300");
    registry.registerChunk("FILTER_VHS_DISTORT", filterVhsDistortWGSL, "wgsl");

    registry.registerChunk("FILTER_COLOR_GRADING", filterColorGradingGLSL, "glsl300");
    registry.registerChunk("FILTER_COLOR_GRADING", filterColorGradingWGSL, "wgsl");

    this._isInitialized = true;
  }
}
