export class Plane {
    width;
    depth;
    widthSegments;
    depthSegments;
    constructor(width = 1, depth = 1, widthSegments = 1, depthSegments = 1) {
        this.width = width;
        this.depth = depth;
        this.widthSegments = widthSegments;
        this.depthSegments = depthSegments;
    }
    getGeometryData() {
        const vertices = [];
        const indices = [];
        const halfWidth = this.width / 2;
        const halfDepth = this.depth / 2;
        const segmentWidth = this.width / this.widthSegments;
        const segmentDepth = this.depth / this.depthSegments;
        for (let z = 0; z <= this.depthSegments; z++) {
            for (let x = 0; x <= this.widthSegments; x++) {
                vertices.push(x * segmentWidth - halfWidth, 0, z * segmentDepth - halfDepth);
            }
        }
        for (let z = 0; z <= this.depthSegments; z++) {
            for (let x = 0; x <= this.widthSegments; x++) {
                const current = z * (this.widthSegments + 1) + x;
                if (x < this.widthSegments)
                    indices.push(current, current + 1);
                if (z < this.depthSegments)
                    indices.push(current, current + (this.widthSegments + 1));
            }
        }
        return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
    }
}
//# sourceMappingURL=Plane.js.map