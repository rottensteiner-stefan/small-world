import { Behavior } from './Behavior.js';
import { Scene, AbstractMaterial } from '../index.js';
import { GeometryDataInterface } from '../../interfaces/index.js';
import { Vector3D } from '../../math/index.js';
export interface TrailRendererOptions {
    scene: Scene;
    geometry: GeometryDataInterface;
    material: AbstractMaterial;
    /** Number of trail segments to pool (default: 20) */
    poolSize?: number;
    /** Interval in seconds between spawning segments (default: 0.05) */
    spawnInterval?: number;
    /** How fast the segments shrink per second (default: 4.0) */
    shrinkRate?: number;
    /** An offset relative to the target's position (default: [0, 0, 0]) */
    offset?: Vector3D;
}
/**
 * A generic behavior that leaves a trail of shrinking 3D objects behind the target.
 * Uses object pooling to avoid garbage collection spikes.
 */
export declare class TrailRendererBehavior extends Behavior {
    private _scene;
    private _spawnInterval;
    private _shrinkRate;
    private _offset;
    private _trailTimer;
    private _trails;
    private _trailIndex;
    constructor(options: TrailRendererOptions);
    update(deltaTime: number): void;
    /**
     * Instantly hides all active trail segments. Useful when teleporting the target.
     */
    clear(): void;
}
