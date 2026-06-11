import { Vector3D } from './Vector3D.js';
/**
 * Standard parameters for gear generation based on the Module system.
 */
export interface GearParameters {
    /** The module of the gear. */
    module: number;
    /** The number of teeth. */
    teeth: number;
    /** The calculated inner radius (root radius) for the Gear geometry. */
    innerRadius: number;
    /** The calculated tooth height for the Gear geometry. */
    toothHeight: number;
    /** The pitch radius (Teilkreisradius). Useful for placement. */
    pitchRadius: number;
    /** The outer radius (Kopfkreisradius). */
    outerRadius: number;
}
/**
 * Utility class for mechanical gear calculations based on DIN 780 (Module system).
 * Ensures gears perfectly mesh with each other.
 */
export declare class GearMath {
    /**
     * Calculates all necessary physical parameters for a gear.
     * @param module The module (size of the teeth). Must be the same for all meshing gears.
     * @param teeth The number of teeth on the gear.
     * @returns GearParameters object containing values to feed into the Gear geometry.
     */
    static getGearParams(module: number, teeth: number): GearParameters;
    /**
     * Calculates the exact distance required between the centers of two meshing gears.
     * @param module The module of both gears.
     * @param teeth1 Number of teeth of the first gear.
     * @param teeth2 Number of teeth of the second gear.
     * @returns The exact distance between their centers.
     */
    static getCenterDistance(module: number, teeth1: number, teeth2: number): number;
    /**
     * Calculates the relative rotation speed (gear ratio) for a driven gear.
     * @param speed1 The rotation speed of the driving gear.
     * @param teeth1 The number of teeth of the driving gear.
     * @param teeth2 The number of teeth of the driven gear.
     * @param internal Set to true if gear2 is an internal ring gear (rotation direction stays the same).
     * @returns The rotation speed of the driven gear.
     */
    static getDrivenSpeed(speed1: number, teeth1: number, teeth2: number, internal?: boolean): number;
    /**
     * Calculates the exact Z-rotation required for gear2 to perfectly interlock with gear1.
     * Assumes both gears lie on the same XY plane and rotate around the Z axis.
     *
     * @param pos1 The position of the first gear.
     * @param rotZ1 The current Z-rotation of the first gear (in radians).
     * @param params1 The parameters of the first gear.
     * @param pos2 The position of the second gear.
     * @param params2 The parameters of the second gear.
     * @returns The required Z-rotation for gear2 (in radians).
     */
    static getMeshingRotation(pos1: Vector3D, rotZ1: number, params1: GearParameters, pos2: Vector3D, params2: GearParameters): number;
}
