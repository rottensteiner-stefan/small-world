/// src/core/lights/SpotLight.ts
import { LightType } from "../../enums/index.js";
import { AbstractLight } from "./AbstractLight.js";
import { Vector3D } from "../../math/Vector3D.js";
/**
 * Spotlight that emits light in a cone shape.
 */
export class SpotLight extends AbstractLight {
    /** @inheritdoc */
    type = LightType.SPOT;
    /** The direction of the light. */
    direction;
    /** The maximum distance of the light. */
    distance;
    /** The angle of the light cone in radians. */
    angle;
    /** The penumbra factor (0-1). */
    penumbra;
    /** The decay factor of the light. */
    decay;
    /**
     * Creates a new SpotLight.
     * @param options The configuration options for the light.
     */
    constructor(options = {}) {
        const { direction = new Vector3D(0, -1, 0).normalize(), distance = 50.0, angle = Math.PI / 6, penumbra = 0.5, decay = 2.0, name = "SpotLight", } = options;
        super({ ...options, name });
        this.direction = direction;
        this.distance = distance;
        this.angle = angle;
        this.penumbra = penumbra;
        this.decay = decay;
    }
    /** @inheritdoc */
    applyTo(data) {
        if (4 > data.sLights.length) {
            data.sLights.push(this);
        }
    }
}
//# sourceMappingURL=SpotLight.js.map