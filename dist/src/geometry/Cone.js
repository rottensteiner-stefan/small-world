/// src/geometry/Cone.ts
import { Cylinder } from "./Cylinder.js";
/**
 * A cone geometry.
 * Specialized case of a cylinder where the top radius is zero.
 */
export class Cone extends Cylinder {
    /**
     * Creates a new Cone geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        const { radius = 1, ...rest } = options;
        super({
            ...rest,
            radiusTop: 0,
            radiusBottom: radius,
        });
    }
}
//# sourceMappingURL=Cone.js.map