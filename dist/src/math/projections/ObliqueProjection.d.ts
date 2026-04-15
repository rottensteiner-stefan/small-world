import { Matrix4 } from '../Matrix4.js';
import { AbstractProjection } from './AbstractProjection.js';
import { ProjectionType } from '../../enums/index.js';
/**
 * Configuration options for oblique projection.
 */
export interface ObliqueOptions {
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
 * Oblique camera projection.
 */
export declare class ObliqueProjection extends AbstractProjection {
    /** Left. */
    left: number;
    /** Right. */
    right: number;
    /** Bottom. */
    bottom: number;
    /** Top. */
    top: number;
    /** Near. */
    near: number;
    /** Far. */
    far: number;
    /** @inheritdoc */
    readonly type: ProjectionType;
    /**
     * Creates a new ObliqueProjection.
     * @param options The configuration options for the projection.
     */
    constructor(options?: ObliqueOptions);
    /** @inheritdoc */
    update(): void;
    /** @inheritdoc */
    getMatrix(): Matrix4;
}
