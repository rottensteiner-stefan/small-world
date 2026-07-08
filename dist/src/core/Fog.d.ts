import { Color } from './colors/index.js';
import { FogMode } from '../enums/index.js';
export interface FogOptions {
    color?: Color;
    mode?: FogMode;
    density?: number;
    near?: number;
    far?: number;
    height?: number;
    heightFalloff?: number;
}
/**
 * Represents the global fog settings for a scene.
 */
export declare class Fog {
    /** The color of the fog. */
    color: Color;
    /** The mathematical mode of the fog. */
    mode: FogMode;
    /** The density of the fog (used for EXP and EXP2 modes). */
    density: number;
    /** The starting distance of the fog (used for LINEAR mode). */
    near: number;
    /** The ending distance where fog is 100% (used for LINEAR mode). */
    far: number;
    /** The world-space Y coordinate where height fog starts. */
    height: number;
    /** How quickly the fog density drops off above the fog height (0 = off). */
    heightFalloff: number;
    constructor(options?: FogOptions);
}
