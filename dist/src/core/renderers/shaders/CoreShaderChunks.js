/// src/core/renderers/shaders/CoreShaderChunks.ts
import { ShaderRegistry } from "./ShaderRegistry.js";
import { ShaderLoader } from "../../../loaders/ShaderLoader.js";
/**
 * Utility to load and register all standard shader chunks used by the engine.
 */
export class CoreShaderChunks {
    static _isInitialized = false;
    /**
     * Initializes the registry with all standard chunks for all supported languages.
     */
    static async init() {
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
        const [gl2BaseVsHeader, gl2BaseVsMain, gl2BaseFsHeader, gl2LightDefs, gl2LightCalc, gl2PbrMath, gl2LightCalcPbr,] = await Promise.all([
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
        const [wgslStructs, wgslLighting, wgslPbrMath, wgslPbrLighting, wgslFogCalc] = await Promise.all([
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
        this._isInitialized = true;
    }
}
//# sourceMappingURL=CoreShaderChunks.js.map