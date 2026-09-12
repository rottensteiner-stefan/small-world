import { GeometryDataInterface } from "../interfaces/index.js";

/**
 * Wrapper for WebGL vertex and index buffers.
 * Handles both indexed and non-indexed geometry.
 */
export class Mesh {
  /** The vertex buffer object. */
  public vbo: WebGLBuffer | undefined;
  /** The element buffer object (indices). */
  public ebo: WebGLBuffer | undefined;
  /** The wireframe element buffer object. */
  public webo: WebGLBuffer | undefined;
  /** The normal buffer object. */
  public nbo: WebGLBuffer | undefined = undefined;
  /** The tangent buffer object. */
  public tanbo: WebGLBuffer | undefined = undefined;
  /** The texture coordinate buffer object. */
  public tbo: WebGLBuffer | undefined = undefined;
  /** The skinning joints buffer object. */
  public jbo: WebGLBuffer | undefined = undefined;
  /** The skinning weights buffer object. */
  public wbo: WebGLBuffer | undefined = undefined;

  /** The number of elements (indices or vertices) to draw. */
  public count: number;
  /** The number of wireframe elements. */
  public wireframeCount: number = 0;
  /** Whether this mesh uses indices for drawing. */
  public isIndexed: boolean = false;
  /** The GL data type of the indices (e.g., UNSIGNED_SHORT or UNSIGNED_INT). */
  public indexType: number = 0;
  /** The GL data type of the wireframe indices. */
  public wireframeIndexType: number = 0;

  /** Number of live Object3D instances currently referencing this mesh's geometry. */
  public refCount: number = 0;

  private _gl: WebGLRenderingContext | WebGL2RenderingContext;

  /**
   * Creates a new Mesh and uploads the geometry data to the GPU.
   * @param gl The WebGL context.
   * @param data The geometry data to upload.
   */
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, data: GeometryDataInterface) {
    this._gl = gl;

    // 1. Position Buffer
    this.vbo = gl.createBuffer() ?? undefined;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo ?? null);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);

    // 2. Normals Buffer
    if (data.normals && 0 < data.normals.length) {
      this.nbo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo ?? null);
      gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
    }

    // 3. Tangents Buffer
    if (data.tangents && 0 < data.tangents.length) {
      this.tanbo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tanbo ?? null);
      gl.bufferData(gl.ARRAY_BUFFER, data.tangents, gl.STATIC_DRAW);
    }

    // 4. UVs Buffer
    if (data.uvs && 0 < data.uvs.length) {
      this.tbo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo ?? null);
      gl.bufferData(gl.ARRAY_BUFFER, data.uvs, gl.STATIC_DRAW);
    }

    // 5. Joints Buffer (Skinning)
    if (data.joints && 0 < data.joints.length) {
      this.jbo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.jbo ?? null);
      gl.bufferData(gl.ARRAY_BUFFER, data.joints, gl.STATIC_DRAW);
    }

    // 6. Weights Buffer (Skinning)
    if (data.weights && 0 < data.weights.length) {
      this.wbo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.wbo ?? null);
      gl.bufferData(gl.ARRAY_BUFFER, data.weights, gl.STATIC_DRAW);
    }

    // 7. Indices Buffer (Optional)
    if (data.indices && 0 < data.indices.length) {
      this.isIndexed = true;
      this.ebo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo ?? null);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
      this.count = data.indices.length;
      this.indexType = data.indices.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    } else {
      this.isIndexed = false;
      this.count = data.vertices.length / 3;
    }

    // 8. Wireframe Indices Buffer (Optional)
    if (data.wireframeIndices && 0 < data.wireframeIndices.length) {
      this.webo = gl.createBuffer() ?? undefined;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.webo ?? null);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.wireframeIndices, gl.STATIC_DRAW);
      this.wireframeCount = data.wireframeIndices.length;
      this.wireframeIndexType =
        data.wireframeIndices.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    }
  }

  /**
   * Binds the buffers and sets the vertex attributes.
   * @param posLoc The location of the position attribute.
   * @param normLoc The location of the normal attribute.
   * @param uvLoc The location of the UV attribute.
   * @param tanLoc The location of the tangent attribute.
   * @param jointLoc The location of the joints attribute.
   * @param weightLoc The location of the weights attribute.
   */
  public bind(
    posLoc: number,
    normLoc: number = -1,
    uvLoc: number = -1,
    tanLoc: number = -1,
    jointLoc: number = -1,
    weightLoc: number = -1,
  ): void {
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.vbo ?? null);
    this._gl.vertexAttribPointer(posLoc, 3, this._gl.FLOAT, false, 0, 0);
    this._gl.enableVertexAttribArray(posLoc);

    if (0 <= normLoc) {
      if (this.nbo) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.nbo);
        this._gl.vertexAttribPointer(normLoc, 3, this._gl.FLOAT, false, 0, 0);
        this._gl.enableVertexAttribArray(normLoc);
      } else {
        this._gl.disableVertexAttribArray(normLoc);
      }
    }

    if (0 <= uvLoc) {
      if (this.tbo) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.tbo);
        this._gl.vertexAttribPointer(uvLoc, 2, this._gl.FLOAT, false, 0, 0);
        this._gl.enableVertexAttribArray(uvLoc);
      } else {
        this._gl.disableVertexAttribArray(uvLoc);
      }
    }

    if (0 <= tanLoc) {
      if (this.tanbo) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.tanbo);
        this._gl.vertexAttribPointer(tanLoc, 3, this._gl.FLOAT, false, 0, 0);
        this._gl.enableVertexAttribArray(tanLoc);
      } else {
        this._gl.disableVertexAttribArray(tanLoc);
      }
    }

    if (0 <= jointLoc) {
      if (this.jbo) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.jbo);
        this._gl.vertexAttribPointer(jointLoc, 4, this._gl.FLOAT, false, 0, 0);
        this._gl.enableVertexAttribArray(jointLoc);
      } else {
        this._gl.disableVertexAttribArray(jointLoc);
      }
    }

    if (0 <= weightLoc) {
      if (this.wbo) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.wbo);
        this._gl.vertexAttribPointer(weightLoc, 4, this._gl.FLOAT, false, 0, 0);
        this._gl.enableVertexAttribArray(weightLoc);
      } else {
        this._gl.disableVertexAttribArray(weightLoc);
      }
    }
  }

  /**
   * Draws the mesh using the appropriate GL call.
   * @param mode The draw mode (e.g. TRIANGLES, LINES).
   */
  public draw(mode: number, wireframeMode: "structural" | "triangles" = "structural"): void {
    if (mode === this._gl.LINES && wireframeMode === "structural" && this.webo) {
      this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this.webo);
      this._gl.drawElements(mode, this.wireframeCount, this.wireframeIndexType, 0);
    } else if (this.isIndexed) {
      this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this.ebo ?? null);
      this._gl.drawElements(mode, this.count, this.indexType, 0);
    } else {
      this._gl.drawArrays(mode, 0, this.count);
    }
  }

  /**
   * Updates the GPU buffers with new geometry data.
   * Currently updates vertices, normals and tangents.
   * @param data The new geometry data.
   */
  public update(data: GeometryDataInterface): void {
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.vbo ?? null);
    this._gl.bufferData(this._gl.ARRAY_BUFFER, data.vertices, this._gl.STATIC_DRAW);

    if (this.nbo && data.normals) {
      this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.nbo);
      this._gl.bufferData(this._gl.ARRAY_BUFFER, data.normals, this._gl.STATIC_DRAW);
    }

    if (this.tanbo && data.tangents) {
      this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.tanbo);
      this._gl.bufferData(this._gl.ARRAY_BUFFER, data.tangents, this._gl.STATIC_DRAW);
    }
  }

  /** Deletes all GPU buffers owned by this mesh. Call only once its refCount reaches 0. */
  public dispose(): void {
    if (this.vbo) this._gl.deleteBuffer(this.vbo);
    if (this.ebo) this._gl.deleteBuffer(this.ebo);
    if (this.webo) this._gl.deleteBuffer(this.webo);
    if (this.nbo) this._gl.deleteBuffer(this.nbo);
    if (this.tanbo) this._gl.deleteBuffer(this.tanbo);
    if (this.tbo) this._gl.deleteBuffer(this.tbo);
    if (this.jbo) this._gl.deleteBuffer(this.jbo);
    if (this.wbo) this._gl.deleteBuffer(this.wbo);
  }
}
