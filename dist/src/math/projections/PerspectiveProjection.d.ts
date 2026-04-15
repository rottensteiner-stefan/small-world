import { Matrix4 } from '../Matrix4.js';
import { AbstractProjection } from './AbstractProjection.js';
import { ProjectionType } from '../../enums/index.js';
/**
 * Configuration options for perspective projection.
 */
export interface PerspectiveOptions {
    /** Field of view in radians. Defaults to 75 degrees in radians. */
    fov?: number;
    /** Aspect ratio. Defaults to 1. */
    aspect?: number;
    /** Near plane distance. Defaults to 0.1. */
    near?: number;
    /** Far plane distance. Defaults to 1000. */
    far?: number;
}
/**
 * Perspective camera projection.
 */
export declare class PerspectiveProjection extends AbstractProjection {
    /** Field of view in radians. */
    fov: number;
    /** Aspect ratio. */
    aspect: number;
    /** Near plane. */
    near: number;
    /** Far plane. */
    far: number;
    /** @inheritdoc */
    readonly type: ProjectionType;
    /**
     * Creates a new PerspectiveProjection.
     * @param options The configuration options for the projection.
     */
    constructor(options?: PerspectiveOptions);
    /** @inheritdoc */
    update(): void;
    /** @inheritdoc */
    getMatrix(): Matrix4;
}
