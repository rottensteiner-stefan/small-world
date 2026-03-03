export class Triangle {
    constructor(public p1:[number,number,number], public p2:[number,number,number], public p3:[number,number,number]) {}
    getPrimitiveData() {
        return { vertices: new Float32Array([...this.p1, ...this.p2, ...this.p3]), indices: new Uint16Array([0, 1, 1, 2, 2, 0]) };
    }
}
