/// src/enums/FogMode.ts

/**
 * Defines the mathematical mode used for calculating fog density.
 */
export enum FogMode {
  /** No fog applied. */
  NONE = 0,
  /** Linear fog increasing between a near and far distance. */
  LINEAR = 1,
  /** Exponential fog simulating physical light scattering. */
  EXP = 2,
  /** Squared exponential fog for a sharper, more dramatic drop-off. */
  EXP2 = 3,
}
