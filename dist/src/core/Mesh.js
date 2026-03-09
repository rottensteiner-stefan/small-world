import { Object3D } from "./Object3D.js";
export class Mesh extends Object3D {
    geometry = null;
    bounds = null;
    // Mesh erfordert jetzt initial ein Material anstatt einer Farbe
    constructor(geometry, material, name = "") {
        super(name);
        if (geometry)
            this.geometry = geometry;
        if (material)
            this.material = material;
    }
}
//# sourceMappingURL=Mesh.js.map