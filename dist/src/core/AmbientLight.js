import { Object3D } from "./Object3D.js";
import { Color } from "./Color.js";
export class AmbientLight extends Object3D {
    color;
    intensity;
    constructor(color = new Color(1, 1, 1), intensity = 0.2) {
        super("AmbientLight");
        this.color = color;
        this.intensity = intensity;
    }
}
//# sourceMappingURL=AmbientLight.js.map