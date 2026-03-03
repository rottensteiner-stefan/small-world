export class Triangle {
    p1;
    p2;
    p3;
    constructor(p1, p2, p3) {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
    }
    getPrimitiveData() {
        return {
            vertices: new Float32Array([...this.p1, ...this.p2, ...this.p3]),
            indices: new Uint16Array([0, 1, 1, 2, 2, 0]),
        };
    }
}
//# sourceMappingURL=Triangle.js.map