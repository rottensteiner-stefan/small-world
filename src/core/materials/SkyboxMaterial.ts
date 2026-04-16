/// src/core/materials/SkyboxMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { CubeTexture } from "../textures/index.js";
import { CullMode, MaterialType } from "../../enums/index.js";
import { Color } from "../colors/Color.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

/**
 * Configuration options for skybox material.
 */
export interface SkyboxMaterialOptions {
  /** The base color. Defaults to white. */
  color?: Color;
  /** The cube map texture. Defaults to undefined. */
  cubeMap?: CubeTexture | undefined;
}

/**
 * A material for skyboxes.
 */
export class SkyboxMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.SKYBOX;

  /** The cube map texture. */
  public cubeMap: CubeTexture | undefined;

  /**
   * Creates a new SkyboxMaterial.
   * @param options The configuration options.
   */
  constructor(options: SkyboxMaterialOptions = {}) {
    super();
    const { color = Color.WHITE, cubeMap = undefined } = options;
    this.color = color;
    this.cubeMap = cubeMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    return {
      shaderId: this.type,
      properties: {
        u_color: this.color.toFloat32Array(),
      },
      textures: {
        u_skybox: this.cubeMap || undefined,
      },
      state: {
        depthWrite: false,
        culling: CullMode.NONE, // Skybox is visible from the inside
      },
    };
  }
}
