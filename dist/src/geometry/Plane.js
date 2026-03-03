export class Plane {
    w;
    h;
    s;
    constructor(w, h, s) {
        this.w = w;
        this.h = h;
        this.s = s;
    }
    getPrimitiveData() { const v = [], i = []; for (let y = 0; y <= this.s; y++)
        for (let x = 0; x <= this.s; x++)
            v.push(x * (this.w / this.s) - this.w / 2, 0, y * (this.h / this.s) - this.h / 2); for (let y = 0; y <= this.s; y++)
        for (let x = 0; x < this.s; x++) {
            const s = y * (this.s + 1) + x;
            i.push(s, s + 1);
        } for (let x = 0; x <= this.s; x++)
        for (let y = 0; y < this.s; y++) {
            const s = y * (this.s + 1) + x;
            i.push(s, s + (this.s + 1));
        } return { vertices: new Float32Array(v), indices: new Uint16Array(i) }; }
}
//# sourceMappingURL=Plane.js.map