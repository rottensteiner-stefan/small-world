/// src/renderers/WebGL2UniformBuffer.ts
/**
 * Wrapper for a WebGL2 Uniform Buffer Object (UBO).
 */
export class WebGL2UniformBuffer {
    _gl;
    _buffer;
    _data;
    _int32Data;
    _bindingPoint;
    /**
     * Creates a new Uniform Buffer Object.
     * @param gl The WebGL2 context.
     * @param size The size of the buffer in bytes.
     * @param bindingPoint The binding point to use (e.g., 0).
     */
    constructor(gl, size, bindingPoint) {
        this._gl = gl;
        this._bindingPoint = bindingPoint;
        // Create underlying buffer
        const buffer = new ArrayBuffer(size);
        this._data = new Float32Array(buffer);
        this._int32Data = new Int32Array(buffer);
        this._buffer = this._gl.createBuffer();
        this._gl.bindBuffer(this._gl.UNIFORM_BUFFER, this._buffer);
        this._gl.bufferData(this._gl.UNIFORM_BUFFER, size, this._gl.DYNAMIC_DRAW);
        this._gl.bindBufferBase(this._gl.UNIFORM_BUFFER, this._bindingPoint, this._buffer);
        this._gl.bindBuffer(this._gl.UNIFORM_BUFFER, null);
    }
    /**
     * Sets a float value in the buffer.
     * @param offset The byte offset.
     * @param value The float value.
     */
    setFloat(offset, value) {
        this._data[offset / 4] = value;
    }
    /**
     * Sets an int value in the buffer.
     * @param offset The byte offset.
     * @param value The int value.
     */
    setInt(offset, value) {
        this._int32Data[offset / 4] = value;
    }
    /**
     * Sets a vec2 value in the buffer.
     * @param offset The byte offset.
     * @param x X component.
     * @param y Y component.
     */
    setVec2(offset, x, y) {
        const idx = offset / 4;
        this._data[idx] = x;
        this._data[idx + 1] = y;
    }
    /**
     * Sets a vec3 value in the buffer.
     * @param offset The byte offset.
     * @param vec The Vector3D value.
     */
    setVector3(offset, vec) {
        const idx = offset / 4;
        this._data[idx] = vec.x;
        this._data[idx + 1] = vec.y;
        this._data[idx + 2] = vec.z;
    }
    /**
     * Sets a mat4 value in the buffer.
     * @param offset The byte offset.
     * @param matrix The Matrix4 data.
     */
    setMatrix(offset, matrix) {
        this._data.set(matrix, offset / 4);
    }
    /**
     * Binds the buffer to a specific shader program's uniform block.
     * @param program The WebGL program.
     * @param blockName The name of the uniform block.
     */
    bindToProgram(program, blockName) {
        const blockIndex = this._gl.getUniformBlockIndex(program, blockName);
        if (blockIndex !== 0xffffffff) {
            this._gl.uniformBlockBinding(program, blockIndex, this._bindingPoint);
        }
    }
    /**
     * Uploads the local data to the GPU.
     */
    update() {
        this._gl.bindBuffer(this._gl.UNIFORM_BUFFER, this._buffer);
        this._gl.bufferSubData(this._gl.UNIFORM_BUFFER, 0, this._data);
        this._gl.bindBuffer(this._gl.UNIFORM_BUFFER, null);
    }
}
//# sourceMappingURL=WebGL2UniformBuffer.js.map