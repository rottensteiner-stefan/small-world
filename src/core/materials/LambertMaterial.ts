/// src/core/materials/LambertMaterial.ts
import { AbstractMaterial } from "./index.js";
import { MaterialType } from "../../enums/index.js";
export class LambertMaterial extends AbstractMaterial {
  public readonly type = MaterialType.LAMBERT;
}
