import { Particle } from "./Particle.js";

/**
 * Interface for any modifier or force field that affects particles each tick.
 */
export interface ParticleAffector {
  /**
   * Applies the affector's forces or mutations to an individual particle or the full list.
   * @param particle The particle being updated.
   * @param dt Delta time in seconds.
   * @param index Index of the particle in the active particle list.
   * @param total Total number of active particles.
   */
  apply(particle: Particle, dt: number, index: number, total: number): void;
}
