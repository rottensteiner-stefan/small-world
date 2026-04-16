import { Matrix4 } from '../Matrix4.js';
import { AbstractProjection } from './AbstractProjection.js';
import { ProjectionType } from '../../enums/index.js';
/**
 * Configuration options for orthographic projection.
 */
export interface OrthographicOptions {
    /** Left plane distance. Defaults to -1. */
    left?: number;
    /** Right plane distance. Defaults to 1. */
    right?: number;
    /** Bottom plane distance. Defaults to -1. */
    bottom?: number;
    /** Top plane distance. Defaults to 1. */
    top?: number;
    /** Near plane distance. Defaults to 0.1. */
    near?: number;
    /** Far plane distance. Defaults to 1000. */
    far?: number;
}
/**
 * Orthographic camera projection for 2D or isometric views.
 */
export declare class OrthographicProjection extends AbstractProjection {
    /** Left clip plane. */
    left: number;
    /** Right clip plane. */
    right: number;
    /** Bottom clip plane. */
    bottom: number;
    /** Top clip plane. */
    top: number;
    /** Near clip plane. */
    near: number;
    /** Far clip plane. */
    far: number;
    /** @inheritdoc */
    readonly type: ProjectionType;
    /**
     * Creates a new OrthographicProjection.
     * @param options The configuration options.
     */
    constructor(options?: OrthographicOptions);
    /** @inheritdoc */
    update(): void;
    /** @inheritdoc */
    getMatrix(): Matrix4;
}
