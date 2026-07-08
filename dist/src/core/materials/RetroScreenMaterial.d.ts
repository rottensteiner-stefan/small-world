import { AbstractMaterial } from './AbstractMaterial.js';
import { Texture } from '../textures/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
/**
 * Modes supported by RetroScreenMaterial.
 */
export type RetroScreenMode = "tv50s" | "film19th";
/**
 * Configuration options for RetroScreenMaterial.
 */
export interface RetroScreenMaterialOptions {
    /** The diffuse texture containing screen contents. */
    diffuseMap?: Texture | undefined;
    /** Active retro screen mode. Defaults to "tv50s". */
    mode?: RetroScreenMode | undefined;
    /** Overall intensity of the retro effects (0.0 to 1.0). Defaults to 1.0. */
    intensity?: number | undefined;
    /** Custom speed multiplier for animations. Defaults to 1.0. */
    speed?: number | undefined;
    /** TV: snow density, Film: scratch count scale. */
    param1?: number | undefined;
    /** TV: scanline count/scale, Film: flicker speed multiplier. */
    param2?: number | undefined;
    /** TV: tearing freq/strength, Film: dirt density. */
    param3?: number | undefined;
    /** TV: roll speed multiplier, Film: sepia strength multiplier. */
    param4?: number | undefined;
}
/**
 * A highly specialized material for rendering retro screen effects (50s TV & 19th Century Film) locally on a mesh.
 */
export declare class RetroScreenMaterial extends AbstractMaterial {
    /** The screen's content texture. */
    diffuseMap: Texture | undefined;
    /** Retro mode. */
    mode: RetroScreenMode;
    /** Effect intensity. */
    intensity: number;
    /** Animation speed multiplier. */
    speed: number;
    /** Time parameter updated per frame. */
    time: number;
    param1: number;
    param2: number;
    param3: number;
    param4: number;
    /**
     * Creates a new RetroScreenMaterial.
     * @param options Configuration options.
     */
    constructor(options?: RetroScreenMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
