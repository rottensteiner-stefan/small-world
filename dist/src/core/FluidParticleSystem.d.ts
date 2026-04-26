import { Object3D } from './Object3D.js';
import { Vector3D } from '../math/index.js';
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
export declare class FluidParticleSystem extends Object3D {
    config: FluidConfig;
    /** GPU Buffer for particle positions (Storage Buffer for WebGPU, Texture for WebGL). */
    positionBuffer: any;
    /** GPU Buffer for particle velocities. */
    velocityBuffer: any;
    /** GPU Buffer for predicted positions. */
    predictedPositionBuffer: any;
    /** GPU Buffer for lambdas. */
    lambdaBuffer: any;
    /** GPU Buffer for position deltas. */
    deltaPositionBuffer: any;
    /** GPU Buffer for grid indices. */
    gridIndexBuffer: any;
    /** GPU Buffer for sorted indices. */
    sortedIndexBuffer: any;
    /** GPU Buffer for particle densities/pressures. */
    dataBuffer: any;
    /**
     * Creates a new FluidParticleSystem.
     * @param config The configuration for the fluid.
     */
    constructor(config?: Partial<FluidConfig>);
}
