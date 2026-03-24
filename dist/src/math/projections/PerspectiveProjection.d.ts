import { Matrix4 } from '../Matrix4.js';
import { AbstractProjection } from './AbstractProjection.js';
export declare class PerspectiveProjection extends AbstractProjection {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    readonly type: "PerspectiveProjection";
    constructor(fov: number, aspect: number, near: number, far: number);
    update(): void;
    getMatrix(): Matrix4;
}
