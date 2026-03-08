import { BoundingType } from "../interfaces/IBoundingVolume.js";
export class BoundingSphere {
    center;
    radius;
    type = BoundingType.SPHERE;
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
    getBroadRadius() { return this.radius; }
}
//# sourceMappingURL=BoundingSphere.js.map