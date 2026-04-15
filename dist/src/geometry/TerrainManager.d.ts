import { Scene, TerrainMaterial } from '../core/index.js';
import { Vector3D } from '../math/index.js';
/**
 * Algorithm for terrain generation.
 */
export type TerrainAlgorithm = "DiamondSquare" | "Perlin" | "Simplex";
/**
 * Configuration for the TerrainManager.
 */
export interface TerrainManagerConfig {
    /** Size of a single chunk in world units. */
    chunkSize?: number;
    /** Resolution of the mesh per chunk. */
    meshSegments?: number;
    /** Detail level for the heightmap (e.g., 7 -> 129x129). */
    heightmapDetail?: number;
    /** Roughness factor for the heightmap generation. */
    heightmapRoughness?: number;
    /** Maximum height of the terrain. */
    maxHeight?: number;
    /** Number of chunks in a row/column of the grid. */
    gridSize?: number;
    /** Material to use for the terrain chunks. */
    material?: TerrainMaterial;
    /** Generation algorithm to use. */
    algorithm?: TerrainAlgorithm;
}
/**
 * Manages dynamic loading and unloading of terrain chunks (infinite terrain).
 */
export declare class TerrainManager {
    private _scene;
    private readonly _chunkSize;
    private readonly _meshSegments;
    private readonly _heightmapDetail;
    private readonly _heightmapRoughness;
    private readonly _maxHeight;
    private readonly _gridSize;
    private readonly _halfGrid;
    private readonly _algorithm;
    private _chunks;
    private _currentGridX;
    private _currentGridZ;
    private readonly _terrainMaterial;
    /**
     * Creates a new TerrainManager.
     * @param scene The scene to add terrain chunks to.
     * @param config The manager configuration.
     */
    constructor(scene: Scene, config?: TerrainManagerConfig);
    /**
     * Initializes the manager and generates the initial grid of chunks.
     */
    init(): Promise<void>;
    /**
     * Updates the terrain grid based on a focus point (usually the player's position).
     * @param focusPoint The current focus position.
     */
    update(focusPoint: Vector3D): Promise<void>;
    private _rebuildGrid;
    private _generateChunk;
    private _generateChunkObject;
    private _getChunkKey;
}
