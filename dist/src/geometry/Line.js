export class Line {
    start;
    end;
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    getGeometryData() {
        return {
            vertices: new Float32Array([
                this.start.x,
                this.start.y,
                this.start.z,
                this.end.x,
                this.end.y,
                this.end.z,
            ]),
            indices: new Uint16Array([0, 1]),
        };
    }
}
//# sourceMappingURL=Line.js.map