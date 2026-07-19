import { AbstractProjection } from './AbstractProjection.js';
import { Matrix4 } from '../index.js';
import { ProjectionType } from '../../enums/index.js';
import { ProjectionOptions } from '../../interfaces/index.js';
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
    /** Angle (radians) of the receding depth axis in screen space. Defaults to 45deg. */
    shearAngle?: number;
    /** Scale factor applied to the depth-axis shear (0 = orthographic, 1 = cavalier, 0.5 = cabinet). Defaults to 0.5 (cabinet). */
    shearScale?: number;
}
/**
 * Oblique camera projection for specialized 2.5D views.
 */
export declare class ObliqueProjection extends AbstractProjection {
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
    /** Angle (radians) of the receding depth axis in screen space. */
    shearAngle: number;
    /** Scale factor applied to the depth-axis shear. */
    shearScale: number;
    /** @inheritdoc */
    readonly type: ProjectionType;
    /** Scratch matrix holding the depth-axis shear, combined with the orthographic matrix in {@link update}. */
    private _shearMatrix;
    /**
     * Creates an ObliqueProjection from engine config options.
     * @param options The projection options from EngineOptions.
     * @param initialAspect The initial aspect ratio.
     */
    static fromConfig(options: ProjectionOptions | undefined, initialAspect: number): ObliqueProjection;
    /**
     * Creates a new ObliqueProjection.
     * @param options The configuration options.
     */
    constructor(options?: ObliqueOptions);
    /** @inheritdoc */
    update(): void;
    setAspect(aspect: number): void;
    zoom(delta: number): void;
    /** @inheritdoc */
    getMatrix(): Matrix4;
}
