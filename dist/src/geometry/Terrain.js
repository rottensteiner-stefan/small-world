/// src/geometry/Terrain.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
/**
 * Built-in terrain height strategies.
 */
export const TerrainStrategies = {
    /** Average of RGB components normalized. */
    CENTERED_AVERAGE: (r, g, b, _a) => {
        return (r + g + b) / 3.0 / 255.0;
    },
    /** Use only red channel. */
    BASE_RED: (r, _g, _b, _a) => {
        return r / 255.0;
    },
    /** Use only green channel. */
    BASE_GREEN: (_r, g, _b, _a) => {
        return g / 255.0;
    },
    /** Use only blue channel. */
    BASE_BLUE: (_r, _g, b, _a) => {
        return b / 255.0;
    },
    /** Use only alpha channel. */
    BASE_ALPHA: (_r, _g, _b, a) => {
        return a / 255.0;
    },
    /** Inverted average of RGB components. */
    INVERTED_AVERAGE: (r, g, b, _a) => {
        return 1.0 - (r + g + b) / 3.0 / 255.0;
    },
};
/**
 * A terrain geometry generated from heightmaps.
 * Supports initialization from raw data or images.
 */
export class Terrain extends AbstractGeometry {
    /** The raw height data (0.0 to 1.0). */
    heightData;
    /** The resolution of the heightmap grid. */
    heightmapResolution;
    /** The world width of the terrain. */
    width;
    /** The world depth of the terrain. */
    depth;
    /** The world maximum height. */
    maxHeight;
    /** The horizontal mesh subdivisions. */
    meshWidthSegments;
    /** The vertical mesh subdivisions. */
    meshDepthSegments;
    /**
     * Protected constructor. Use static factory methods Terrain.fromHeightData() or Terrain.fromImage().
     * @param options The configuration options.
     */
    constructor(options) {
        super();
        const { heightData, heightmapResolution, width = 100, depth = 100, maxHeight = 20, meshWidthSegments = 64, meshDepthSegments = 64, } = options;
        this.heightData = heightData;
        this.heightmapResolution = heightmapResolution;
        this.width = width;
        this.depth = depth;
        this.maxHeight = maxHeight;
        this.meshWidthSegments = meshWidthSegments;
        this.meshDepthSegments = meshDepthSegments;
        if (heightmapResolution * heightmapResolution !== heightData.length) {
            console.warn(`[Terrain] Heightmap data length (${heightData.length}) does not match resolution (${heightmapResolution}x${heightmapResolution}).`);
        }
        this.generateGeometryData();
    }
    /**
     * Creates a Terrain instance from raw height data.
     * @param options The configuration options.
     * @returns A new Terrain instance.
     */
    static fromHeightData(options) {
        return new Terrain(options);
    }
    /**
     * Creates a Terrain instance from an image.
     * @param options The configuration options.
     * @returns A promise resolving to a new Terrain instance.
     */
    static async fromImage(options) {
        const { image, strategy = TerrainStrategies.CENTERED_AVERAGE, maxHeight = 20 } = options;
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const resolution = image.width; // Assume square
        const heightData = new Float32Array(resolution * resolution);
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const index = (y * resolution + x) * 4;
                const r = imgData[index] ?? 0;
                const g = imgData[index + 1] ?? 0;
                const b = imgData[index + 2] ?? 0;
                const a = imgData[index + 3] ?? 0;
                const normalizedHeight = strategy(r, g, b, a, maxHeight);
                heightData[y * resolution + x] = Math.max(0, Math.min(1, normalizedHeight));
            }
        }
        return new Terrain({
            ...options,
            heightData,
            heightmapResolution: resolution,
        });
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        const hW = this.width / 2.0;
        const hD = this.depth / 2.0;
        for (let z = 0; z <= this.meshDepthSegments; z++) {
            const vRatio = z / this.meshDepthSegments;
            for (let x = 0; x <= this.meshWidthSegments; x++) {
                const uRatio = x / this.meshWidthSegments;
                const pixelX = Math.floor(uRatio * (this.heightmapResolution - 1));
                const pixelY = Math.floor(vRatio * (this.heightmapResolution - 1));
                const heightDataIndex = pixelY * this.heightmapResolution + pixelX;
                const heightValue = this.heightData[heightDataIndex] ?? 0;
                const posX = uRatio * this.width - hW;
                const posZ = vRatio * this.depth - hD;
                // Centered around Y=0
                const posY = heightValue * this.maxHeight - this.maxHeight / 2.0;
                v.push(posX, posY, posZ);
                uv.push(uRatio, 1.0 - vRatio);
            }
        }
        for (let z = 0; z < this.meshDepthSegments; z++) {
            for (let x = 0; x < this.meshWidthSegments; x++) {
                const a = x + (this.meshWidthSegments + 1) * z;
                const b = x + (this.meshWidthSegments + 1) * (z + 1);
                const c = x + 1 + (this.meshWidthSegments + 1) * (z + 1);
                const d = x + 1 + (this.meshWidthSegments + 1) * z;
                idx.push(a, b, d);
                idx.push(b, c, d);
            }
        }
        this._vertices = new Float32Array(v);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Terrain.js.map