/// src/core/materials/WireframeMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/MaterialType.js";
/**
 * A material for wireframe rendering.
 */
export class WireframeMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.WIREFRAME;
}
