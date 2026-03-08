import { Vector3D } from "./Vector3D.js";
export class Matrix4 {
    data = new Float32Array(16);
    constructor() { this.identity(); }
    identity() {
        this.data.fill(0);
        this.data[0] = 1;
        this.data[5] = 1;
        this.data[10] = 1;
        this.data[15] = 1;
        return this;
    }
    compose(pos, rot, scale) {
        const t = new Matrix4();
        Matrix4.translate(pos, t);
        const rx = new Matrix4();
        Matrix4.rotateX(rot.x, rx);
        const ry = new Matrix4();
        Matrix4.rotateY(rot.y, ry);
        const rz = new Matrix4();
        Matrix4.rotateZ(rot.z, rz);
        const s = new Matrix4();
        s.data[0] = scale.x;
        s.data[5] = scale.y;
        s.data[10] = scale.z;
        Matrix4.multiply(t, ry, this);
        Matrix4.multiply(this, rx, this);
        Matrix4.multiply(this, rz, this);
        Matrix4.multiply(this, s, this);
        return this;
    }
    static translate(v, out) {
        out.identity();
        out.data[12] = v.x;
        out.data[13] = v.y;
        out.data[14] = v.z;
    }
    static scale(s, out) {
        out.identity();
        out.data[0] = s;
        out.data[5] = s;
        out.data[10] = s;
    }
    static rotateX(r, out) {
        const s = Math.sin(r), c = Math.cos(r);
        out.identity();
        out.data[5] = c;
        out.data[6] = s;
        out.data[9] = -s;
        out.data[10] = c;
    }
    static rotateY(r, out) {
        const s = Math.sin(r), c = Math.cos(r);
        out.identity();
        out.data[0] = c;
        out.data[2] = -s;
        out.data[8] = s;
        out.data[10] = c;
    }
    static rotateZ(r, out) {
        const s = Math.sin(r), c = Math.cos(r);
        out.identity();
        out.data[0] = c;
        out.data[1] = s;
        out.data[4] = -s;
        out.data[5] = c;
    }
    static multiply(a, b, out) {
        const ae = a.data, be = b.data, te = out.data;
        const a00 = ae[0], a01 = ae[1], a02 = ae[2], a03 = ae[3];
        const a10 = ae[4], a11 = ae[5], a12 = ae[6], a13 = ae[7];
        const a20 = ae[8], a21 = ae[9], a22 = ae[10], a23 = ae[11];
        const a30 = ae[12], a31 = ae[13], a32 = ae[14], a33 = ae[15];
        const b00 = be[0], b01 = be[1], b02 = be[2], b03 = be[3];
        const b10 = be[4], b11 = be[5], b12 = be[6], b13 = be[7];
        const b20 = be[8], b21 = be[9], b22 = be[10], b23 = be[11];
        const b30 = be[12], b31 = be[13], b32 = be[14], b33 = be[15];
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
    static perspective(fov, aspect, near, far, out) {
        const f = 1.0 / Math.tan(fov / 2);
        const d = out.data;
        d.fill(0);
        d[0] = f / aspect;
        d[5] = f;
        d[10] = far / (near - far);
        d[11] = -1;
        d[14] = (near * far) / (near - far);
    }
    static orthographic(l, r, b, t, n, f, out) {
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
    static lookAt(eye, target, up, out) {
        const d = out.data;
        const z = eye.clone().sub(target);
        const zL = z.length();
        if (zL > 0)
            z.scale(1 / zL);
        const x = new Vector3D(up.y * z.z - up.z * z.y, up.z * z.x - up.x * z.z, up.x * z.y - up.y * z.x);
        const xL = x.length();
        if (xL > 0)
            x.scale(1 / xL);
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
    transformVector(v) {
        const d = this.data;
        const x = v.x, y = v.y, z = v.z;
        v.x = d[0] * x + d[4] * y + d[8] * z + d[12];
        v.y = d[1] * x + d[5] * y + d[9] * z + d[13];
        v.z = d[2] * x + d[6] * y + d[10] * z + d[14];
        return v;
    }
}
//# sourceMappingURL=Matrix4.js.map