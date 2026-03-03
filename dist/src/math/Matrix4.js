export class Matrix4 {
    data = new Float32Array(16);
    constructor() { this.identity(); }
    identity() {
        const d = this.data;
        d.fill(0);
        d[0] = 1;
        d[5] = 1;
        d[10] = 1;
        d[15] = 1;
        return this;
    }
    static translate(x, y, z, out) {
        out.identity();
        out.data[12] = x;
        out.data[13] = y;
        out.data[14] = z;
    }
    static rotateY(r, out) {
        const s = Math.sin(r), c = Math.cos(r);
        out.identity();
        out.data[0] = c;
        out.data[2] = -s;
        out.data[8] = s;
        out.data[10] = c;
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
    static perspective(fov, aspect, near, far, out) {
        const f = 1.0 / Math.tan(fov / 2), rInv = 1.0 / (near - far);
        const d = out.data;
        d.fill(0);
        d[0] = f / aspect;
        d[5] = f;
        d[10] = (near + far) * rInv;
        d[11] = -1;
        d[14] = (2 * near * far) * rInv;
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
        const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
        const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        const norm = (a) => { const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; };
        const z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x);
        d[0] = x[0];
        d[4] = x[1];
        d[8] = x[2];
        d[12] = -dot(x, eye);
        d[1] = y[0];
        d[5] = y[1];
        d[9] = y[2];
        d[13] = -dot(y, eye);
        d[2] = z[0];
        d[6] = z[1];
        d[10] = z[2];
        d[14] = -dot(z, eye);
        d[15] = 1;
    }
}
//# sourceMappingURL=Matrix4.js.map