import { Material } from "./Material.js";

export class WireframeMaterial extends Material {
  public get type(): string {
    return "WireframeMaterial";
  }
}
