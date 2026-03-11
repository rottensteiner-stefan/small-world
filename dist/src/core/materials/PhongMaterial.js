// src/core/materials/PhongMaterial.ts
import { Color } from "../colors/Color.js";
import { AbstractMaterial } from "./AbstractMaterial.js";
export class PhongMaterial extends AbstractMaterial {
    static type = "PhongMaterial"; // Nur noch statisch!
    specularColor = Color.WHITE;
    shininess = 32.0;
    diffuseMap = null;
}
//# sourceMappingURL=PhongMaterial.js.map