import { GeometryDataInterface } from '../interfaces/index.js';
export declare class Mesh {
    private _gl;
    vbo: WebGLBuffer | null;
    ebo: WebGLBuffer | null;
    nbo: WebGLBuffer | null;
    count: number;
    constructor(_gl: WebGLRenderingContext | WebGL2RenderingContext, data: GeometryDataInterface);
    bind(posLoc: number, normLoc?: number): void;
}
