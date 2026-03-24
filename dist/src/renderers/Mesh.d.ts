import { IGeometryData } from '../interfaces/index.js';
export declare class Mesh {
    private gl;
    vbo: WebGLBuffer | null;
    ebo: WebGLBuffer | null;
    nbo: WebGLBuffer | null;
    tbo: WebGLBuffer | null;
    count: number;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, data: IGeometryData);
    bind(posLoc: number, normLoc?: number, uvLoc?: number): void;
}
