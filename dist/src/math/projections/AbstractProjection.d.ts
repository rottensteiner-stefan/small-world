import { Matrix4 } from '../Matrix4.js';
import { ProjectionType } from '../../enums/index.js';
/**
 * Base class for all camera projections.
 */
export declare abstract class AbstractProjection {
    /**
     * The type of the projection.
     */
    abstract readonly type: ProjectionType;
    /**
     * The projection matrix.
     */
    protected _matrix: Matrix4;
    /**
     * Returns the projection matrix.
     * @returns The projection matrix.
     */
    abstract getMatrix(): Matrix4;
    /**
     * Updates the projection matrix.
     */
    abstract update(): void;
}
