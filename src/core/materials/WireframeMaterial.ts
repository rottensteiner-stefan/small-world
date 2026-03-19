/// src/core/materials/WireframeMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/MaterialType.js";
export class WireframeMaterial extends AbstractMaterial {
  public readonly type = MaterialType.WIREFRAME;
}
