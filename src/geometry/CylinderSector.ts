/// src/geometry/CylinderSector.ts

import { Cylinder, CylinderOptions } from "./Cylinder.js";

/**
 * Configuration options for cylinder sector geometry.
 */
export interface CylinderSectorOptions extends CylinderOptions {
  /** The central angle of the sector in radians. Defaults to PI / 2. */
  thetaLength?: number;
}

/**
 * A cylinder sector geometry (pie slice of a cylinder).
 */
export class CylinderSector extends Cylinder {
  /**
   * Creates a new CylinderSector geometry.
   * @param options The configuration options.
   */
  constructor(options: CylinderSectorOptions = {}) {
    const { thetaLength = Math.PI / 2, ...rest } = options;
    super({
      ...rest,
      thetaLength,
    });
  }
}
