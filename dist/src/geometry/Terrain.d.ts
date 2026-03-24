import { AbstractGeometry } from './AbstractGeometry.js';
export type TerrainHeightStrategy = (r: number, g: number, b: number, a: number) => number;
export declare const TerrainStrategies: {
    readonly CENTERED_AVERAGE: (r: number, g: number, b: number, a: number) => number;
    readonly BASE_RED: (r: number, g: number, b: number, a: number) => number;
    readonly BASE_GREEN: (r: number, g: number, b: number, a: number) => number;
    readonly BASE_BLUE: (r: number, g: number, b: number, a: number) => number;
    readonly BASE_ALPHA: (r: number, g: number, b: number, a: number) => number;
    readonly INVERTED_AVERAGE: (r: number, g: number, b: number, a: number) => number;
};
export declare class Terrain extends AbstractGeometry {
    heightData: Float32Array;
    heightmapResolution: number;
    width: number;
    depth: number;
    maxHeight: number;
    meshWidthSegments: number;
    meshDepthSegments: number;
    /**
     * Protected Konstruktor. Bitte verwende Terrain.fromHeightData() oder Terrain.fromImage().
     */
    protected constructor(heightData: Float32Array, heightmapResolution: number, width: number, depth: number, maxHeight: number, meshWidthSegments: number, meshDepthSegments: number);
    /**
     * Erstellt ein Terrain aus rohen Höhendaten (Float32Array).
     * Die Werte im Array sollten idealerweise zwischen 0.0 und 1.0 liegen.
     */
    static fromHeightData(heightData: Float32Array, heightmapResolution: number, width?: number, depth?: number, maxHeight?: number, meshWidthSegments?: number, meshDepthSegments?: number): Terrain;
    /**
     * Erstellt ein Terrain aus einem Bild (ImageBitmap oder HTMLImageElement).
     * Konvertiert das Bild in ein Float32Array basierend auf der angegebenen Strategie.
     */
    static fromImage(image: HTMLImageElement | ImageBitmap, width?: number, depth?: number, maxHeight?: number, meshWidthSegments?: number, meshDepthSegments?: number, strategy?: TerrainHeightStrategy): Terrain;
    protected generateGeometryData(): void;
}
