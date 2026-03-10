import { Object3D } from "../Object3D.js";
import { Color } from "../colors/Color.js";
import { Vector3D } from "../../math/Vector3D.js";
export class SpotLight extends Object3D {
    color;
    intensity;
    distance;
    angle;
    penumbra;
    decay;
    direction = new Vector3D(0, -1, 0);
    constructor(color = Color.WHITE, intensity = 1.0, distance = 50.0, angle = Math.PI / 6, // 30 Grad Kegel
    penumbra = 0.5, // 0 = harte Kante, 1 = extrem weich
    decay = 2.0) {
        super("SpotLight");
        this.color = color;
        this.intensity = intensity;
        this.distance = distance;
        this.angle = angle;
        this.penumbra = penumbra;
        this.decay = decay;
    }
}
//# sourceMappingURL=SpotLight.js.map