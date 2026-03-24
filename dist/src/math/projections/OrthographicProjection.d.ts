import { Matrix4 } from '../Matrix4.js';
import { AbstractProjection } from './AbstractProjection.js';
export declare class OrthographicProjection extends AbstractProjection {
    l: number;
    r: number;
    b: number;
    t: number;
    n: number;
    f: number;
    readonly type: "OrthographicProjection";
    constructor(l: number, r: number, b: number, t: number, n: number, f: number);
    update(): void;
    getMatrix(): Matrix4;
}
