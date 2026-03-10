import { Color } from "../colors/Color.js";
import { Material } from "./Material.js";
export class PhongMaterial extends Material {
    type = "PhongMaterial";
    // Basisfarbe (wird mit der Diffuse Map multipliziert, falls vorhanden)
    specularColor = Color.WHITE;
    shininess = 32.0;
    // --- NEU: Textur-Slots ---
    diffuseMap = null;
}
//# sourceMappingURL=PhongMaterial.js.map