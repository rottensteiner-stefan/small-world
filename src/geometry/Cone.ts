/// src/geometry/Cone.ts

import { Cylinder, CylinderOptions } from "./Cylinder.js";

/**
 * Configuration options for cone geometry.
 */
export interface ConeOptions extends Omit<CylinderOptions, "radiusTop" | "radiusBottom"> {
  /** The radius of the base of the cone. Defaults to 1. */
  radius?: number;
}

/**
 * A cone geometry. A specialized case of a cylinder with radiusTop set to 0.
 */
export class Cone extends Cylinder {
  /**
   * Creates a new Cone geometry.
   * @param options The configuration options.
   */
  constructor(options: ConeOptions = {}) {
    const { radius = 1, ...rest } = options;
    super({
      ...rest,
      radiusTop: 0,
      radiusBottom: radius,
    });
  }
}
