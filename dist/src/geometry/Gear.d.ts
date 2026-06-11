import { ExtrudeGeometry } from './ExtrudeGeometry.js';
/**
 * Options for a Gear geometry.
 */
export interface GearOptions {
    /** The number of teeth. Defaults to 10. */
    teeth?: number;
    /** The inner radius of the gear. Defaults to 1.0. */
    innerRadius?: number;
    /** The height of the teeth. Defaults to 0.5. */
    toothHeight?: number;
    /** The radius of the inner hole. Defaults to innerRadius / 4. */
    holeRadius?: number;
    /** The ratio between the outer top edge and inner base edge. Defaults to 0.5. */
    vRatio?: number;
    /** The thickness of the gear. Defaults to 0.5. */
    thickness?: number;
}
/**
 * Procedural Gear Geometry based on isosceles trapezoidal teeth.
 */
export declare class Gear extends ExtrudeGeometry {
    readonly teeth: number;
    readonly innerRadius: number;
    readonly toothHeight: number;
    readonly holeRadius: number;
    readonly vRatio: number;
    constructor(options?: GearOptions);
    /**
     * Generates the 2D contour of the gear and its inner hole.
     */
    private static _generateShapes;
}
