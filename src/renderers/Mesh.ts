import { IGeometryData } from "../interfaces/IGeometryData.js";

export class Mesh {
  public vbo: WebGLBuffer | null;
  public ebo: WebGLBuffer | null;
  public nbo: WebGLBuffer | null = null;
  public tbo: WebGLBuffer | null = null; // <--- NEU: UV Buffer
  public count: number;

  constructor(
    private gl: WebGLRenderingContext | WebGL2RenderingContext,
    data: IGeometryData,
  ) {
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);

    if (data.normals && data.normals.length > 0) {
      this.nbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
      gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
    }

    if (data.uvs && data.uvs.length > 0) {
      this.tbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo);
      gl.bufferData(gl.ARRAY_BUFFER, data.uvs, gl.STATIC_DRAW);
    }

    this.ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    this.count = data.indices.length;
  }

  public bind(posLoc: number, normLoc: number = -1, uvLoc: number = -1) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
    this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(posLoc);

    if (normLoc >= 0 && this.nbo) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nbo);
      this.gl.vertexAttribPointer(normLoc, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(normLoc);
    }

    if (uvLoc >= 0 && this.tbo) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.tbo);
      this.gl.vertexAttribPointer(uvLoc, 2, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(uvLoc);
    }

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ebo);
  }
}
