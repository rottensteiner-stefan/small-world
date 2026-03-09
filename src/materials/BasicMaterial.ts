import { Material } from "./Material.js";

export class BasicMaterial extends Material {
  public get type(): string {
    return "BasicMaterial";
  }
}
