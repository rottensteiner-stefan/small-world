import { Color } from '../colors/index.js';
import { MaterialType } from '../../enums/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
/**
 * Base class for all material types.
 */
export declare abstract class AbstractMaterial {
    /** The type of the material. */
    abstract readonly type: MaterialType;
    /** The unique identifier of the material. */
    uuid: string;
    /** The base color of the material. */
    color: Color;
    /** Cached render manifest to avoid frequent allocations. */
    protected _renderManifest: RenderManifest | undefined;
    /**
     * Returns a manifest describing the requirements for rendering this material.
     * @returns The render manifest.
     */
    abstract getRenderManifest(): RenderManifest;
}
