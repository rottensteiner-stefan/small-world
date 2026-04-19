import { Vector3D } from '../math/index.js';
import { Color } from '../core/index.js';
/**
 * Helper to manage WebGL2 Uniform Buffer Objects (UBOs) with std140 layout.
 */
export declare class WebGL2UniformBuffer {
    private _gl;
    private _buffer;
    private _data;
    private _bindingPoint;
    constructor(gl: WebGL2RenderingContext, sizeInBytes: number, bindingPoint: number);
    setMatrix(offset: number, matrix: Float32Array): void;
    setVector3(offset: number, vec: Vector3D): void;
    setColor(offset: number, col: Color): void;
    setFloat(offset: number, val: number): void;
    setInt(offset: number, val: number): void;
    update(): void;
    bindToProgram(program: WebGLProgram, blockName: string): void;
}
