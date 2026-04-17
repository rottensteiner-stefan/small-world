/// src/core/renderers/shaders/ShaderBootstrap.ts

import { ShaderRegistry } from "./ShaderRegistry.js";
import { MaterialType, ShaderPropertyType } from "../../../enums/index.js";
import { ShaderLoader } from "../../../loaders/ShaderLoader.js";

/**
 * Bootstraps the ShaderRegistry with default chunks and shader definitions by loading them from files.
 */
export class ShaderBootstrap {
  private static _isInitialized: boolean = false;

  /**
   * Initializes the registry with all standard shaders and chunks.
   */
  public static async init(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    const registry = ShaderRegistry.instance;
    const loader = new ShaderLoader();

    // --- 1. LOAD CHUNKS ---

    // WebGL 2 Chunks
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

    // WebGL 1 Chunks
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

    // WebGPU Chunks
    loader.setBasePath("/resources/shaders/web_gpu/chunks/");
    const [wgslStructs, wgslLighting, wgslPbrMath, wgslPbrLighting] = await Promise.all([
      loader.load("structs.wgsl"),
      loader.load("lighting.wgsl"),
      loader.load("pbr_math.wgsl"),
      loader.load("lighting_pbr.wgsl"),
    ]);

    registry.registerChunk("WGSL_STRUCTS", wgslStructs, "wgsl");
    registry.registerChunk("WGSL_LIGHTING", wgslLighting, "wgsl");
    registry.registerChunk("WGSL_PBR_MATH", wgslPbrMath, "wgsl");
    registry.registerChunk("WGSL_PBR_LIGHTING", wgslPbrLighting, "wgsl");

    // --- 2. LOAD MATERIAL FRAGMENTS ---

    // WebGL 2 Materials
    loader.setBasePath("/resources/shaders/web_gl2/materials/");
    const [
      gl2BasicFs,
      gl2PhongFs,
      gl2LambertFs,
      gl2SpriteFs,
      gl2WireframeFs,
      gl2SkyVs,
      gl2SkyFs,
      gl2TerrainFs,
      gl2WorldFs,
      gl2StandardFs,
    ] = await Promise.all([
      loader.load("basic.frag.glsl"),
      loader.load("phong.frag.glsl"),
      loader.load("lambert.frag.glsl"),
      loader.load("sprite.frag.glsl"),
      loader.load("wireframe.frag.glsl"),
      loader.load("skybox.vert.glsl"),
      loader.load("skybox.frag.glsl"),
      loader.load("terrain.frag.glsl"),
      loader.load("world.frag.glsl"),
      loader.load("standard.frag.glsl"),
    ]);

    // WebGL 1 Materials
    loader.setBasePath("/resources/shaders/web_gl1/materials/");
    const [gl1BasicFs, gl1PhongFs, gl1SkyVs, gl1SkyFs, gl1TerrainFs, gl1WorldFs, gl1StandardFs] =
      await Promise.all([
        loader.load("basic.frag.glsl"),
        loader.load("phong.frag.glsl"),
        loader.load("skybox.vert.glsl"),
        loader.load("skybox.frag.glsl"),
        loader.load("terrain.frag.glsl"),
        loader.load("world.frag.glsl"),
        loader.load("standard.frag.glsl"),
      ]);

    // WebGPU Materials
    loader.setBasePath("/resources/shaders/web_gpu/");
    const wgslBaseVs = await loader.load("base.vert.wgsl");
    const wgslSkyVs = await loader.load("skybox.vert.wgsl");

    loader.setBasePath("/resources/shaders/web_gpu/materials/");
    const [
      wgslBasicFs,
      wgslPhongFs,
      wgslLambertFs,
      wgslSpriteFs,
      wgslWireframeFs,
      wgslSkyFs,
      wgslTerrainFs,
      wgslWorldFs,
      wgslStandardFs,
    ] = await Promise.all([
      loader.load("basic.frag.wgsl"),
      loader.load("phong.frag.wgsl"),
      loader.load("lambert.frag.wgsl"),
      loader.load("sprite.frag.wgsl"),
      loader.load("wireframe.frag.wgsl"),
      loader.load("skybox.frag.wgsl"),
      loader.load("terrain.frag.wgsl"),
      loader.load("world.frag.wgsl"),
      loader.load("standard.frag.wgsl"),
    ]);

    registry.registerChunk("WGSL_VS", wgslBaseVs, "wgsl");

    // --- 3. REGISTER SHADERS ---

    // WORLD
    registry.register({
      id: MaterialType.WORLD,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2WorldFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1WorldFs },
        wgsl: `[WGSL_VS]\n${wgslWorldFs}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_texRepeat: { type: ShaderPropertyType.VEC2 },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    });

    // BASIC
    registry.register({
      id: MaterialType.BASIC,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2BasicFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1BasicFs },
        wgsl: `[WGSL_VS]\n${wgslBasicFs}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_texOffset: { type: ShaderPropertyType.VEC2 },
          u_texRepeat: { type: ShaderPropertyType.VEC2 },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    });

    // PHONG
    registry.register({
      id: MaterialType.PHONG,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2PhongFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1PhongFs },
        wgsl: `[WGSL_VS]\n${wgslPhongFs}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_specColor: { type: ShaderPropertyType.COLOR },
          u_shininess: { type: ShaderPropertyType.FLOAT },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 },
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
          u_specularMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    });

    // STANDARD (PBR)
    registry.register({
      id: MaterialType.STANDARD,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: gl2StandardFs,
        },
        glsl100: { vs: "[BASE_VS]", fs: gl1StandardFs },
        wgsl: `[WGSL_VS]\n${wgslStandardFs}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_metallic: { type: ShaderPropertyType.FLOAT },
          u_roughness: { type: ShaderPropertyType.FLOAT },
          u_ao: { type: ShaderPropertyType.FLOAT },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 },
          u_dirLightColor: { type: ShaderPropertyType.VEC3 },
          u_dirLightDir: { type: ShaderPropertyType.VEC3 },
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    });

    // LAMBERT
    registry.register({
      id: MaterialType.LAMBERT,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2LambertFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1PhongFs }, // Fallback to phong for now in GL1
        wgsl: `[WGSL_VS]\n${wgslLambertFs}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 },
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    });

    // SPRITE
    registry.register({
      id: MaterialType.SPRITE,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2SpriteFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1BasicFs },
        wgsl: `[WGSL_VS]\n${wgslSpriteFs}`,
      },
      layout: {
        uniforms: { u_color: { type: ShaderPropertyType.COLOR } },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    });

    // WIREFRAME
    registry.register({
      id: MaterialType.WIREFRAME,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2WireframeFs },
        glsl100: { vs: "[BASE_VS]", fs: "void main() { gl_FragColor = u_color; }" },
        wgsl: `[WGSL_VS]\n${wgslWireframeFs}`,
      },
      layout: {
        uniforms: { u_color: { type: ShaderPropertyType.COLOR } },
        textures: {},
      },
    });

    // SKYBOX
    registry.register({
      id: MaterialType.SKYBOX,
      sources: {
        glsl300: { vs: gl2SkyVs, fs: gl2SkyFs },
        glsl100: { vs: gl1SkyVs, fs: gl1SkyFs },
        wgsl: `${wgslSkyVs}\n${wgslSkyFs}`,
      },
      layout: {
        uniforms: { u_color: { type: ShaderPropertyType.COLOR } },
        textures: { u_skybox: { type: ShaderPropertyType.TEXTURE } },
      },
    });

    // TERRAIN
    registry.register({
      id: MaterialType.TERRAIN,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2TerrainFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1TerrainFs },
        wgsl: `[WGSL_VS]\n${wgslTerrainFs}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_thresholds: { type: ShaderPropertyType.VEC4 },
          u_texRepeat: { type: ShaderPropertyType.VEC2 },
        },
        textures: {
          u_sandMap: { type: ShaderPropertyType.TEXTURE },
          u_grassMap: { type: ShaderPropertyType.TEXTURE },
          u_rockMap: { type: ShaderPropertyType.TEXTURE },
          u_snowMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    });

    this._isInitialized = true;
  }
}
