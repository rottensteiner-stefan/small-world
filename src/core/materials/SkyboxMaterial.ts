/// src/core/materials/SkyboxMaterial.ts

import { AbstractMaterial } from "./index.js";
import { CubeTexture } from "../textures/index.js";
import { MaterialType } from "../../enums/index.js";
import { Color } from "../colors/Color.js";

/**
 * Configuration options for skybox material.
 */
export interface SkyboxMaterialOptions {
  /** The base color. Defaults to white. */
  color?: Color;
  /** The cube map texture. Defaults to null. */
  cubeMap?: CubeTexture | null;
}

/**
 * A material for skyboxes.
 */
export class SkyboxMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.SKYBOX;

  /** The cube map texture. */
  public cubeMap: CubeTexture | null;

  /**
   * Creates a new SkyboxMaterial.
   * @param options The configuration options.
   */
  constructor(options: SkyboxMaterialOptions = {}) {
    super();
    const { color = Color.WHITE, cubeMap = null } = options;
    this.color = color;
    this.cubeMap = cubeMap;
  }
}
