/// src/geometry/CylinderSector.ts
import { Cylinder } from "./Cylinder.js";
import { MathUtils } from "../math/index.js";
/**
 * A cylinder sector geometry (pie slice of a cylinder).
 */
export class CylinderSector extends Cylinder {
    /**
     * Creates a new CylinderSector geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        const { thetaLength = MathUtils.TWO_PI, ...rest } = options;
        super({
            ...rest,
            thetaLength,
        });
    }
}
//# sourceMappingURL=CylinderSector.js.map