import { Object3D } from "./Object3D.js";
import { Color } from "./Color.js";
export class Mesh extends Object3D {
    geometry = null;
    bounds = null;
    color = Color.WHITE;
    constructor(geometry, color = Color.WHITE, name = "") {
        super(name);
        if (geometry)
            this.geometry = geometry;
        this.color = color;
    }
}
//# sourceMappingURL=Mesh.js.map