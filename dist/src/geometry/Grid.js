export class Grid {
    size;
    divisions;
    constructor(size = 20, divisions = 20) {
        this.size = size;
        this.divisions = divisions;
    }
    getPrimitiveData() {
        const v = [];
        const i = [];
        const step = this.size / this.divisions;
        const half = this.size / 2;
        let index = 0;
        for (let j = 0; j <= this.divisions; j++) {
            const pos = j * step - half;
            // Linie entlang Z (vertikal auf der Ebene)
            v.push(pos, 0, -half, pos, 0, half);
            i.push(index, index + 1);
            index += 2;
            // Linie entlang X (horizontal auf der Ebene)
            v.push(-half, 0, pos, half, 0, pos);
            i.push(index, index + 1);
            index += 2;
        }
        return {
            vertices: new Float32Array(v),
            indices: new Uint16Array(i),
        };
    }
}
//# sourceMappingURL=Grid.js.map