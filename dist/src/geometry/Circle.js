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
        const v = [];
        const i = [];
        for (let n = 0; n < this.segments; n++) {
            const theta = (n / this.segments) * Math.PI * 2;
            v.push(Math.cos(theta) * this.radius, 0, Math.sin(theta) * this.radius);
            i.push(n, (n + 1) % this.segments);
        }
        this.vertices = new Float32Array(v);
        this.indices = new Uint16Array(i);
    }
}
//# sourceMappingURL=Circle.js.map