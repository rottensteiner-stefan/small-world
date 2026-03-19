/// src/core/materials/SkyboxMaterial.ts
import { AbstractMaterial } from "./index.js";
import { CubeTexture } from "../textures/index.js";
import { MaterialType } from "../../enums/index.js";

export class SkyboxMaterial extends AbstractMaterial {
  public readonly type = MaterialType.SKYBOX;
  public cubeMap: CubeTexture | null = null;
}
