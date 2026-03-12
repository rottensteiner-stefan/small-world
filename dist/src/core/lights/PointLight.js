import { AbstractLight } from "./AbstractLight.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
export class PointLight extends AbstractLight {
    distance;
    decay;
    type = LightType.POINT;
    constructor(color = Color.WHITE, intensity = 1.0, distance = 50.0, decay = 2.0) {
        super(color, intensity, "PointLight");
        this.distance = distance;
        this.decay = decay;
    }
}
//# sourceMappingURL=PointLight.js.map