import { Cylinder, CylinderOptions } from './Cylinder.js';
/**
 * Configuration options for cone geometry.
 */
export interface ConeOptions extends Omit<CylinderOptions, "radiusTop" | "radiusBottom"> {
    /** The radius of the base of the cone. Defaults to 1. */
    radius?: number;
}
/**
 * A cone geometry.
 * Specialized case of a cylinder where the top radius is zero.
 */
export declare class Cone extends Cylinder {
    /**
     * Creates a new Cone geometry.
     * @param options The configuration options.
     */
    constructor(options?: ConeOptions);
}
