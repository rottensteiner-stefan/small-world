import { AbstractMaterial } from "./AbstractMaterial.js";
import { CubeTexture } from "../textures/CubeTexture.js";

export class SkyboxMaterial extends AbstractMaterial {
  public static readonly type = "SkyboxMaterial";
  public cubeMap: CubeTexture | null = null;
}
