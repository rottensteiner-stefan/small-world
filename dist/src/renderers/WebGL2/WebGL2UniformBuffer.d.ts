import { Vector3D } from '../../math/index.js';
/**
 * Wrapper for a WebGL2 Uniform Buffer Object (UBO).
 */
export declare class WebGL2UniformBuffer {
    private _gl;
    private _buffer;
    private _data;
    private _int32Data;
    private _bindingPoint;
    /**
     * Creates a new Uniform Buffer Object.
     * @param gl The WebGL2 context.
     * @param size The size of the buffer in bytes.
     * @param bindingPoint The binding point to use (e.g., 0).
     */
    constructor(gl: WebGL2RenderingContext, size: number, bindingPoint: number);
    /**
     * Sets a float value in the buffer.
     * @param offset The byte offset.
     * @param value The float value.
     */
    setFloat(offset: number, value: number): void;
    /**
     * Sets an int value in the buffer.
     * @param offset The byte offset.
     * @param value The int value.
     */
    setInt(offset: number, value: number): void;
    /**
     * Sets a vec2 value in the buffer.
     * @param offset The byte offset.
     * @param x X component.
     * @param y Y component.
     */
    setVec2(offset: number, x: number, y: number): void;
    /**
     * Sets a vec3 value in the buffer.
     * @param offset The byte offset.
     * @param vec The Vector3D value.
     */
    setVector3(offset: number, vec: Vector3D): void;
    /**
     * Sets a mat4 value in the buffer.
     * @param offset The byte offset.
     * @param matrix The Matrix4 data.
     */
    setMatrix(offset: number, matrix: Float32Array): void;
    /**
     * Binds the buffer to a specific shader program's uniform block.
     * @param program The WebGL program.
     * @param blockName The name of the uniform block.
     */
    bindToProgram(program: WebGLProgram, blockName: string): void;
    /**
     * Uploads the local data to the GPU.
     */
    update(): void;
}
