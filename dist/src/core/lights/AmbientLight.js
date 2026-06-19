/// src/core/lights/AmbientLight.ts
import { AbstractLight } from "./AbstractLight.js";
import { LightType } from "../../enums/index.js";
/**
 * Ambient light that illuminates all objects in the scene equally.
 */
export class AmbientLight extends AbstractLight {
    /** @inheritdoc */
    type = LightType.AMBIENT;
    /**
     * Creates a new AmbientLight.
     * @param options The configuration options for the light.
     */
    constructor(options = {}) {
        const { name = "AmbientLight" } = options;
        super({ ...options, name });
    }
    /** @inheritdoc */
    applyTo(data) {
        data.aCol.copyFrom(this.color);
        data.aIntensity = this.intensity;
    }
}
//# sourceMappingURL=AmbientLight.js.map