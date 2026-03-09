import { Material } from "./Material.js";
import { Color } from "../core/Color.js";
export class PhongMaterial extends Material {
    type = "PhongMaterial";
    specularColor = Color.WHITE;
    shininess = 32.0; // Je höher, desto kleiner und schärfer der Glanzpunkt
}
//# sourceMappingURL=PhongMaterial.js.map