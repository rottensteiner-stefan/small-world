/// src/core/lights/AbstractLight.ts
import { Color } from "../colors/Color.js";
import { Object3D } from "../Object3D.js";
/**
 * Base class for all light types.
 */
export class AbstractLight extends Object3D {
    /** The color of the light. */
    color;
    /** The intensity of the light. */
    intensity;
    /** Whether the light casts shadows. */
    castShadow;
    /** The resolution of the shadow map for this light. */
    shadowResolution;
    /** A small offset to prevent shadow acne. */
    shadowBias;
    /** An offset along the surface normal to prevent shadow acne. */
    shadowNormalBias;
    /** The camera used to render the shadow map for this light. */
    shadowCamera;
    /**
     * Creates a new AbstractLight.
     * @param options The configuration options for the light.
     */
    constructor(options = {}) {
        const { color = Color.WHITE, intensity = 1.0, name = "Light", castShadow = false, shadowResolution = 512, shadowBias = 0.005, shadowNormalBias = 0.0, } = options;
        super(name);
        this.color = color;
        this.intensity = intensity;
        this.castShadow = castShadow;
        this.shadowResolution = shadowResolution;
        this.shadowBias = shadowBias;
        this.shadowNormalBias = shadowNormalBias;
        this.shadowCamera = undefined;
    }
}
//# sourceMappingURL=AbstractLight.js.map