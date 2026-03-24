/// src/core/Mesh.ts
import { GeometryDataInterface } from "../interfaces/index.js";

/**
 * Handles WebGL buffer management for a geometry.
 */
export class Mesh {
  /** The vertex buffer object. */
  public vbo: WebGLBuffer | null;
  /** The element buffer object (indices). */
  public ebo: WebGLBuffer | null;
  /** The normal buffer object. */
  public nbo: WebGLBuffer | null = null;
  /** The number of indices. */
  public count: number;

  /**
   * Creates a new Mesh.
   * @param _gl The WebGL context.
   * @param data The geometry data.
   */
  constructor(
    private _gl: WebGLRenderingContext | WebGL2RenderingContext,
    data: GeometryDataInterface,
  ) {
    this.vbo = _gl.createBuffer();
    _gl.bindBuffer(_gl.ARRAY_BUFFER, this.vbo);
    _gl.bufferData(_gl.ARRAY_BUFFER, data.vertices, _gl.STATIC_DRAW);

    if (data.normals) {
      this.nbo = _gl.createBuffer();
      _gl.bindBuffer(_gl.ARRAY_BUFFER, this.nbo);
      _gl.bufferData(_gl.ARRAY_BUFFER, data.normals, _gl.STATIC_DRAW);
    }

    this.ebo = _gl.createBuffer();
    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, data.indices, _gl.STATIC_DRAW);
    this.count = data.indices.length;
  }

  /**
   * Binds the buffers and sets up vertex attributes.
   * @param posLoc The position attribute location.
   * @param normLoc The normal attribute location.
   */
  public bind(posLoc: number, normLoc: number = -1): void {
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.vbo);
    this._gl.vertexAttribPointer(posLoc, 3, this._gl.FLOAT, false, 0, 0);
    this._gl.enableVertexAttribArray(posLoc);

    if (normLoc >= 0 && this.nbo) {
      this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.nbo);
      this._gl.vertexAttribPointer(normLoc, 3, this._gl.FLOAT, false, 0, 0);
      this._gl.enableVertexAttribArray(normLoc);
    }
    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this.ebo);
  }
}
