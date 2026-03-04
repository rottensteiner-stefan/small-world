import { Vector3D } from "../math/Vector3D.js";
export class Sphere {
    radius;
    widthSegments;
    heightSegments;
    constructor(radius = 1, widthSegments = 16, heightSegments = 12) {
        this.radius = radius;
        this.widthSegments = widthSegments;
        this.heightSegments = heightSegments;
    }
    getPrimitiveData() {
        const vertices = [];
        const indices = [];
        for (let y = 0; y <= this.heightSegments; y++) {
            const v = y / this.heightSegments;
            const phi = v * Math.PI;
            for (let x = 0; x <= this.widthSegments; x++) {
                const u = x / this.widthSegments;
                const theta = u * Math.PI * 2;
                const pos = new Vector3D(-(this.radius * Math.sin(phi) * Math.cos(theta)), this.radius * Math.cos(phi), this.radius * Math.sin(phi) * Math.sin(theta));
                vertices.push(pos.x, pos.y, pos.z);
            }
        }
        for (let y = 0; y < this.heightSegments; y++) {
            for (let x = 0; x < this.widthSegments; x++) {
                const first = y * (this.widthSegments + 1) + x;
                const second = first + this.widthSegments + 1;
                indices.push(first, second, first, first + 1);
            }
        }
        return {
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices),
        };
    }
}
//# sourceMappingURL=Sphere.js.map