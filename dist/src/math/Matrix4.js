import { Vector3D } from "./Vector3D.js";
export class Matrix4 {
    data = new Float32Array(16);
    constructor() {
        this.identity();
    }
    identity() {
        const d = this.data;
        d.fill(0);
        d[0] = 1;
        d[5] = 1;
        d[10] = 1;
        d[15] = 1;
        return this;
    }
    /**
     * Erzeugt eine Translationsmatrix basierend auf einem Vector3D.
     */
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
        const a00 = ae[0], a01 = ae[1], a02 = ae[2], a03 = ae[3], a10 = ae[4], a11 = ae[5], a12 = ae[6], a13 = ae[7], a20 = ae[8], a21 = ae[9], a22 = ae[10], a23 = ae[11], a30 = ae[12], a31 = ae[13], a32 = ae[14], a33 = ae[15];
        for (let i = 0; i < 4; i++) {
            const b0 = be[i * 4], b1 = be[i * 4 + 1], b2 = be[i * 4 + 2], b3 = be[i * 4 + 3];
            te[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
            te[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
            te[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
            te[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        }
    }
    transformVector(v) {
        const d = this.data;
        const x = v.x, y = v.y, z = v.z;
        v.x = d[0] * x + d[4] * y + d[8] * z + d[12];
        v.y = d[1] * x + d[5] * y + d[9] * z + d[13];
        v.z = d[2] * x + d[6] * y + d[10] * z + d[14];
        return v;
    }
    static perspective(fov, aspect, near, far, out) {
        const f = 1.0 / Math.tan(fov / 2), rInv = 1.0 / (near - far);
        const d = out.data;
        d.fill(0);
        d[0] = f / aspect;
        d[5] = f;
        d[10] = (near + far) * rInv;
        d[11] = -1;
        d[14] = 2 * near * far * rInv;
    }
    static orthographic(l, r, b, t, n, f, out) {
        const d = out.data;
        d.fill(0);
        d[0] = 2 / (r - l);
        d[5] = 2 / (t - b);
        d[10] = -2 / (f - n);
        d[12] = -(r + l) / (r - l);
        d[13] = -(t + b) / (t - b);
        d[14] = -(f + n) / (f - n);
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
}
//# sourceMappingURL=Matrix4.js.map