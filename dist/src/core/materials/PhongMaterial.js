import { Color } from "../colors/Color.js";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/MaterialType.js";
export class PhongMaterial extends AbstractMaterial {
    type = MaterialType.PHONG;
    specularColor = Color.WHITE;
    shininess = 32.0;
    diffuseMap = null;
}
//# sourceMappingURL=PhongMaterial.js.map