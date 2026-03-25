/// src/renderers/Mesh.ts
import { GeometryData } from "../interfaces/index.js";

export class Mesh {
  public vbo: WebGLBuffer | undefined;
  public ebo: WebGLBuffer | undefined;
  public nbo: WebGLBuffer | undefined = undefined;
  public tbo: WebGLBuffer | undefined = undefined; // <--- NEU: UV Buffer
  public count: number;

  private _gl: WebGLRenderingContext | WebGL2RenderingContext;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, data: GeometryData) {
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
