import { Object3D } from "./Object3D.js";
import { Cube } from "../geometry/Cube.js";
import { SkyboxMaterial } from "./materials/SkyboxMaterial.js";
import { CubeTexture } from "./textures/CubeTexture.js";
export class Skybox extends Object3D {
    // Akzeptiert nun ein Array aus Strings ODER eine fertige CubeTexture
    constructor(source, size = 100) {
        super("Skybox");
        this.geometry = new Cube(size).getGeometryData();
        const mat = new SkyboxMaterial();
        if (Array.isArray(source)) {
            mat.cubeMap = new CubeTexture(source);
        }
        else {
            mat.cubeMap = source; // Fertige Textur aus dem Loader übernehmen
        }
        this.material = mat;
        this.frustumCulled = false;
    }
}
//# sourceMappingURL=Skybox.js.map