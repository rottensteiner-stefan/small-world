/// src/core/lights/DirectionalLight.ts
import { AbstractLight } from "./AbstractLight.js";
import { LightType } from "../../enums/LightType.js";
import { Vector3D } from "../../math/Vector3D.js";
/**
 * Directional light that emits light in a specific direction.
 */
export class DirectionalLight extends AbstractLight {
    /** @inheritdoc */
    type = LightType.DIRECTIONAL;
    /** The direction of the light. */
    direction;
    /**
     * Creates a new DirectionalLight.
     * @param options The configuration options for the light.
     */
    constructor(options = {}) {
        const { direction = new Vector3D(0, -1, 0).normalize(), name = "DirectionalLight" } = options;
        super({ ...options, name });
        this.direction = direction;
    }
    /** @inheritdoc */
    applyTo(data) {
        data.dDir.set(this.direction.x, this.direction.y, this.direction.z);
        data.dDir.scale(-1).normalize();
        data.dCol.copyFrom(this.color);
        data.dIntensity = this.intensity;
    }
}
//# sourceMappingURL=DirectionalLight.js.map