/// src/math/Matrix4.ts

import { Vector3D } from "./Vector3D.js";
import { MathPool } from "./MathPool.js";

/**
 * A 4x4 matrix class for 3D transformations (Column-Major).
 */
export class Matrix4 {
  public data: Float32Array = new Float32Array(16);

  constructor() {
    this.identity();
  }

  public identity(): Matrix4 {
    this.data.fill(0);
    this.data[0] = 1;
    this.data[5] = 1;
    this.data[10] = 1;
    this.data[15] = 1;
    return this;
  }

  public copy(m: Matrix4): this {
    this.data.set(m.data);
    return this;
  }

  public multiply(m: Matrix4): this {
    Matrix4.multiply(this, m, this);
    return this;
  }

  public invert(target: Matrix4 = this): boolean {
    return Matrix4.invert(this, target);
  }

  public transpose(): this {
    const te = this.data;
    let tmp: number;
    tmp = te[1]!;
    te[1] = te[4]!;
    te[4] = tmp;
    tmp = te[2]!;
    te[2] = te[8]!;
    te[8] = tmp;
    tmp = te[6]!;
    te[6] = te[9]!;
    te[9] = tmp;
    tmp = te[3]!;
    te[3] = te[12]!;
    te[12] = tmp;
    tmp = te[7]!;
    te[7] = te[13]!;
    te[13] = tmp;
    tmp = te[11]!;
    te[11] = te[14]!;
    te[14] = tmp;
    return this;
  }

  public transformVector(v: Vector3D, result: Vector3D = v): Vector3D {
    const x = v.x,
      y = v.y,
      z = v.z;
    const e = this.data;
    const w = 1 / (e[3]! * x + e[7]! * y + e[11]! * z + e[15]!);
    result.x = (e[0]! * x + e[4]! * y + e[8]! * z + e[12]!) * w;
    result.y = (e[1]! * x + e[5]! * y + e[9]! * z + e[13]!) * w;
    result.z = (e[2]! * x + e[6]! * y + e[10]! * z + e[14]!) * w;
    return result;
  }

  /**
   * Composes matrix from pos, rot (Euler YXZ), scale.
   */
  public compose(pos: Vector3D, rot: Vector3D, scale: Vector3D): this {
    const te = this.data;
    const x = rot.x,
      y = rot.y,
      z = rot.z;
    const cX = Math.cos(x),
      sX = Math.sin(x);
    const cY = Math.cos(y),
      sY = Math.sin(y);
    const cZ = Math.cos(z),
      sZ = Math.sin(z);

    const scX = scale.x,
      scY = scale.y,
      scZ = scale.z;

    te[0] = (cY * cZ + sY * sX * sZ) * scX;
    te[1] = cX * sZ * scX;
    te[2] = (-sY * cZ + cY * sX * sZ) * scX;
    te[3] = 0;

    te[4] = (-cY * sZ + sY * sX * cZ) * scY;
    te[5] = cX * cZ * scY;
    te[6] = (sY * sZ + cY * sX * cZ) * scY;
    te[7] = 0;

    te[8] = sY * cX * scZ;
    te[9] = -sX * scZ;
    te[10] = cY * cX * scZ;
    te[11] = 0;

    te[12] = pos.x;
    te[13] = pos.y;
    te[14] = pos.z;
    te[15] = 1;

    return this;
  }

  public decompose(position: Vector3D, rotation: Vector3D, scale: Vector3D): this {
    const te = this.data;
    position.set(te[12]!, te[13]!, te[14]!);
    const v1 = MathPool.acquireVector().set(te[0]!, te[1]!, te[2]!);
    const v2 = MathPool.acquireVector().set(te[4]!, te[5]!, te[6]!);
    const v3 = MathPool.acquireVector().set(te[8]!, te[9]!, te[10]!);
    let sx = v1.length();
    const sy = v2.length();
    const sz = v3.length();
    if (this.determinant() < 0) sx = -sx;
    scale.set(sx, sy, sz);
    const m = MathPool.acquireMatrix();
    m.data.set(this.data);
    const invSX = 1 / sx;
    const invSY = 1 / sy;
    const invSZ = 1 / sz;
    m.data[0]! *= invSX;
    m.data[1]! *= invSX;
    m.data[2]! *= invSX;
    m.data[4]! *= invSY;
    m.data[5]! *= invSY;
    m.data[6]! *= invSY;
    m.data[8]! *= invSZ;
    m.data[9]! *= invSZ;
    m.data[10]! *= invSZ;
    rotation.x = Math.asin(-Math.max(-1, Math.min(1, m.data[9]!))); // Fixed decompose index
    if (Math.abs(m.data[9]!) < 0.99999) {
      rotation.y = Math.atan2(m.data[8]!, m.data[10]!);
      rotation.z = Math.atan2(m.data[1]!, m.data[5]!);
    } else {
      rotation.y = Math.atan2(-m.data[2]!, m.data[0]!);
      rotation.z = 0;
    }
    MathPool.releaseVector(v1);
    MathPool.releaseVector(v2);
    MathPool.releaseVector(v3);
    MathPool.releaseMatrix(m);
    return this;
  }

  public determinant(): number {
    const te = this.data;
    const n11 = te[0]!,
      n12 = te[4]!,
      n13 = te[8]!,
      n14 = te[12]!;
    const n21 = te[1]!,
      n22 = te[5]!,
      n23 = te[9]!,
      n24 = te[13]!;
    const n31 = te[2]!,
      n32 = te[6]!,
      n33 = te[10]!,
      n34 = te[14]!;
    const n41 = te[3]!,
      n42 = te[7]!,
      n43 = te[11]!,
      n44 = te[15]!;
    return (
      n41 *
        (+n14 * n23 * n32 -
          n13 * n24 * n32 -
          n14 * n22 * n33 +
          n12 * n24 * n33 +
          n13 * n22 * n34 -
          n12 * n23 * n34) +
      n42 *
        (+n11 * n23 * n34 -
          n11 * n24 * n33 +
          n14 * n21 * n33 -
          n13 * n21 * n34 +
          n13 * n24 * n31 -
          n14 * n23 * n31) +
      n43 *
        (+n11 * n24 * n32 -
          n11 * n22 * n34 -
          n14 * n21 * n32 +
          n12 * n21 * n34 +
          n14 * n22 * n31 -
          n12 * n24 * n31) +
      n44 *
        (-n13 * n22 * n31 -
          n11 * n23 * n32 +
          n11 * n22 * n33 +
          n13 * n21 * n32 -
          n12 * n21 * n33 +
          n12 * n23 * n31)
    );
  }

  public static multiply(a: Matrix4, b: Matrix4, result: Matrix4): void {
    const ae = a.data;
    const be = b.data;
    const te = result.data;
    const a11 = ae[0]!,
      a12 = ae[4]!,
      a13 = ae[8]!,
      a14 = ae[12]!;
    const a21 = ae[1]!,
      a22 = ae[5]!,
      a23 = ae[9]!,
      a24 = ae[13]!;
    const a31 = ae[2]!,
      a32 = ae[6]!,
      a33 = ae[10]!,
      a34 = ae[14]!;
    const a41 = ae[3]!,
      a42 = ae[7]!,
      a43 = ae[11]!,
      a44 = ae[15]!;
    const b11 = be[0]!,
      b12 = be[4]!,
      b13 = be[8]!,
      b14 = be[12]!;
    const b21 = be[1]!,
      b22 = be[5]!,
      b23 = be[9]!,
      b24 = be[13]!;
    const b31 = be[2]!,
      b32 = be[6]!,
      b33 = be[10]!,
      b34 = be[14]!;
    const b41 = be[3]!,
      b42 = be[7]!,
      b43 = be[11]!,
      b44 = be[15]!;
    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  }

  public static perspective(
    fov: number,
    aspect: number,
    near: number,
    far: number,
    target: Matrix4,
  ): void {
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1.0 / (near - far);
    target.data.fill(0);
    target.data[0] = f / aspect;
    target.data[5] = f;
    target.data[10] = (far + near) * rangeInv;
    target.data[11] = -1;
    target.data[14] = 2 * far * near * rangeInv;
  }

  public static orthographic(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
    target: Matrix4,
  ): void {
    const w = 1.0 / (right - left);
    const h = 1.0 / (top - bottom);
    const p = 1.0 / (far - near);
    target.data.fill(0);
    target.data[0] = 2 * w;
    target.data[5] = 2 * h;
    target.data[10] = -2 * p; // Correct Ortho Z: -2/(f-n)
    target.data[12] = -(right + left) * w;
    target.data[13] = -(top + bottom) * h;
    target.data[14] = -(far + near) * p;
    target.data[15] = 1;
  }

  public static lookAt(eye: Vector3D, target: Vector3D, up: Vector3D, result: Matrix4): void {
    const z = MathPool.acquireVector().copyFrom(eye).sub(target).normalize();
    const x = MathPool.acquireVector().copyFrom(up).cross(z).normalize();
    const y = MathPool.acquireVector().copyFrom(z).cross(x).normalize();
    const te = result.data;
    te[0] = x.x;
    te[4] = x.y;
    te[8] = x.z;
    te[12] = -x.dot(eye);
    te[1] = y.x;
    te[5] = y.y;
    te[9] = y.z;
    te[13] = -y.dot(eye);
    te[2] = z.x;
    te[6] = z.y;
    te[10] = z.z;
    te[14] = -z.dot(eye);
    te[3] = 0;
    te[7] = 0;
    te[11] = 0;
    te[15] = 1;
    MathPool.releaseVector(x);
    MathPool.releaseVector(y);
    MathPool.releaseVector(z);
  }

  public static invert(src: Matrix4, target: Matrix4): boolean {
    const te = target.data;
    const n = src.data;
    const n11 = n[0]!,
      n12 = n[4]!,
      n13 = n[8]!,
      n14 = n[12]!;
    const n21 = n[1]!,
      n22 = n[5]!,
      n23 = n[9]!,
      n24 = n[13]!;
    const n31 = n[2]!,
      n32 = n[6]!,
      n33 = n[10]!,
      n34 = n[14]!;
    const n41 = n[3]!,
      n42 = n[7]!,
      n43 = n[11]!,
      n44 = n[15]!;
    const t11 =
      n23 * n34 * n42 -
      n24 * n33 * n42 +
      n24 * n32 * n43 -
      n22 * n34 * n43 -
      n23 * n32 * n44 +
      n22 * n33 * n44;
    const t12 =
      n14 * n33 * n42 -
      n13 * n34 * n42 -
      n14 * n32 * n43 +
      n12 * n34 * n43 +
      n13 * n32 * n44 -
      n12 * n33 * n44;
    const t13 =
      n13 * n24 * n42 -
      n14 * n23 * n42 +
      n14 * n22 * n43 -
      n12 * n24 * n43 -
      n13 * n22 * n44 +
      n12 * n23 * n44;
    const t14 =
      n14 * n23 * n32 -
      n13 * n24 * n32 -
      n14 * n22 * n33 +
      n12 * n24 * n33 +
      n13 * n22 * n34 -
      n12 * n23 * n34;
    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
    if (det === 0) return false;
    const invDet = 1.0 / det;
    te[0] = t11 * invDet;
    te[1] =
      (n24 * n33 * n41 -
        n23 * n34 * n41 -
        n24 * n31 * n43 +
        n21 * n34 * n43 +
        n23 * n31 * n44 -
        n21 * n33 * n44) *
      invDet;
    te[2] =
      (n22 * n34 * n41 -
        n24 * n32 * n41 +
        n24 * n31 * n42 -
        n21 * n34 * n42 -
        n22 * n31 * n44 +
        n21 * n32 * n44) *
      invDet;
    te[3] =
      (n23 * n32 * n41 -
        n22 * n33 * n41 -
        n23 * n31 * n42 +
        n21 * n33 * n42 +
        n22 * n31 * n43 -
        n21 * n32 * n43) *
      invDet;
    te[4] = t12 * invDet;
    te[5] =
      (n13 * n34 * n41 -
        n14 * n33 * n41 +
        n14 * n31 * n43 -
        n11 * n34 * n43 -
        n13 * n31 * n44 +
        n11 * n33 * n44) *
      invDet;
    te[6] =
      (n14 * n32 * n41 -
        n12 * n34 * n41 -
        n14 * n31 * n42 +
        n11 * n34 * n42 +
        n12 * n31 * n44 -
        n11 * n32 * n44) *
      invDet;
    te[7] =
      (n12 * n33 * n41 -
        n13 * n32 * n41 +
        n13 * n31 * n42 -
        n11 * n33 * n42 -
        n12 * n31 * n43 +
        n11 * n32 * n43) *
      invDet;
    te[8] =
      (n21 * n32 * n44 -
        n21 * n34 * n42 +
        n24 * n31 * n42 -
        n22 * n31 * n44 -
        n24 * n32 * n41 +
        n22 * n34 * n41) *
      invDet;
    te[9] =
      (n11 * n34 * n42 -
        n11 * n32 * n44 +
        n12 * n31 * n44 -
        n14 * n31 * n42 +
        n14 * n32 * n41 -
        n12 * n34 * n41) *
      invDet;
    te[10] =
      (n11 * n22 * n44 -
        n11 * n24 * n42 +
        n14 * n21 * n42 -
        n12 * n21 * n44 -
        n14 * n22 * n41 +
        n12 * n24 * n41) *
      invDet;
    te[11] =
      (n11 * n24 * n32 -
        n11 * n22 * n34 +
        n12 * n21 * n34 -
        n14 * n21 * n32 +
        n14 * n22 * n31 -
        n12 * n24 * n31) *
      invDet;
    te[12] = t14 * invDet;
    te[13] =
      (n21 * n33 * n42 -
        n21 * n32 * n43 +
        n22 * n31 * n43 -
        n23 * n31 * n42 +
        n23 * n32 * n41 -
        n22 * n33 * n41) *
      invDet;
    te[14] =
      (n11 * n32 * n43 -
        n11 * n33 * n42 +
        n13 * n31 * n42 -
        n12 * n31 * n43 -
        n13 * n32 * n41 +
        n12 * n33 * n41) *
      invDet;
    te[15] =
      (n11 * n23 * n42 -
        n11 * n22 * n43 +
        n12 * n21 * n43 -
        n13 * n21 * n42 +
        n13 * n22 * n41 -
        n12 * n23 * n41) *
      invDet;
    return true;
  }

  public static rotateX(angle: number, target: Matrix4): void {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    target.identity();
    target.data[5] = c;
    target.data[6] = s;
    target.data[9] = -s;
    target.data[10] = c;
  }
  public static rotateY(angle: number, target: Matrix4): void {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    target.identity();
    target.data[0] = c;
    target.data[2] = -s;
    target.data[8] = s;
    target.data[10] = c;
  }
  public static rotateZ(angle: number, target: Matrix4): void {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    target.identity();
    target.data[0] = c;
    target.data[1] = s;
    target.data[4] = -s;
    target.data[5] = c;
  }
  public static translate(x: number, y: number, z: number, target: Matrix4): void {
    target.identity();
    target.data[12] = x;
    target.data[13] = y;
    target.data[14] = z;
  }
  public static scale(x: number, y: number | Matrix4, z?: number, target?: Matrix4): void {
    if (y instanceof Matrix4) {
      const m = y;
      const s = x;
      m.identity();
      m.data[0] = s;
      m.data[5] = s;
      m.data[10] = s;
      return;
    }
    const m = target!;
    m.identity();
    m.data[0] = x;
    m.data[5] = y as number;
    m.data[10] = z!;
  }
}
