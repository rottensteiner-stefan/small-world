/// src/core/materials/LambertMaterial.ts
import { AbstractMaterial } from "./index.js";
import { MaterialType } from "../../enums/index.js";
/**
 * A material that uses the Lambertian reflectance model.
 */
export class LambertMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.LAMBERT;
}
