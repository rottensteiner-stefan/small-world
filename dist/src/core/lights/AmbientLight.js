import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { Light } from "./Light.js";
export class AmbientLight extends Light {
    lightType = LightType.AMBIENT;
    constructor(color = new Color(1, 1, 1), intensity = 0.2) {
        super(color, intensity, "AmbientLight");
    }
}
//# sourceMappingURL=AmbientLight.js.map