import { Material } from "./Material.js";
import { Color } from "../colors/Color.js";
export class PhongMaterial extends Material {
    type = "PhongMaterial";
    specularColor = Color.WHITE;
    shininess = 32.0;
}
//# sourceMappingURL=PhongMaterial.js.map