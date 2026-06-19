/// src/core/lights/AreaLight.ts
import { AbstractLight } from "./AbstractLight.js";
import { LightType } from "../../enums/index.js";
/**
 * Area light that emits light from a rectangular plane.
 */
export class AreaLight extends AbstractLight {
    /** @inheritdoc */
    type = LightType.AREA;
    /** The width of the light area. */
    width;
    /** The height/length of the light area. */
    height;
    /**
     * Creates a new AreaLight.
     * @param options The configuration options for the light.
     */
    constructor(options = {}) {
        const { width = 5.0, height = 5.0, name = "AreaLight" } = options;
        super({ ...options, name });
        this.width = width;
        this.height = height;
    }
    /** @inheritdoc */
    applyTo(data) {
        if (4 > data.aLights.length) {
            data.aLights.push(this);
        }
    }
}
//# sourceMappingURL=AreaLight.js.map