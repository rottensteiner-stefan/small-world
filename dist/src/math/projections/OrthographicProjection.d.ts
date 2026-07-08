import { AbstractProjection } from './AbstractProjection.js';
import { Matrix4 } from '../index.js';
import { ProjectionType } from '../../enums/index.js';
import { ProjectionOptions } from '../../interfaces/index.js';
/**
 * Configuration options for orthographic projection.
 */
export interface OrthographicOptions {
    left?: number;
    right?: number;
    bottom?: number;
    top?: number;
    near?: number;
    far?: number;
}
/**
 * Modern Orthographic projection implementation.
 */
export declare class OrthographicProjection extends AbstractProjection {
    left: number;
    right: number;
    bottom: number;
    top: number;
    near: number;
    far: number;
    readonly type: ProjectionType;
    /**
     * Creates an OrthographicProjection from engine config options.
     * @param options The projection options from EngineOptions.
     * @param initialAspect The initial aspect ratio.
     */
    static fromConfig(options: ProjectionOptions | undefined, initialAspect: number): OrthographicProjection;
    constructor(options?: OrthographicOptions);
    update(): void;
    /**
     * Adjusts the left/right bounds to match a specific aspect ratio while keeping top/bottom fixed.
     * @param aspect The target aspect ratio (width / height).
     */
    setAspect(aspect: number): void;
    zoom(delta: number): void;
    getMatrix(): Matrix4;
}
