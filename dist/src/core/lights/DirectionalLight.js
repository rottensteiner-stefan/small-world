import { Object3D } from "../Object3D.js";
import { Color } from "../colors/Color.js";
import { Vector3D } from "../../math/Vector3D.js";
export class DirectionalLight extends Object3D {
    color;
    intensity = 1.0;
    direction = new Vector3D(0, -1, 0);
    constructor(color = Color.WHITE, intensity = 1.0) {
        super("DirectionalLight");
        this.color = color;
        this.intensity = intensity;
    }
}
//# sourceMappingURL=DirectionalLight.js.map