/// src/core/FluidParticleSystem.ts

import { Object3D } from "./Object3D.js";
import { Vector3D } from "../math/index.js";

/**
 * Configuration for the fluid particle system.
 */
export interface FluidConfig {
  /** Number of particles in the system. */
  particleCount: number;
  /** Radius of each particle (smoothing length). */
  radius: number;
  /** Viscosity of the fluid. */
  viscosity: number;
  /** Surface tension of the fluid. */
  surfaceTension: number;
  /** Rest density of the fluid. */
  restDensity: number;
  /** Gravity applied to the fluid. */
  gravity: Vector3D;
  /** Minimum boundary for the fluid particles. */
  boundaryMin: Vector3D;
  /** Maximum boundary for the fluid particles. */
  boundaryMax: Vector3D;
}

/**
 * Represents a system of fluid particles.
 * This class holds the particle data and is managed by the FluidManager.
 */
export class FluidParticleSystem extends Object3D {
  public config: FluidConfig;
  
  /** GPU Buffer for particle positions (Storage Buffer for WebGPU, Texture for WebGL). */
  public positionBuffer: any;
  /** GPU Buffer for particle velocities. */
  public velocityBuffer: any;
  /** GPU Buffer for predicted positions. */
  public predictedPositionBuffer: any;
  /** GPU Buffer for lambdas. */
  public lambdaBuffer: any;
  /** GPU Buffer for position deltas. */
  public deltaPositionBuffer: any;
  /** GPU Buffer for grid indices. */
  public gridIndexBuffer: any;
  /** GPU Buffer for sorted indices. */
  public sortedIndexBuffer: any;
  /** GPU Buffer for particle densities/pressures. */
  public dataBuffer: any;

  /**
   * Creates a new FluidParticleSystem.
   * @param config The configuration for the fluid.
   */
  constructor(config: Partial<FluidConfig> = {}) {
    super("FluidParticleSystem");
    
    this.config = {
      particleCount: 10000,
      radius: 0.2,
      viscosity: 0.01,
      surfaceTension: 0.01,
      restDensity: 1000,
      gravity: new Vector3D(0, -9.81, 0),
      boundaryMin: new Vector3D(-10, 0, -10),
      boundaryMax: new Vector3D(10, 20, 10),
      ...config
    };
    
    // Frustum culling for fluid systems can be complex since particles move.
    // For now, we might disable it or use a large bounding box.
    this.frustumCulled = false;
  }
}
