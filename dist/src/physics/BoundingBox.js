import { BoundingType } from "../interfaces/IBoundingVolume.js";
export class BoundingBox {
    min;
    max;
    type = BoundingType.BOX;
    broadRadius;
    constructor(min, max) {
        this.min = min;
        this.max = max;
        const size = max.clone().sub(min);
        this.broadRadius = size.length() / 2;
    }
    get center() { return this.min.clone().add(this.max).scale(0.5); }
    getBroadRadius() { return this.broadRadius; }
}
//# sourceMappingURL=BoundingBox.js.map