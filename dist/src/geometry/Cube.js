/// src/geometry/Cube.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
/**
 * A box-shaped geometry with support for face subdivisions.
 */
export class Cube extends AbstractGeometry {
    /** The size of the cube edges. */
    size;
    /** Number of segments along the width. */
    widthSegments;
    /** Number of segments along the height. */
    heightSegments;
    /** Number of segments along the depth. */
    depthSegments;
    /**
     * Creates a new Cube geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { size = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1 } = options;
        this.size = size;
        this.widthSegments = widthSegments;
        this.heightSegments = heightSegments;
        this.depthSegments = depthSegments;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const vertices = [];
        const indices = [];
        const uvs = [];
        let vertexCount = 0;
        /**
         * Internal helper to build a single face plane of the cube.
         */
        const buildPlane = (u, v, w, udir, vdir, width, height, depth, gridX, gridY) => {
            const segmentWidth = width / gridX;
            const segmentHeight = height / gridY;
            const widthHalf = width / 2.0;
            const heightHalf = height / 2.0;
            const depthHalf = depth / 2.0;
            for (let iy = 0; iy <= gridY; iy++) {
                const y = iy * segmentHeight - heightHalf;
                for (let ix = 0; ix <= gridX; ix++) {
                    const x = ix * segmentWidth - widthHalf;
                    const vertex = { x: 0, y: 0, z: 0 };
                    vertex[u] = x * udir;
                    vertex[v] = y * vdir;
                    vertex[w] = depthHalf;
                    vertices.push(vertex.x, vertex.y, vertex.z);
                    uvs.push(ix / gridX, 1.0 - iy / gridY);
                    if (iy < gridY && ix < gridX) {
                        const a = vertexCount + ix + iy * (gridX + 1);
                        const b = vertexCount + ix + (iy + 1) * (gridX + 1);
                        const c = vertexCount + ix + 1 + (iy + 1) * (gridX + 1);
                        const d = vertexCount + ix + 1 + iy * (gridX + 1);
                        indices.push(a, b, d);
                        indices.push(b, c, d);
                    }
                }
            }
            vertexCount += (gridX + 1) * (gridY + 1);
        };
        // Build all 6 sides
        buildPlane("z", "y", "x", -1, -1, this.size, this.size, this.size, this.depthSegments, this.heightSegments); // Right
        buildPlane("z", "y", "x", 1, -1, this.size, this.size, -this.size, this.depthSegments, this.heightSegments); // Left
        buildPlane("x", "z", "y", 1, 1, this.size, this.size, this.size, this.widthSegments, this.depthSegments); // Top
        buildPlane("x", "z", "y", 1, -1, this.size, this.size, -this.size, this.widthSegments, this.depthSegments); // Bottom
        buildPlane("x", "y", "z", 1, -1, this.size, this.size, this.size, this.widthSegments, this.heightSegments); // Front
        buildPlane("x", "y", "z", -1, -1, this.size, this.size, -this.size, this.widthSegments, this.heightSegments); // Back
        this._vertices = new Float32Array(vertices);
        this._uvs = new Float32Array(uvs);
        this._indices = this._createIndexArray(indices.length);
        this._indices.set(indices);
        this.computeNormals();
    }
}
//# sourceMappingURL=Cube.js.map