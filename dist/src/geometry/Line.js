import { ObjectGeometry } from "./ObjectGeometry.js";
export class Line extends ObjectGeometry {
    start;
    end;
    constructor(start, end) {
        super();
        this.start = start;
        this.end = end;
        this.generateGeometryData();
    }
    generateGeometryData() {
        this.vertices = new Float32Array([this.start.x, this.start.y, this.start.z, this.end.x, this.end.y, this.end.z]);
        this.indices = new Uint16Array([0, 1]);
    }
}
//# sourceMappingURL=Line.js.map