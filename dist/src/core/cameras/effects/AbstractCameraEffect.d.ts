import { CameraEffect } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/index.js';
/**
 * Base class for camera effects.
 */
export declare abstract class AbstractCameraEffect implements CameraEffect {
    /** @inheritdoc */
    abstract readonly type: string;
    /** @inheritdoc */
    isFinished: boolean;
    /** @inheritdoc */
    readonly offset: Vector3D;
    /** @inheritdoc */
    readonly targetOffset: Vector3D;
    /**
     * Updates the effect state.
     * @param deltaTime Time elapsed since the last frame in seconds.
     */
    abstract update(deltaTime: number): void;
}
