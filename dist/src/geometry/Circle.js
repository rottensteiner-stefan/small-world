import { ObjectGeometry } from "./ObjectGeometry.js";
export class Circle extends ObjectGeometry {
    radius;
    segments;
    constructor(radius = 1, segments = 32) {
        super();
        this.radius = radius;
        this.segments = segments;
        this.generateGeometryData();
    }
    generateGeometryData() {
        const v = [], uv = [], i = [];
        for (let n = 0; n < this.segments; n++) {
            const theta = (n / this.segments) * Math.PI * 2;
            const cos = Math.cos(theta), sin = Math.sin(theta);
            v.push(cos * this.radius, 0, sin * this.radius);
            uv.push(0.5 + cos * 0.5, 0.5 + sin * 0.5);
            i.push(n, (n + 1) % this.segments);
        }
        this.vertices = new Float32Array(v);
        this.uvs = new Float32Array(uv);
        this.indices = new Uint16Array(i);
    }
}
//# sourceMappingURL=Circle.js.map