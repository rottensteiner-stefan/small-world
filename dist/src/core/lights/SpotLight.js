import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { AbstractLight } from "./AbstractLight.js";
import { Vector3D } from "../../math/Vector3D.js";
export class SpotLight extends AbstractLight {
    distance;
    angle;
    penumbra;
    decay;
    type = LightType.SPOT;
    direction = new Vector3D(0, -1, 0).normalize();
    constructor(color = Color.WHITE, intensity = 1.0, distance = 50.0, angle = Math.PI / 6, // 30 Grad Kegel
    penumbra = 0.5, // 0 = harte Kante, 1 = extrem weich
    decay = 2.0) {
        super(color, intensity, "SpotLight");
        this.distance = distance;
        this.angle = angle;
        this.penumbra = penumbra;
        this.decay = decay;
    }
}
//# sourceMappingURL=SpotLight.js.map