import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/MaterialType.js";
export class LambertMaterial extends AbstractMaterial {
  public readonly type = MaterialType.LAMBERT;
}
