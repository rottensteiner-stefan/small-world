/// src/core/materials/BasicMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/index.js";

export class BasicMaterial extends AbstractMaterial {
  public readonly type = MaterialType.BASIC;
}
