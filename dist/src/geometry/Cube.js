export class Cube {
    size;
    constructor(size = 1) {
        this.size = size;
    }
    getGeometryData() {
        const half = this.size / 2;
        return {
            vertices: new Float32Array([
                -half,
                -half,
                half,
                half,
                -half,
                half,
                half,
                half,
                half,
                -half,
                half,
                half,
                -half,
                -half,
                -half,
                half,
                -half,
                -half,
                half,
                half,
                -half,
                -half,
                half,
                -half,
            ]),
            indices: new Uint16Array([
                0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
            ]),
        };
    }
}
//# sourceMappingURL=Cube.js.map