import { Object3D } from "../Object3D.js";
export class AbstractLight extends Object3D {
    color;
    intensity;
    constructor(color, intensity, name = "Light") {
        super(name);
        this.color = color;
        this.intensity = intensity;
    }
}
//# sourceMappingURL=AbstractLight.js.map