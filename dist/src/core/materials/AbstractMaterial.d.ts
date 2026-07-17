import { Color } from '../colors/index.js';
import { MaterialType, CullMode } from '../../enums/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
import { ShaderProvider } from '../../interfaces/index.js';
/**
 * Base class for all material types.
 */
export declare abstract class AbstractMaterial implements ShaderProvider {
    readonly type: MaterialType | string;
    /** The unique identifier of the material. */
    uuid: string;
    /** The base color of the material. */
    color: Color;
    /** The culling mode for this material. Defaults to BACK. */
    cullMode: CullMode;
    /** Whether the material writes to the depth buffer. Defaults to true. */
    depthWrite: boolean;
    /** Whether the material performs depth testing. Defaults to true. */
    depthTest: boolean;
    /** Whether the material is transparent. Defaults to false. */
    transparent: boolean;
    /** Cached render manifest to avoid frequent allocations. */
    protected _renderManifest: RenderManifest | undefined;
    /**
     * Creates a new material and automatically registers it with the ShaderRegistry.
     * @param type The type of the material.
     */
    protected constructor(type: MaterialType | string);
    /**
     * Returns a manifest describing the requirements for rendering this material.
  ...
     * @returns The render manifest.
     */
    abstract getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    abstract getShaderDefinition(): ShaderDefinition;
}
