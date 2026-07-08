import { Texture, CubeTexture } from '../../textures/index.js';
import { BlendingMode, CullMode, Topology } from '../../../enums/index.js';
/**
 * The RenderManifest is the "order sheet" that a material
 * passes to the renderer to describe its requirements.
 */
export interface RenderManifest {
    /** The ID of the shader to use. */
    shaderId: string;
    /**
     * The properties (uniforms) for the material.
     * Key: Property name as defined in ShaderDefinition layout.
     */
    properties: Record<string, unknown>;
    /**
     * The textures for the material.
     * Key: Texture name as defined in ShaderDefinition layout.
     */
    textures: Record<string, Texture | CubeTexture | undefined>;
    /**
     * Optional GPU state overrides for this specific draw call.
     */
    state?: {
        culling?: CullMode;
        blending?: BlendingMode;
        depthWrite?: boolean;
        depthTest?: boolean;
        transparent?: boolean;
        /** Whether this object should be treated as a camera-facing sprite (billboarding). */
        isSprite?: boolean;
        /** The primitive topology (e.g., TRIANGLE_LIST or LINE_LIST). Defaults to TRIANGLE_LIST. */
        topology?: Topology;
    };
}
