/// src/geometry/AbstractGeometry.ts
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
import { GeometryData, Geometry } from "../interfaces/index.js";

/**
 * Base class for all geometry types.
 */
export abstract class AbstractGeometry implements Geometry {
  /**
   * The vertices of the geometry.
   */
  protected _vertices: Float32Array = new Float32Array();

  /**
   * The indices of the geometry.
   */
  protected _indices: Uint16Array | Uint32Array = new Uint16Array();

  /**
   * The normals of the geometry.
   */
  protected _normals: Float32Array = new Float32Array();

  /**
   * The UV coordinates of the geometry.
   */
  protected _uvs: Float32Array = new Float32Array();

  /**
   * Generates the geometry data.
   */
  protected abstract generateGeometryData(): void;

  /**
   * Returns the geometry data.
   * @returns The geometry data.
   */
  public getGeometryData(): GeometryData {
    if (0 === this._normals.length && 0 < this._vertices.length) {
      this.computeNormals();
    }
    // Falls keine UVs generiert wurden, füllen wir sie mit Nullen (Fallback)
    if (0 === this._uvs.length && 0 < this._vertices.length) {
      this._uvs = new Float32Array((this._vertices.length / 3) * 2);
    }

    return {
      vertices: this._vertices,
      indices: this._indices,
      normals: this._normals,
      uvs: this._uvs,
    };
  }

  /**
   * Computes the normals of the geometry.
   */
  public computeNormals(): void {
    this._normals = new Float32Array(this._vertices.length);

    if (0 !== this._indices.length % 3) {
      for (let i: number = 0; i < this._normals.length; i += 3) {
        this._normals[i] = 0;
        this._normals[i + 1] = 1;
        this._normals[i + 2] = 0;
      }
      return;
    }

    for (let i: number = 0; i < this._indices.length; i += 3) {
      const iA: number = (this._indices[i] ?? 0) * 3;
      const iB: number = (this._indices[i + 1] ?? 0) * 3;
      const iC: number = (this._indices[i + 2] ?? 0) * 3;

      const ax: number = this._vertices[iA] ?? 0;
      const ay: number = this._vertices[iA + 1] ?? 0;
      const az: number = this._vertices[iA + 2] ?? 0;

      const bx: number = this._vertices[iB] ?? 0;
      const by: number = this._vertices[iB + 1] ?? 0;
      const bz: number = this._vertices[iB + 2] ?? 0;

      const cx: number = this._vertices[iC] ?? 0;
      const cy: number = this._vertices[iC + 1] ?? 0;
      const cz: number = this._vertices[iC + 2] ?? 0;

      const ux: number = bx - ax;
      const uy: number = by - ay;
      const uz: number = bz - az;

      const vx: number = cx - ax;
      const vy: number = cy - ay;
      const vz: number = cz - az;

      const nx: number = uy * vz - uz * vy;
      const ny: number = uz * vx - ux * vz;
      const nz: number = ux * vy - uy * vx;

      this._normals[iA] = (this._normals[iA] ?? 0) + nx;
      this._normals[iA + 1] = (this._normals[iA + 1] ?? 0) + ny;
      this._normals[iA + 2] = (this._normals[iA + 2] ?? 0) + nz;

      this._normals[iB] = (this._normals[iB] ?? 0) + nx;
      this._normals[iB + 1] = (this._normals[iB + 1] ?? 0) + ny;
      this._normals[iB + 2] = (this._normals[iB + 2] ?? 0) + nz;

      this._normals[iC] = (this._normals[iC] ?? 0) + nx;
      this._normals[iC + 1] = (this._normals[iC + 1] ?? 0) + ny;
      this._normals[iC + 2] = (this._normals[iC + 2] ?? 0) + nz;
    }

    for (let i: number = 0; i < this._normals.length; i += 3) {
      const nx: number = this._normals[i] ?? 0;
      const ny: number = this._normals[i + 1] ?? 0;
      const nz: number = this._normals[i + 2] ?? 0;
      const len: number = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (0 < len) {
        this._normals[i] = nx / len;
        this._normals[i + 1] = ny / len;
        this._normals[i + 2] = nz / len;
      }
    }
  }

  /**
   * Applies a Matrix4 transformation to the geometry.
   * @param matrix The transformation matrix.
   * @returns this
   */
  public applyMatrix4(matrix: Matrix4): this {
    const v: Vector3D = new Vector3D();
    for (let i: number = 0; i < this._vertices.length; i += 3) {
      v.x = this._vertices[i] ?? 0;
      v.y = this._vertices[i + 1] ?? 0;
      v.z = this._vertices[i + 2] ?? 0;
      matrix.transformVector(v);
      this._vertices[i] = v.x;
      this._vertices[i + 1] = v.y;
      this._vertices[i + 2] = v.z;
    }
    this.computeNormals();
    return this;
  }

  /**
   * Scales the geometry.
   * @param f The scale factor.
   * @returns this
   */
  public scale(f: number): this {
    const m: Matrix4 = new Matrix4();
    Matrix4.scale(f, m);
    return this.applyMatrix4(m);
  }

  /**
   * Rotates the geometry around the X-axis.
   * @param a The rotation angle in radians.
   * @returns this
   */
  public rotateX(a: number): this {
    const m: Matrix4 = new Matrix4();
    Matrix4.rotateX(a, m);
    return this.applyMatrix4(m);
  }

  /**
   * Rotates the geometry around the Y-axis.
   * @param a The rotation angle in radians.
   * @returns this
   */
  public rotateY(a: number): this {
    const m: Matrix4 = new Matrix4();
    Matrix4.rotateY(a, m);
    return this.applyMatrix4(m);
  }

  /**
   * Rotates the geometry around the Z-axis.
   * @param a The rotation angle in radians.
   * @returns this
   */
  public rotateZ(a: number): this {
    const m: Matrix4 = new Matrix4();
    Matrix4.rotateZ(a, m);
    return this.applyMatrix4(m);
  }
}
