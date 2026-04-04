/// src/renderers/webgl2/WebGL2ShaderBuilder.ts

import { MaterialType } from "../../enums/index.js";
import { ShaderLoader } from "../../loaders/index.js";

/**
 * Builds WebGL 2.0 shader programs dynamically by loading and combining .glsl chunks.
 */
export class WebGL2ShaderBuilder {
  private static _isLoaded: boolean = false;
  private static _chunks: Record<string, string> = {};

  /**
   * Loads all required shader chunks from the server.
   */
  public static async preloadShaders(): Promise<void> {
    if (this._isLoaded) return;

    const loader = new ShaderLoader();
    loader.setBasePath("/resources/shaders/web_gl2/");

    const [
      baseVs,
      baseFs,
      lightsFs,
      terrainFs,
      lightCalcFs,
      skyboxVs,
      skyboxFs,
      matBasicFs,
      matPhongFs,
      matTerrainFs,
    ] = await Promise.all([
      loader.load("base.vert.glsl"),
      loader.load("base.frag.glsl"),
      loader.load("chunks/lights.frag.glsl"),
      loader.load("chunks/terrain.frag.glsl"),
      loader.load("chunks/light_calc.frag.glsl"),
      loader.load("skybox.vert.glsl"),
      loader.load("skybox.frag.glsl"),
      loader.load("materials/basic.frag.glsl"),
      loader.load("materials/phong.frag.glsl"),
      loader.load("materials/terrain.frag.glsl"),
    ]);

    this._chunks = {
      baseVs,
      baseFs,
      lightsFs,
      terrainFs,
      lightCalcFs,
      skyboxVs,
      skyboxFs,
      matBasicFs,
      matPhongFs,
      matTerrainFs,
    };

    this._isLoaded = true;
  }

  /**
   * Assembles the final Vertex and Fragment shader strings for the given material type.
   * @param type The material type.
   * @returns The combined shader source codes.
   */
  public static build(type: MaterialType): { vs: string; fs: string } {
    if (!this._isLoaded) {
      throw new Error(
        "[WebGL2ShaderBuilder] Shaders are not preloaded yet. Call preloadShaders() first.",
      );
    }

    if (type === MaterialType.SKYBOX) {
      return {
        vs: this._chunks["skyboxVs"]!,
        fs: this._chunks["skyboxFs"]!,
      };
    }

    let fs = "";

    if (type === MaterialType.TERRAIN) {
      fs = this._chunks["matTerrainFs"]!;
      fs = fs.replace("// [INCLUDE_BASE]", this._chunks["baseFs"]!);
      fs = fs.replace("// [INCLUDE_LIGHTS]", this._chunks["lightsFs"]!);
      fs = fs.replace("// [INCLUDE_TERRAIN_UNIFORMS]", this._chunks["terrainFs"]!);
      fs = fs.replace("// [CHUNK_LIGHT_CALC]", this._chunks["lightCalcFs"]!);
    } else if (
      type === MaterialType.BASIC ||
      type === MaterialType.SPRITE ||
      type === MaterialType.WIREFRAME
    ) {
      fs = this._chunks["matBasicFs"]!;
      fs = fs.replace("// [INCLUDE_BASE]", this._chunks["baseFs"]!);
    } else {
      // Default: PHONG / LAMBERT
      fs = this._chunks["matPhongFs"]!;
      fs = fs.replace("// [INCLUDE_BASE]", this._chunks["baseFs"]!);
      fs = fs.replace("// [INCLUDE_LIGHTS]", this._chunks["lightsFs"]!);
      fs = fs.replace("// [CHUNK_LIGHT_CALC]", this._chunks["lightCalcFs"]!);
    }

    return {
      vs: this._chunks["baseVs"]!,
      fs,
    };
  }
}
