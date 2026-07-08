import { Matrix4 } from '../index.js';
import { ProjectionType } from '../../enums/index.js';
/**
 * Base class for all camera projection types.
 */
export declare abstract class AbstractProjection {
    /** The type of the projection. */
    abstract readonly type: ProjectionType;
    /** The projection matrix. */
    protected _matrix: Matrix4;
    /**
     * Returns the calculated projection matrix.
     * @returns The projection matrix.
     */
    abstract getMatrix(): Matrix4;
    /**
     * Updates the projection matrix based on current properties.
     */
    abstract update(): void;
    /**
     * Sets the aspect ratio of the projection.
     * @param value The aspect ratio (width / height).
     */
    abstract setAspect(value: number): void;
    /**
     * Adjusts the zoom/scale of the projection.
     * @param delta The zoom delta.
     */
    abstract zoom(delta: number): void;
}
