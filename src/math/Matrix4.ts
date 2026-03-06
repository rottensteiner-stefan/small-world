import { Vector3D } from "./Vector3D.js";

export class Matrix4 {
  public data = new Float32Array(16);

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

  // --- Die Matrix-Methoden für die Hierarchie (Object3D) ---
  public compose(pos: Vector3D, rot: Vector3D, scale: Vector3D): this {
    this.identity();
    const te = this.data;

    const sx = Math.sin(rot.x),
      cx = Math.cos(rot.x);
    const sy = Math.sin(rot.y),
      cy = Math.cos(rot.y);
    const sz = Math.sin(rot.z),
      cz = Math.cos(rot.z);

    te[0] = (cy * cz + sy * sx * sz) * scale.x;
    te[1] = cx * sz * scale.x;
    te[2] = (-sy * cz + cy * sx * sz) * scale.x;

    te[4] = (-cy * sz + sy * sx * cz) * scale.y;
    te[5] = cx * cz * scale.y;
    te[6] = (sy * sz + cy * sx * cz) * scale.y;

    te[8] = sy * cx * scale.z;
    te[9] = -sx * scale.z;
    te[10] = cy * cx * scale.z;

    te[12] = pos.x;
    te[13] = pos.y;
    te[14] = pos.z;
    te[15] = 1;
    return this;
  }

  // --- Die statischen Helfer für ObjectGeometry.ts ---
  public static translate(v: Vector3D, out: Matrix4): void {
    out.identity();
    out.data[12] = v.x;
    out.data[13] = v.y;
    out.data[14] = v.z;
  }

  public static scale(s: number, out: Matrix4): void {
    out.identity();
    out.data[0] = s;
    out.data[5] = s;
    out.data[10] = s;
  }

  public static rotateX(r: number, out: Matrix4): void {
    const s = Math.sin(r),
      c = Math.cos(r);
    out.identity();
    out.data[5] = c;
    out.data[6] = s;
    out.data[9] = -s;
    out.data[10] = c;
  }

  public static rotateY(r: number, out: Matrix4): void {
    const s = Math.sin(r),
      c = Math.cos(r);
    out.identity();
    out.data[0] = c;
    out.data[2] = -s;
    out.data[8] = s;
    out.data[10] = c;
  }

  public static rotateZ(r: number, out: Matrix4): void {
    const s = Math.sin(r),
      c = Math.cos(r);
    out.identity();
    out.data[0] = c;
    out.data[1] = s;
    out.data[4] = -s;
    out.data[5] = c;
  }

  // --- Kern-Mathematik ---
  public static multiply(a: Matrix4, b: Matrix4, out: Matrix4): void {
    const ae = a.data,
      be = b.data,
      te = out.data;
    const b00 = be[0],
      b01 = be[1],
      b02 = be[2],
      b03 = be[3];
    const b10 = be[4],
      b11 = be[5],
      b12 = be[6],
      b13 = be[7];
    const b20 = be[8],
      b21 = be[9],
      b22 = be[10],
      b23 = be[11];
    const b30 = be[12],
      b31 = be[13],
      b32 = be[14],
      b33 = be[15];

    for (let i = 0; i < 4; i++) {
      const ai0 = ae[i],
        ai1 = ae[i + 4],
        ai2 = ae[i + 8],
        ai3 = ae[i + 12];
      te[i] = ai0 * b00 + ai1 * b10 + ai2 * b20 + ai3 * b30;
      te[i + 4] = ai0 * b01 + ai1 * b11 + ai2 * b21 + ai3 * b31;
      te[i + 8] = ai0 * b02 + ai1 * b12 + ai2 * b22 + ai3 * b32;
      te[i + 12] = ai0 * b03 + ai1 * b13 + ai2 * b23 + ai3 * b33;
    }
  }

  public static perspective(
    fov: number,
    aspect: number,
    near: number,
    far: number,
    out: Matrix4,
  ): void {
    const f = 1.0 / Math.tan(fov / 2);
    const d = out.data;
    d.fill(0);
    d[0] = f / aspect;
    d[5] = f;
    d[10] = far / (near - far);
    d[11] = -1;
    d[14] = (near * far) / (near - far);
  }

  public static orthographic(
    l: number,
    r: number,
    b: number,
    t: number,
    n: number,
    f: number,
    out: Matrix4,
  ): void {
    const d = out.data;
    d.fill(0);
    d[0] = 2 / (r - l);
    d[5] = 2 / (t - b);
    d[10] = 1 / (n - f);
    d[12] = -(r + l) / (r - l);
    d[13] = -(t + b) / (t - b);
    d[14] = n / (n - f);
    d[15] = 1;
  }

  public static lookAt(eye: Vector3D, target: Vector3D, up: Vector3D, out: Matrix4): void {
    const d = out.data;
    const z = eye.clone().sub(target);
    const zL = z.length();
    if (zL > 0) z.scale(1 / zL);
    const x = new Vector3D(
      up.y * z.z - up.z * z.y,
      up.z * z.x - up.x * z.z,
      up.x * z.y - up.y * z.x,
    );
    const xL = x.length();
    if (xL > 0) x.scale(1 / xL);
    const y = new Vector3D(z.y * x.z - z.z * x.y, z.z * x.x - z.x * x.z, z.x * x.y - z.y * x.x);
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

  public transformVector(v: Vector3D): Vector3D {
    const d = this.data;
    const x = v.x,
      y = v.y,
      z = v.z;
    v.x = d[0] * x + d[4] * y + d[8] * z + d[12];
    v.y = d[1] * x + d[5] * y + d[9] * z + d[13];
    v.z = d[2] * x + d[6] * y + d[10] * z + d[14];
    return v;
  }
}
