import { Object3D } from "./Object3D.js";
import { Cube } from "../geometry/Cube.js";
import { SkyboxMaterial } from "./materials/SkyboxMaterial.js";
import { CubeTexture } from "./textures/CubeTexture.js";
export class Skybox extends Object3D {
    constructor(source, size = 100) {
        super("Skybox");
        this.geometry = new Cube(size).getGeometryData();
        // WICHTIG: Explizit als SkyboxMaterial instanziieren
        const mat = new SkyboxMaterial();
        if (Array.isArray(source)) {
            mat.cubeMap = new CubeTexture(source);
        }
        else {
            mat.cubeMap = source;
        }
        this.material = mat;
        this.frustumCulled = false;
    }
}
//# sourceMappingURL=Skybox.js.map