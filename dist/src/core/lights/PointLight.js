/// src/core/lights/PointLight.ts
import { AbstractLight } from "./AbstractLight.js";
import { LightType } from "../../enums/index.js";
/**
 * Point light that emits light in all directions from a single point.
 */
export class PointLight extends AbstractLight {
    /** @inheritdoc */
    type = LightType.POINT;
    /** The maximum distance of the light. */
    distance;
    /** The decay factor of the light. */
    decay;
    /**
     * Creates a new PointLight.
     * @param options The configuration options for the light.
     */
    constructor(options = {}) {
        const { distance = 50.0, decay = 2.0, name = "PointLight" } = options;
        super({ ...options, name });
        this.distance = distance;
        this.decay = decay;
    }
    /** @inheritdoc */
    applyTo(data) {
        if (4 > data.pLights.length) {
            data.pLights.push(this);
        }
    }
}
//# sourceMappingURL=PointLight.js.map