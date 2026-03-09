import { Object3D } from "./Object3D.js";
import { Color } from "./Color.js";
export class PointLight extends Object3D {
    color;
    intensity;
    distance;
    decay;
    // distance: Wie weit das Licht reicht. decay: Wie schnell es abfällt.
    constructor(color = Color.WHITE, intensity = 1.0, distance = 50.0, decay = 2.0) {
        super("PointLight");
        this.color = color;
        this.intensity = intensity;
        this.distance = distance;
        this.decay = decay;
    }
}
//# sourceMappingURL=PointLight.js.map