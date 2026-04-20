import { Matrix4 } from '../Matrix4.js';
import { AbstractProjection } from './AbstractProjection.js';
import { ProjectionType } from '../../enums/index.js';
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
    constructor(options?: OrthographicOptions);
    update(): void;
    /**
     * Adjusts the left/right bounds to match a specific aspect ratio while keeping top/bottom fixed.
     * @param aspect The target aspect ratio (width / height).
     */
    setAspect(aspect: number): void;
    getMatrix(): Matrix4;
}
