export class Cube {
    size;
    constructor(size = 1) {
        this.size = size;
    }
    getPrimitiveData() {
        const halfSize = this.size / 2;
        const vertices = new Float32Array([
            -halfSize, -halfSize, halfSize, halfSize, -halfSize, halfSize,
            halfSize, halfSize, halfSize, -halfSize, halfSize, halfSize,
            -halfSize, -halfSize, -halfSize, halfSize, -halfSize, -halfSize,
            halfSize, halfSize, -halfSize, -halfSize, halfSize, -halfSize
        ]);
        const indices = new Uint16Array([
            0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7
        ]);
        return { vertices, indices };
    }
}
//# sourceMappingURL=Cube.js.map