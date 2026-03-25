/// src/math/Matrix4.ts
import { Vector3D } from "./Vector3D.js";
/**
 * A 4x4 matrix class.
 */
export class Matrix4 {
  /**
   * The matrix data.
   */
  public data: Float32Array = new Float32Array(16);

  /**
   * Creates a new Matrix4 and initializes it to the identity matrix.
   */
  constructor() {
    this.identity();
  }

  /**
   * Sets the matrix to the identity matrix.
   * @returns this
   */
  public identity(): Matrix4 {
    this.data.fill(0);
    this.data[0] = 1;
    this.data[5] = 1;
    this.data[10] = 1;
    this.data[15] = 1;
    return this;
  }

  /**
   * Composes the matrix from position, rotation, and scale.
   * @param pos The position vector.
   * @param rot The rotation vector (Euler angles).
   * @param scale The scale vector.
   * @returns this
   */
  public compose(pos: Vector3D, rot: Vector3D, scale: Vector3D): this {
    const t: Matrix4 = new Matrix4();
    Matrix4.translate(pos, t);
    const rx: Matrix4 = new Matrix4();
    Matrix4.rotateX(rot.x, rx);
    const ry: Matrix4 = new Matrix4();
    Matrix4.rotateY(rot.y, ry);
    const rz: Matrix4 = new Matrix4();
    Matrix4.rotateZ(rot.z, rz);
    const s: Matrix4 = new Matrix4();
    s.data[0] = scale.x;
    s.data[5] = scale.y;
    s.data[10] = scale.z;
    Matrix4.multiply(t, ry, this);
    Matrix4.multiply(this, rx, this);
    Matrix4.multiply(this, rz, this);
    Matrix4.multiply(this, s, this);
    return this;
  }

  /**
   * Sets the matrix to a translation matrix.
   * @param v The translation vector.
   * @param out The output matrix.
   */
  public static translate(v: Vector3D, out: Matrix4): void {
    out.identity();
    out.data[12] = v.x;
    out.data[13] = v.y;
    out.data[14] = v.z;
  }

  /**
   * Sets the matrix to a uniform scale matrix.
   * @param s The scale factor.
   * @param out The output matrix.
   */
  public static scale(s: number, out: Matrix4): void {
    out.identity();
    out.data[0] = s;
    out.data[5] = s;
    out.data[10] = s;
  }

  /**
   * Sets the matrix to a rotation matrix around the X-axis.
   * @param r The rotation angle in radians.
   * @param out The output matrix.
   */
  public static rotateX(r: number, out: Matrix4): void {
    const s: number = Math.sin(r);
    const c: number = Math.cos(r);
    out.identity();
    out.data[5] = c;
    out.data[6] = s;
    out.data[9] = -s;
    out.data[10] = c;
  }

  /**
   * Sets the matrix to a rotation matrix around the Y-axis.
   * @param r The rotation angle in radians.
   * @param out The output matrix.
   */
  public static rotateY(r: number, out: Matrix4): void {
    const s: number = Math.sin(r);
    const c: number = Math.cos(r);
    out.identity();
    out.data[0] = c;
    out.data[2] = -s;
    out.data[8] = s;
    out.data[10] = c;
  }

  /**
   * Sets the matrix to a rotation matrix around the Z-axis.
   * @param r The rotation angle in radians.
   * @param out The output matrix.
   */
  public static rotateZ(r: number, out: Matrix4): void {
    const s: number = Math.sin(r);
    const c: number = Math.cos(r);
    out.identity();
    out.data[0] = c;
    out.data[1] = s;
    out.data[4] = -s;
    out.data[5] = c;
  }

  /**
   * Multiplies two matrices and stores the result in out.
   * @param a The first matrix.
   * @param b The second matrix.
   * @param out The output matrix.
   */
  public static multiply(a: Matrix4, b: Matrix4, out: Matrix4): void {
    const ae: Float32Array = a.data;
    const be: Float32Array = b.data;
    const te: Float32Array = out.data;

    const a00: number = ae[0] ?? 0;
    const a01: number = ae[1] ?? 0;
    const a02: number = ae[2] ?? 0;
    const a03: number = ae[3] ?? 0;

    const a10: number = ae[4] ?? 0;
    const a11: number = ae[5] ?? 0;
    const a12: number = ae[6] ?? 0;
    const a13: number = ae[7] ?? 0;

    const a20: number = ae[8] ?? 0;
    const a21: number = ae[9] ?? 0;
    const a22: number = ae[10] ?? 0;
    const a23: number = ae[11] ?? 0;

    const a30: number = ae[12] ?? 0;
    const a31: number = ae[13] ?? 0;
    const a32: number = ae[14] ?? 0;
    const a33: number = ae[15] ?? 0;

    const b00: number = be[0] ?? 0;
    const b01: number = be[1] ?? 0;
    const b02: number = be[2] ?? 0;
    const b03: number = be[3] ?? 0;

    const b10: number = be[4] ?? 0;
    const b11: number = be[5] ?? 0;
    const b12: number = be[6] ?? 0;
    const b13: number = be[7] ?? 0;

    const b20: number = be[8] ?? 0;
    const b21: number = be[9] ?? 0;
    const b22: number = be[10] ?? 0;
    const b23: number = be[11] ?? 0;

    const b30: number = be[12] ?? 0;
    const b31: number = be[13] ?? 0;
    const b32: number = be[14] ?? 0;
    const b33: number = be[15] ?? 0;

    te[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    te[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    te[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    te[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;

    te[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    te[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    te[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    te[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;

    te[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    te[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    te[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    te[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;

    te[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    te[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    te[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    te[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
  }

  /**
   * Sets the matrix to a perspective projection matrix.
   * @param fov Field of view in radians.
   * @param aspect Aspect ratio.
   * @param near Near plane.
   * @param far Far plane.
   * @param out The output matrix.
   */
  public static perspective(
    fov: number,
    aspect: number,
    near: number,
    far: number,
    out: Matrix4,
  ): void {
    const f: number = 1.0 / Math.tan(fov / 2);
    const d: Float32Array = out.data;
    d.fill(0);
    d[0] = f / aspect;
    d[5] = f;
    d[10] = far / (near - far);
    d[11] = -1;
    d[14] = (near * far) / (near - far);
  }

  /**
   * Sets the matrix to an orthographic projection matrix.
   * @param l Left.
   * @param r Right.
   * @param b Bottom.
   * @param t Top.
   * @param n Near.
   * @param f Far.
   * @param out The output matrix.
   */
  public static orthographic(
    l: number,
    r: number,
    b: number,
    t: number,
    n: number,
    f: number,
    out: Matrix4,
  ): void {
    const d: Float32Array = out.data;
    d.fill(0);
    d[0] = 2 / (r - l);
    d[5] = 2 / (t - b);
    d[10] = 1 / (n - f);
    d[12] = -(r + l) / (r - l);
    d[13] = -(t + b) / (t - b);
    d[14] = n / (n - f);
    d[15] = 1;
  }

  /**
   * Sets the matrix to a look-at matrix.
   * @param eye Camera position.
   * @param target Target position.
   * @param up Up vector.
   * @param out The output matrix.
   */
  public static lookAt(eye: Vector3D, target: Vector3D, up: Vector3D, out: Matrix4): void {
    const d: Float32Array = out.data;
    const z: Vector3D = eye.clone().sub(target);
    const zL: number = z.length();
    if (0 < zL) {
      z.scale(1 / zL);
    }

    const x: Vector3D = new Vector3D(
      up.y * z.z - up.z * z.y,
      up.z * z.x - up.x * z.z,
      up.x * z.y - up.y * z.x,
    );
    const xL: number = x.length();
    if (0 < xL) {
      x.scale(1 / xL);
    }

    const y: Vector3D = new Vector3D(
      z.y * x.z - z.z * x.y,
      z.z * x.x - z.x * x.z,
      z.x * x.y - z.y * x.x,
    );

    d[0] = x.x;
    d[4] = x.y;
    d[8] = x.z;
    d[12] = -x.dot(eye);
    d[1] = y.x;
    d[5] = y.y;
    d[9] = y.z;
    d[13] = -y.dot(eye);
    d[2] = z.x;
    d[6] = z.y;
    d[10] = z.z;
    d[14] = -z.dot(eye);
    d[15] = 1;
  }

  /**
   * Transforms a vector with this matrix.
   * @param v The vector to transform.
   * @returns The transformed vector.
   */
  public transformVector(v: Vector3D): Vector3D {
    const d: Float32Array = this.data;
    const x: number = v.x;
    const y: number = v.y;
    const z: number = v.z;

    v.x = (d[0] ?? 0) * x + (d[4] ?? 0) * y + (d[8] ?? 0) * z + (d[12] ?? 0);
    v.y = (d[1] ?? 0) * x + (d[5] ?? 0) * y + (d[9] ?? 0) * z + (d[13] ?? 0);
    v.z = (d[2] ?? 0) * x + (d[6] ?? 0) * y + (d[10] ?? 0) * z + (d[14] ?? 0);

    return v;
  }

  /**
   * Inverts this matrix and stores the result in out.
   * @param out The output matrix.
   * @returns Whether the inversion was successful.
   */
  public invert(out: Matrix4): boolean {
    const d: Float32Array = this.data;
    const te: Float32Array = out.data;

    const n11: number = d[0]!,
      n12: number = d[4]!,
      n13: number = d[8]!,
      n14: number = d[12]!;
    const n21: number = d[1]!,
      n22: number = d[5]!,
      n23: number = d[9]!,
      n24: number = d[13]!;
    const n31: number = d[2]!,
      n32: number = d[6]!,
      n33: number = d[10]!,
      n34: number = d[14]!;
    const n41: number = d[3]!,
      n42: number = d[7]!,
      n43: number = d[11]!,
      n44: number = d[15]!;

    const t11: number =
      n23 * n34 * n42 -
      n24 * n33 * n42 +
      n24 * n32 * n43 -
      n22 * n34 * n43 -
      n23 * n32 * n44 +
      n22 * n33 * n44;
    const t12: number =
      n14 * n33 * n42 -
      n13 * n34 * n42 -
      n14 * n32 * n43 +
      n12 * n34 * n43 +
      n13 * n32 * n44 -
      n12 * n33 * n44;
    const t13: number =
      n13 * n24 * n42 -
      n14 * n23 * n42 +
      n14 * n22 * n43 -
      n12 * n24 * n43 -
      n13 * n22 * n44 +
      n12 * n23 * n44;
    const t14: number =
      n14 * n23 * n32 -
      n13 * n24 * n32 -
      n14 * n22 * n33 +
      n12 * n24 * n33 +
      n13 * n22 * n34 -
      n12 * n23 * n34;

    const det: number = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

    if (det === 0) {
      return false;
    }

    const invDet: number = 1 / det;

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

    te[8] = t13 * invDet;
    te[9] =
      (n14 * n23 * n41 -
        n13 * n24 * n41 -
        n14 * n21 * n43 +
        n11 * n24 * n43 +
        n13 * n21 * n44 -
        n11 * n23 * n44) *
      invDet;
    te[10] =
      (n12 * n24 * n41 -
        n14 * n22 * n41 +
        n14 * n21 * n42 -
        n11 * n24 * n42 -
        n12 * n21 * n44 +
        n11 * n22 * n44) *
      invDet;
    te[11] =
      (n13 * n22 * n41 -
        n12 * n23 * n41 -
        n13 * n21 * n42 +
        n11 * n23 * n42 +
        n12 * n21 * n43 -
        n11 * n22 * n43) *
      invDet;

    te[12] = t14 * invDet;
    te[13] =
      (n13 * n24 * n31 -
        n14 * n23 * n31 +
        n14 * n21 * n33 -
        n11 * n24 * n33 -
        n13 * n21 * n34 +
        n11 * n23 * n34) *
      invDet;
    te[14] =
      (n14 * n22 * n31 -
        n12 * n24 * n31 -
        n14 * n21 * n32 +
        n11 * n24 * n32 +
        n12 * n21 * n34 -
        n11 * n22 * n34) *
      invDet;
    te[15] =
      (n12 * n23 * n31 -
        n13 * n22 * n31 +
        n13 * n21 * n32 -
        n11 * n23 * n32 -
        n12 * n21 * n33 +
        n11 * n22 * n33) *
      invDet;

    return true;
  }
}
