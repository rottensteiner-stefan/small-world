import { IGeometry } from "../interfaces/IGeometry.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";

export abstract class ObjectGeometry implements IGeometry {
  protected vertices: Float32Array = new Float32Array();
  protected indices: Uint16Array|Uint32Array = new Uint16Array();
  protected normals: Float32Array = new Float32Array();
  protected uvs: Float32Array = new Float32Array(); // <--- NEU

  protected abstract generateGeometryData(): void;

  public getGeometryData(): IGeometryData {
    if (this.normals.length === 0 && this.vertices.length > 0) {
      this.computeNormals();
    }
    // Falls keine UVs generiert wurden, füllen wir sie mit Nullen (Fallback)
    if (this.uvs.length === 0 && this.vertices.length > 0) {
      this.uvs = new Float32Array((this.vertices.length / 3) * 2);
    }

    return {
      vertices: this.vertices,
      indices: this.indices,
      normals: this.normals,
      uvs: this.uvs, // <--- NEU
    };
  }

  public computeNormals(): void {
    this.normals = new Float32Array(this.vertices.length);

    if (this.indices.length % 3 !== 0) {
      for (let i = 0; i < this.normals.length; i += 3) {
        this.normals[i] = 0;
        this.normals[i + 1] = 1;
        this.normals[i + 2] = 0;
      }
      return;
    }

    for (let i = 0; i < this.indices.length; i += 3) {
      const iA = this.indices[i] * 3,
        iB = this.indices[i + 1] * 3,
        iC = this.indices[i + 2] * 3;
      const ax = this.vertices[iA],
        ay = this.vertices[iA + 1],
        az = this.vertices[iA + 2];
      const bx = this.vertices[iB],
        by = this.vertices[iB + 1],
        bz = this.vertices[iB + 2];
      const cx = this.vertices[iC],
        cy = this.vertices[iC + 1],
        cz = this.vertices[iC + 2];

      const ux = bx - ax,
        uy = by - ay,
        uz = bz - az;
      const vx = cx - ax,
        vy = cy - ay,
        vz = cz - az;

      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;

      this.normals[iA] += nx;
      this.normals[iA + 1] += ny;
      this.normals[iA + 2] += nz;
      this.normals[iB] += nx;
      this.normals[iB + 1] += ny;
      this.normals[iB + 2] += nz;
      this.normals[iC] += nx;
      this.normals[iC + 1] += ny;
      this.normals[iC + 2] += nz;
    }

    for (let i = 0; i < this.normals.length; i += 3) {
      const nx = this.normals[i],
        ny = this.normals[i + 1],
        nz = this.normals[i + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0) {
        this.normals[i] /= len;
        this.normals[i + 1] /= len;
        this.normals[i + 2] /= len;
      }
    }
  }

  public applyMatrix4(matrix: Matrix4): this {
    const v = new Vector3D();
    for (let i = 0; i < this.vertices.length; i += 3) {
      v.x = this.vertices[i];
      v.y = this.vertices[i + 1];
      v.z = this.vertices[i + 2];
      matrix.transformVector(v);
      this.vertices[i] = v.x;
      this.vertices[i + 1] = v.y;
      this.vertices[i + 2] = v.z;
    }
    this.computeNormals();
    return this;
  }

  public scale(f: number): this {
    const m = new Matrix4();
    Matrix4.scale(f, m);
    return this.applyMatrix4(m);
  }
  public rotateX(a: number): this {
    const m = new Matrix4();
    Matrix4.rotateX(a, m);
    return this.applyMatrix4(m);
  }
  public rotateY(a: number): this {
    const m = new Matrix4();
    Matrix4.rotateY(a, m);
    return this.applyMatrix4(m);
  }
  public rotateZ(a: number): this {
    const m = new Matrix4();
    Matrix4.rotateZ(a, m);
    return this.applyMatrix4(m);
  }
}
