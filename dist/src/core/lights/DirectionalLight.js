import { Color } from "../colors/Color.js";
import { Vector3D } from "../../math/Vector3D.js";
import { LightType } from "../../enums/LightType.js";
import { AbstractLight } from "./AbstractLight.js";
export class DirectionalLight extends AbstractLight {
    type = LightType.DIRECTIONAL;
    intensity = 1.0;
    direction = new Vector3D(0, -1, 0).normalize();
    constructor(color = Color.WHITE, intensity = 1.0) {
        super(color, intensity, "DirectionalLight");
    }
}
//# sourceMappingURL=DirectionalLight.js.map