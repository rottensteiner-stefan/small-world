import { AbstractMaterial } from "./AbstractMaterial.js";
import { CubeTexture } from "../textures/CubeTexture.js";
import { MaterialType } from "../../enums/MaterialType.js";

export class SkyboxMaterial extends AbstractMaterial {
  public readonly type = MaterialType.SKYBOX;
  public cubeMap: CubeTexture | null = null;
}
