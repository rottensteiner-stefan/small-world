import { Material } from "./Material.js";
import { CubeTexture } from "../textures/CubeTexture.js";

export class SkyboxMaterial extends Material {
  public readonly type = "SkyboxMaterial";
  public cubeMap: CubeTexture | null = null;
}
