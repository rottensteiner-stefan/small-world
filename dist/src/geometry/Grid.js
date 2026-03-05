import { ObjectGeometry } from "./ObjectGeometry.js";
export class Grid extends ObjectGeometry {
    size;
    divisions;
    constructor(size = 20, divisions = 20) {
        super();
        this.size = size;
        this.divisions = divisions;
        this.generateGeometryData();
    }
    generateGeometryData() {
        const v = [];
        const i = [];
        const step = this.size / this.divisions;
        const half = this.size / 2;
        let index = 0;
        for (let j = 0; j <= this.divisions; j++) {
            const pos = j * step - half;
            v.push(pos, 0, -half, pos, 0, half);
            i.push(index, index + 1);
            index += 2;
            v.push(-half, 0, pos, half, 0, pos);
            i.push(index, index + 1);
            index += 2;
        }
        this.vertices = new Float32Array(v);
        this.indices = new Uint16Array(i);
    }
}
//# sourceMappingURL=Grid.js.map