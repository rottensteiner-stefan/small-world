import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Strategy function type for extracting height from color data.
 */
export type TerrainHeightStrategy = (r: number, g: number, b: number, a: number, maxHeight?: number) => number;
/**
 * Built-in terrain height strategies.
 */
export declare const TerrainStrategies: {
    /** Average of RGB components normalized. */
    readonly CENTERED_AVERAGE: (r: number, g: number, b: number, _a: number) => number;
    /** Use only red channel. */
    readonly BASE_RED: (r: number, _g: number, _b: number, _a: number) => number;
    /** Use only green channel. */
    readonly BASE_GREEN: (_r: number, g: number, _b: number, _a: number) => number;
    /** Use only blue channel. */
    readonly BASE_BLUE: (_r: number, _g: number, b: number, _a: number) => number;
    /** Use only alpha channel. */
    readonly BASE_ALPHA: (_r: number, _g: number, _b: number, a: number) => number;
    /** Inverted average of RGB components. */
    readonly INVERTED_AVERAGE: (r: number, g: number, b: number, _a: number) => number;
};
/**
 * Common configuration options for terrain geometry.
 */
export interface TerrainOptions {
    /** The width of the terrain in world units. Defaults to 100. */
    width?: number;
    /** The depth of the terrain in world units. Defaults to 100. */
    depth?: number;
    /** The maximum height of the terrain. Defaults to 20. */
    maxHeight?: number;
    /** The number of segments along the width for the mesh. Defaults to 64. */
    meshWidthSegments?: number;
    /** The number of segments along the depth for the mesh. Defaults to 64. */
    meshDepthSegments?: number;
}
/**
 * Configuration for terrain initialized from raw float data.
 */
export interface TerrainDataOptions extends TerrainOptions {
    /** The height data (normalized 0-1). */
    heightData: Float32Array;
    /** The resolution of the heightmap grid. */
    heightmapResolution: number;
}
/**
 * Configuration for terrain initialized from an image.
 */
export interface TerrainImageOptions extends TerrainOptions {
    /** The image to use as a heightmap source. */
    image: HTMLImageElement | ImageBitmap;
    /** The strategy to extract height from image pixels. Defaults to CENTERED_AVERAGE. */
    strategy?: TerrainHeightStrategy;
}
/**
 * A terrain geometry generated from heightmaps.
 * Supports initialization from raw data or images.
 */
export declare class Terrain extends AbstractGeometry {
    /** The raw height data (0.0 to 1.0). */
    heightData: Float32Array;
    /** The resolution of the heightmap grid. */
    heightmapResolution: number;
    /** The world width of the terrain. */
    width: number;
    /** The world depth of the terrain. */
    depth: number;
    /** The world maximum height. */
    maxHeight: number;
    /** The horizontal mesh subdivisions. */
    meshWidthSegments: number;
    /** The vertical mesh subdivisions. */
    meshDepthSegments: number;
    /**
     * Protected constructor. Use static factory methods Terrain.fromHeightData() or Terrain.fromImage().
     * @param options The configuration options.
     */
    protected constructor(options: TerrainDataOptions);
    /**
     * Creates a Terrain instance from raw height data.
     * @param options The configuration options.
     * @returns A new Terrain instance.
     */
    static fromHeightData(options: TerrainDataOptions): Terrain;
    /**
     * Creates a Terrain instance from an image.
     * @param options The configuration options.
     * @returns A promise resolving to a new Terrain instance.
     */
    static fromImage(options: TerrainImageOptions): Promise<Terrain>;
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
