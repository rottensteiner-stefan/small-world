import { Matrix4 } from '../Matrix4.js';
import { AbstractProjection } from './AbstractProjection.js';
export declare class ObliqueProjection extends AbstractProjection {
    l: number;
    r: number;
    b: number;
    t: number;
    n: number;
    f: number;
    readonly type: "ObliqueProjection";
    constructor(l: number, r: number, b: number, t: number, n: number, f: number);
    update(): void;
    getMatrix(): Matrix4;
}
