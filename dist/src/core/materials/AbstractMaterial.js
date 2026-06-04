/// src/core/materials/AbstractMaterial.ts
import { Color } from "../colors/index.js";
import { CullMode } from "../../enums/index.js";
import { ShaderRegistry } from "../renderers/shaders/ShaderRegistry.js";
import { MathUtils } from "../../math/index.js";
/**
 * Base class for all material types.
 */
export class AbstractMaterial {
    type;
    /** The unique identifier of the material. */
    uuid = MathUtils.generateUUID();
    /** The base color of the material. */
    color = Color.WHITE;
    /** The culling mode for this material. Defaults to BACK. */
    cullMode = CullMode.BACK;
    /** Whether the material writes to the depth buffer. Defaults to true. */
    depthWrite = true;
    /** Whether the material performs depth testing. Defaults to true. */
    depthTest = true;
    /** Whether the material is transparent. Defaults to false. */
    transparent = false;
    /** Cached render manifest to avoid frequent allocations. */
    _renderManifest = undefined;
    /**
     * Creates a new material and automatically registers it with the ShaderRegistry.
     * @param type The type of the material.
     */
    constructor(type) {
        this.type = type;
        // Self-registration: The moment a material is instantiated,
        // the engine knows how to handle its shader.
        ShaderRegistry.instance.registerProvider(this.type, this);
    }
}
//# sourceMappingURL=AbstractMaterial.js.map