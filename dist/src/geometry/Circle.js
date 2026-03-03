export class Circle {
    r;
    s;
    constructor(r, s = 32) {
        this.r = r;
        this.s = s;
    }
    getPrimitiveData() {
        const v = [];
        const i = [];
        for (let s = 0; s < this.s; s++) {
            const rad = (s / this.s) * Math.PI * 2;
            v.push(Math.cos(rad) * this.r, 0, Math.sin(rad) * this.r);
            i.push(s, (s + 1) % this.s);
        }
        return { vertices: new Float32Array(v), indices: new Uint16Array(i) };
    }
}
//# sourceMappingURL=Circle.js.map