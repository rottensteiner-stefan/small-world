import { IGeometry } from "../interfaces/IGeometry.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
export abstract class ObjectGeometry implements IGeometry {
  protected vertices: Float32Array = new Float32Array();
  protected indices: Uint16Array = new Uint16Array();
  protected abstract generateGeometryData(): void;
  public getGeometryData(): IGeometryData {
    return { vertices: this.vertices, indices: this.indices };
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
