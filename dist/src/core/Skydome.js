/// src/core/Skydome.ts
import { Object3D } from "./Object3D.js";
import { Sphere } from "../geometry/Sphere.js";
import { BasicMaterial } from "./materials/index.js";
/**
 * A skydome that surrounds the scene using a spherical geometry.
 */
export class Skydome extends Object3D {
    /**
     * Creates a new Skydome.
     * @param options The configuration options for the skydome.
     */
    constructor(options) {
        const { heightSegments = 32, name = "Skydome", radius = 100, texture, widthSegments = 32, } = options;
        super(name);
        const sphereOptions = { heightSegments, radius, widthSegments };
        const geomData = new Sphere(sphereOptions).getGeometryData();
        // Invert the winding order of the indices to make the sphere visible from the inside.
        // This is a cleaner approach than flipping the scale of the object.
        const indices = geomData.indices;
        if (indices) {
            for (let i = 0; i < indices.length; i += 3) {
                const i1 = indices[i];
                const i2 = indices[i + 1];
                if (i1 !== undefined && i2 !== undefined) {
                    indices[i] = i2;
                    indices[i + 1] = i1;
                }
            }
        }
        this.geometry = geomData;
        this.frustumCulled = false;
        const materialOptions = {
            diffuseMap: texture,
        };
        this.material = new BasicMaterial(materialOptions);
    }
}
//# sourceMappingURL=Skydome.js.map