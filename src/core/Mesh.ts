/// src/core/Mesh.ts
import { GeometryDataInterface } from "../interfaces/index.js";

export class Mesh {
  public vbo: WebGLBuffer | null;
  public ebo: WebGLBuffer | null;
  public nbo: WebGLBuffer | null = null;
  public count: number;

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
