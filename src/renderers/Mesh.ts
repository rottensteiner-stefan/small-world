/// src/renderers/Mesh.ts
import { GeometryDataInterface } from "../interfaces/index.js";

/**
 * Wrapper for WebGL vertex and index buffers.
 */
export class Mesh {
  /** The vertex buffer object. */
  public vbo: WebGLBuffer | undefined;
  /** The element buffer object (indices). */
  public ebo: WebGLBuffer | undefined;
  /** The normal buffer object. */
  public nbo: WebGLBuffer | undefined = undefined;
  /** The texture coordinate buffer object. */
  public tbo: WebGLBuffer | undefined = undefined;
  /** The number of elements to draw. */
  public count: number;

  private _gl: WebGLRenderingContext | WebGL2RenderingContext;

  /**
   * Creates a new Mesh and uploads the geometry data to the GPU.
   * @param gl The WebGL context.
   * @param data The geometry data to upload.
   */
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, data: GeometryDataInterface) {
    this._gl = gl;
    this.vbo = gl.createBuffer() ?? undefined;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo ?? null);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);

    if (data.normals && 0 < data.normals.length) {
      this.nbo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo ?? null);
      gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
    }

    if (data.uvs && 0 < data.uvs.length) {
      this.tbo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo ?? null);
      gl.bufferData(gl.ARRAY_BUFFER, data.uvs, gl.STATIC_DRAW);
    }

    this.ebo = gl.createBuffer() ?? undefined;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo ?? null);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    this.count = data.indices.length;
  }

  /**
   * Binds the buffers and sets the vertex attributes.
   * @param posLoc The location of the position attribute.
   * @param normLoc The location of the normal attribute.
   * @param uvLoc The location of the UV attribute.
   */
  public bind(posLoc: number, normLoc: number = -1, uvLoc: number = -1): void {
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.vbo ?? null);
    this._gl.vertexAttribPointer(posLoc, 3, this._gl.FLOAT, false, 0, 0);
    this._gl.enableVertexAttribArray(posLoc);

    if (0 <= normLoc && this.nbo) {
      this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.nbo);
      this._gl.vertexAttribPointer(normLoc, 3, this._gl.FLOAT, false, 0, 0);
      this._gl.enableVertexAttribArray(normLoc);
    }

    if (0 <= uvLoc && this.tbo) {
      this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.tbo);
      this._gl.vertexAttribPointer(uvLoc, 2, this._gl.FLOAT, false, 0, 0);
      this._gl.enableVertexAttribArray(uvLoc);
    }

    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this.ebo ?? null);
  }
}
