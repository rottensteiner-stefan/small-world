import { Color } from "../colors/Color.js";
import { Vector3D } from "../../math/Vector3D.js";
import { LightType } from "../../enums/LightType.js";
import { Light } from "./Light.js";
export class DirectionalLight extends Light {
    lightType = LightType.DIRECTIONAL;
    intensity = 1.0;
    direction = new Vector3D(0, -1, 0).normalize();
    constructor(color = Color.WHITE, intensity = 1.0) {
        super(color, intensity, "DirectionalLight");
    }
}
//# sourceMappingURL=DirectionalLight.js.map