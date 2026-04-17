import { Vector3D } from "../math/index.js";
import { Color } from "../core/index.js";

/**
 * Helper to manage WebGL2 Uniform Buffer Objects (UBOs) with std140 layout.
 */
export class WebGL2UniformBuffer {
  private _gl: WebGL2RenderingContext;
  private _buffer: WebGLBuffer | null;
  private _data: Float32Array;
  private _bindingPoint: number;

  constructor(gl: WebGL2RenderingContext, sizeInBytes: number, bindingPoint: number) {
    this._gl = gl;
    this._bindingPoint = bindingPoint;
    this._data = new Float32Array(sizeInBytes / 4);
    this._buffer = gl.createBuffer();

    gl.bindBuffer(gl.UNIFORM_BUFFER, this._buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, this._data, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, this._buffer);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  public setMatrix(offset: number, matrix: Float32Array): void {
    this._data.set(matrix, offset / 4);
  }

  public setVector3(offset: number, vec: Vector3D): void {
    const idx = offset / 4;
    this._data[idx] = vec.x;
    this._data[idx + 1] = vec.y;
    this._data[idx + 2] = vec.z;
    // index + 3 is padding in std140 for vec3
  }

  public setColor(offset: number, col: Color): void {
    const idx = offset / 4;
    this._data[idx] = col.r;
    this._data[idx + 1] = col.g;
    this._data[idx + 2] = col.b;
    this._data[idx + 3] = col.a;
  }

  public setFloat(offset: number, val: number): void {
    this._data[offset / 4] = val;
  }

  public setInt(offset: number, val: number): void {
    // In std140, ints are still 4 bytes, so we can use the float array view if we're careful,
    // or use an Int32Array view of the same buffer.
    const view = new Int32Array(this._data.buffer);
    view[offset / 4] = val;
  }

  public update(): void {
    this._gl.bindBuffer(this._gl.UNIFORM_BUFFER, this._buffer);
    this._gl.bufferSubData(this._gl.UNIFORM_BUFFER, 0, this._data);
    this._gl.bindBuffer(this._gl.UNIFORM_BUFFER, null);
  }

  public bindToProgram(program: WebGLProgram, blockName: string): void {
    const blockIndex = this._gl.getUniformBlockIndex(program, blockName);
    if (blockIndex !== 0xffffffff) {
      this._gl.uniformBlockBinding(program, blockIndex, this._bindingPoint);
    }
  }
}
