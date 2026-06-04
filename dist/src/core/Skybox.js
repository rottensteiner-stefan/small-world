/// src/core/Skybox.ts
import { Cube } from "../geometry/Cube.js";
import { CubeTexture } from "./textures/index.js";
import { Object3D } from "./Object3D.js";
import { SkyboxMaterial } from "./materials/index.js";
/**
 * A skybox that surrounds the scene.
 */
export class Skybox extends Object3D {
    constructor(options) {
        const { name = "Skybox", size = 1000, source } = options;
        super(name);
        this.geometry = new Cube({ size }).getGeometryData();
        let cubeMap;
        if (Array.isArray(source)) {
            cubeMap = new CubeTexture(source);
        }
        else {
            cubeMap = source;
        }
        this.material = new SkyboxMaterial({ cubeMap });
        this.frustumCulled = false;
    }
}
//# sourceMappingURL=Skybox.js.map