import { Scene } from '../core/index.js';
import { Vector3D } from '../math/index.js';
import { TerrainMaterial } from '../core/materials/index.js';
type TerrainAlgorithm = "DiamondSquare" | "Perlin" | "Simplex";
interface TerrainManagerConfig {
    chunkSize?: number;
    meshSegments?: number;
    heightmapDetail?: number;
    heightmapRoughness?: number;
    maxHeight?: number;
    gridSize?: number;
    material?: TerrainMaterial;
    algorithm?: TerrainAlgorithm;
}
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
    constructor(scene: Scene, config?: TerrainManagerConfig);
    init(): Promise<void>;
    update(focusPoint: Vector3D): Promise<void>;
    private _rebuildGrid;
    private _generateChunk;
    private _generateChunkObject;
    private _getChunkKey;
}
export {};
