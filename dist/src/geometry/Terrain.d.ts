import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Strategy for extracting height from color data.
 */
export type TerrainHeightStrategy = (r: number, g: number, b: number, a: number, maxHeight?: number) => number;
/**
 * Built-in terrain height strategies.
 */
export declare const TerrainStrategies: {
    readonly CENTERED_AVERAGE: (r: number, g: number, b: number, _a: number) => number;
    readonly BASE_RED: (r: number, _g: number, _b: number, _a: number) => number;
    readonly BASE_GREEN: (_r: number, g: number, _b: number, _a: number) => number;
    readonly BASE_BLUE: (_r: number, _g: number, b: number, _a: number) => number;
    readonly BASE_ALPHA: (_r: number, _g: number, _b: number, a: number) => number;
    readonly INVERTED_AVERAGE: (r: number, g: number, b: number, _a: number) => number;
};
/**
 * Configuration options for terrain geometry.
 */
export interface TerrainOptions {
    /** The width of the terrain. Defaults to 100. */
    width?: number;
    /** The depth of the terrain. Defaults to 100. */
    depth?: number;
    /** The maximum height of the terrain. Defaults to 20. */
    maxHeight?: number;
    /** The number of segments along the width for the mesh. Defaults to 64. */
    meshWidthSegments?: number;
    /** The number of segments along the depth for the mesh. Defaults to 64. */
    meshDepthSegments?: number;
}
/**
 * Configuration for terrain from raw data.
 */
export interface TerrainDataOptions extends TerrainOptions {
    /** The height data (normalized 0-1). */
    heightData: Float32Array;
    /** The resolution of the heightmap. */
    heightmapResolution: number;
}
/**
 * Configuration for terrain from an image.
 */
export interface TerrainImageOptions extends TerrainOptions {
    /** The image to use as heightmap. */
    image: HTMLImageElement | ImageBitmap;
    /** The strategy to extract height from image data. Defaults to CENTERED_AVERAGE. */
    strategy?: TerrainHeightStrategy;
}
/**
 * A terrain geometry generated from height data.
 */
export declare class Terrain extends AbstractGeometry {
    /** The height data. */
    heightData: Float32Array;
    /** The resolution of the heightmap. */
    heightmapResolution: number;
    /** The width of the terrain. */
    width: number;
    /** The depth of the terrain. */
    depth: number;
    /** The maximum height of the terrain. */
    maxHeight: number;
    /** The number of segments along the width. */
    meshWidthSegments: number;
    /** The number of segments along the depth. */
    meshDepthSegments: number;
    /**
     * Protected constructor. Use Terrain.fromHeightData() or Terrain.fromImage() instead.
     * @param options The configuration options.
     */
    protected constructor(options: TerrainDataOptions);
    /**
     * Creates a Terrain from raw height data.
     * @param options The configuration options.
     * @returns A new Terrain instance.
     */
    static fromHeightData(options: TerrainDataOptions): Terrain;
    /**
     * Creates a Terrain from an image.
     * @param options The configuration options.
     * @returns A promise resolving to a new Terrain instance.
     */
    static fromImage(options: TerrainImageOptions): Promise<Terrain>;
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
