import { Scene, TerrainMaterial } from '../core/index.js';
import { Vector3D } from '../math/index.js';
/**
 * Algorithm types for procedural terrain generation.
 */
export type TerrainAlgorithm = "DiamondSquare" | "Perlin" | "Simplex";
/**
 * Configuration for the TerrainManager.
 */
export interface TerrainManagerConfig {
    /** Size of a single terrain chunk in world units. Defaults to 80. */
    chunkSize?: number;
    /** Resolution of the mesh subdivisions per chunk. Defaults to 64. */
    meshSegments?: number;
    /** Detail level for the heightmap (2^n + 1). Defaults to 7 (129x129). */
    heightmapDetail?: number;
    /** Roughness factor for the DiamondSquare algorithm. Defaults to 0.55. */
    heightmapRoughness?: number;
    /** Maximum height of the terrain. Defaults to 6.0. */
    maxHeight?: number;
    /** Number of chunks in the active grid (edge length). Defaults to 3 (3x3). */
    gridSize?: number;
    /** Material to use for all terrain chunks. */
    material?: TerrainMaterial;
    /** Generation algorithm to use. Defaults to "Perlin". */
    algorithm?: TerrainAlgorithm;
    /** Callback triggered when chunks are added or removed. */
    onRebuild?: () => void;
}
/**
 * Manages dynamic loading and unloading of terrain chunks to create an "infinite" terrain feel.
 * Chunks are loaded around a specific focus point (usually the player).
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
    private readonly _onRebuild;
    private _chunks;
    private _currentGridX;
    private _currentGridZ;
    private readonly _terrainMaterial;
    /**
     * Creates a new TerrainManager.
     * @param scene The scene where chunks will be added/removed.
     * @param config The manager configuration.
     */
    constructor(scene: Scene, config?: TerrainManagerConfig);
    /**
     * Initializes the manager and generates the initial grid of chunks.
     * Also ensures default biome textures are loaded if missing.
     */
    init(): Promise<void>;
    /**
     * Updates the terrain grid based on a focus point (e.g. player position).
     * Triggers rebuilding of the grid if the focus point moves to a new chunk.
     * @param focusPoint The current focus position.
     */
    update(focusPoint: Vector3D): Promise<void>;
    /**
     * Rebuilds the grid by calculating which chunks should be visible.
     * Reuses existing chunks and removes ones that are too far away.
     * @private
     */
    private _rebuildGrid;
    /**
     * Internal helper to generate and add a single chunk.
     */
    private _generateChunk;
    /**
     * Generates a single chunk Object3D including geometry.
     */
    private _generateChunkObject;
    /**
     * Generates a unique key for a chunk coordinate.
     */
    private _getChunkKey;
}
