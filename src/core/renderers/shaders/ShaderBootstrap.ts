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
    const [gl2BaseVsHeader, gl2BaseVsMain, gl2BaseFsHeader, gl2LightDefs, gl2LightCalc] =
      await Promise.all([
        loader.load("base_vertex_header.glsl"),
        loader.load("base_vertex_main.glsl"),
        loader.load("base_fragment_header.glsl"),
        loader.load("lights.frag.glsl"),
        loader.load("light_calc.frag.glsl"),
      ]);

    registry.registerChunk("BASE_VERTEX_HEADER", gl2BaseVsHeader, "glsl300");
    registry.registerChunk("BASE_VERTEX_MAIN", gl2BaseVsMain, "glsl300");
    registry.registerChunk("BASE_FRAGMENT_HEADER", gl2BaseFsHeader, "glsl300");
    registry.registerChunk("LIGHT_DEFS", gl2LightDefs, "glsl300");
    registry.registerChunk("LIGHT_CALC", gl2LightCalc, "glsl300");

    // WebGL 1 Chunks
    loader.setBasePath("/resources/shaders/web_gl1/chunks/");
    const [gl1LightDefs, gl1LightCalc] = await Promise.all([
      loader.load("lights.frag.glsl"),
      loader.load("light_calc.frag.glsl"),
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

    // WebGPU Chunks
    loader.setBasePath("/resources/shaders/web_gpu/chunks/");
    const [wgslStructs, wgslLighting] = await Promise.all([
      loader.load("structs.wgsl"),
      loader.load("lighting.wgsl"),
    ]);

    registry.registerChunk("WGSL_STRUCTS", wgslStructs, "wgsl");
    registry.registerChunk("WGSL_LIGHT_CALC", wgslLighting, "wgsl");

    // --- 2. LOAD MATERIAL FRAGMENTS ---

    // WebGL 2 Materials
    loader.setBasePath("/resources/shaders/web_gl2/materials/");
    const [gl2BasicFs, gl2PhongFs, gl2LambertFs, gl2SpriteFs, gl2WireframeFs, gl2SkyVs, gl2SkyFs, gl2TerrainFs] =
      await Promise.all([
        loader.load("basic.frag.glsl"),
        loader.load("phong.frag.glsl"),
        loader.load("lambert.frag.glsl"),
        loader.load("sprite.frag.glsl"),
        loader.load("wireframe.frag.glsl"),
        loader.load("skybox.vert.glsl"),
        loader.load("skybox.frag.glsl"),
        loader.load("terrain.frag.glsl"),
      ]);

    // WebGL 1 Materials
    loader.setBasePath("/resources/shaders/web_gl1/materials/");
    const [gl1BasicFs, gl1PhongFs, gl1SkyVs, gl1SkyFs, gl1TerrainFs] =
      await Promise.all([
        loader.load("basic.frag.glsl"),
        loader.load("phong.frag.glsl"),
        loader.load("skybox.vert.glsl"),
        loader.load("skybox.frag.glsl"),
        loader.load("terrain.frag.glsl"),
      ]);

    // WebGPU Materials
    loader.setBasePath("/resources/shaders/web_gpu/");
    const wgslBaseVs = await loader.load("base.vs.wgsl");
    const wgslSkyVs = await loader.load("skybox.vs.wgsl");

    loader.setBasePath("/resources/shaders/web_gpu/materials/");
    const [wgslBasicFs, wgslPhongFs, wgslLambertFs, wgslSpriteFs, wgslWireframeFs, wgslSkyFs, wgslTerrainFs] =
      await Promise.all([
        loader.load("basic.fs.wgsl"),
        loader.load("phong.fs.wgsl"),
        loader.load("lambert.fs.wgsl"),
        loader.load("sprite.fs.wgsl"),
        loader.load("wireframe.fs.wgsl"),
        loader.load("skybox.fs.wgsl"),
        loader.load("terrain.fs.wgsl"),
      ]);

    registry.registerChunk("WGSL_VS", wgslBaseVs, "wgsl");

    // --- 3. REGISTER SHADERS ---

    // BASIC
    registry.register({
      id: MaterialType.BASIC,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2BasicFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1BasicFs },
        wgsl: `[WGSL_STRUCTS][WGSL_VS]${wgslBasicFs}`,
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
        wgsl: `[WGSL_STRUCTS][WGSL_VS]${wgslPhongFs}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_specColor: { type: ShaderPropertyType.COLOR },
          u_shininess: { type: ShaderPropertyType.FLOAT },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    });

    // LAMBERT
    registry.register({
      id: MaterialType.LAMBERT,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2LambertFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1PhongFs }, // Fallback to phong for now in GL1
        wgsl: `[WGSL_STRUCTS][WGSL_VS]${wgslLambertFs}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    });

    // SPRITE
    registry.register({
      id: MaterialType.SPRITE,
      sources: {
        glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: gl2SpriteFs },
        glsl100: { vs: "[BASE_VS]", fs: gl1BasicFs },
        wgsl: `[WGSL_STRUCTS][WGSL_VS]${wgslSpriteFs}`,
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
        wgsl: `[WGSL_STRUCTS][WGSL_VS]${wgslWireframeFs}`,
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
        wgsl: `[WGSL_STRUCTS]${wgslSkyVs}${wgslSkyFs}`,
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
        wgsl: `[WGSL_STRUCTS][WGSL_VS]${wgslTerrainFs}`,
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
