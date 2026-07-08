import { AbstractProjection } from './AbstractProjection.js';
import { Matrix4 } from '../index.js';
import { ProjectionType } from '../../enums/index.js';
import { ProjectionOptions } from '../../interfaces/index.js';
/**
 * Configuration options for perspective projection.
 */
export interface PerspectiveOptions {
    /** Field of view in radians. Defaults to 75 degrees. */
    fov?: number;
    /** Aspect ratio (width / height). Defaults to 1. */
    aspect?: number;
    /** Near plane distance. Defaults to 0.1. */
    near?: number;
    /** Far plane distance. Defaults to 1000. */
    far?: number;
}
/**
 * Perspective camera projection for 3D views.
 */
export declare class PerspectiveProjection extends AbstractProjection {
    /** Field of view in radians. */
    fov: number;
    /** Aspect ratio (width / height). */
    aspect: number;
    /** Near clip plane. */
    near: number;
    /** Far clip plane. */
    far: number;
    /** @inheritdoc */
    readonly type: ProjectionType;
    /**
     * Creates a new PerspectiveProjection.
     * @param options The configuration options.
     */
    constructor(options?: PerspectiveOptions);
    /**
     * Creates a PerspectiveProjection from engine config options.
     * @param options The projection options from EngineOptions.
     * @param initialAspect The initial aspect ratio.
     */
    static fromConfig(options: ProjectionOptions | undefined, initialAspect: number): PerspectiveProjection;
    /** @inheritdoc */
    update(): void;
    setAspect(value: number): void;
    zoom(delta: number): void;
    /** @inheritdoc */
    getMatrix(): Matrix4;
}
