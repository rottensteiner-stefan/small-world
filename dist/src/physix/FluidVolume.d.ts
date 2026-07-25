import { BoundingBox } from './BoundingBox.js';
import { Vector3D } from '../math/Vector3D.js';
/**
 * Represents a volume of fluid in the physics simulation.
 * Objects entering this volume will experience buoyancy (upward force) and drag (velocity damping).
 */
export declare class FluidVolume {
    /** The AABB defining the boundaries of the fluid. */
    bounds: BoundingBox;
    /** The density of the fluid. Higher density = more buoyancy. (1.0 = normal water) */
    density: number;
    /** How much the fluid slows down objects moving through it (linear and angular damping). Lower value = more drag. */
    drag: number;
    /** The velocity of the fluid flow, which pushes objects inside it. */
    currentVelocity: Vector3D;
    constructor(bounds: BoundingBox, density?: number, drag?: number, currentVelocity?: Vector3D);
}
