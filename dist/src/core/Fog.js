/// src/core/Fog.ts
import { Color } from "./colors/Color.js";
import { FogMode } from "../enums/FogMode.js";
/**
 * Represents the global fog settings for a scene.
 */
export class Fog {
    /** The color of the fog. */
    color;
    /** The mathematical mode of the fog. */
    mode;
    /** The density of the fog (used for EXP and EXP2 modes). */
    density;
    /** The starting distance of the fog (used for LINEAR mode). */
    near;
    /** The ending distance where fog is 100% (used for LINEAR mode). */
    far;
    /** The world-space Y coordinate where height fog starts. */
    height;
    /** How quickly the fog density drops off above the fog height (0 = off). */
    heightFalloff;
    constructor(options = {}) {
        this.color = options.color ?? new Color(0.5, 0.5, 0.5);
        this.mode = options.mode ?? FogMode.EXP2;
        this.density = options.density ?? 0.05;
        this.near = options.near ?? 1.0;
        this.far = options.far ?? 100.0;
        this.height = options.height ?? 0.0;
        this.heightFalloff = options.heightFalloff ?? 0.0;
    }
}
//# sourceMappingURL=Fog.js.map