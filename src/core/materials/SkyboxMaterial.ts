/// src/core/materials/SkyboxMaterial.ts
import { AbstractMaterial } from "./index.js";
import { CubeTexture } from "../textures/index.js";
import { MaterialType } from "../../enums/index.js";

/**
 * A material for skyboxes.
 */
export class SkyboxMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.SKYBOX;
  /** The cube map texture. */
  public cubeMap: CubeTexture | null = null;
}
