/// src/geometry/TerrainManager.ts
import { Object3D, TerrainMaterial, Texture } from "../core/index.js";
import { HeightmapGenerator, TextureGenerator } from "../utils/index.js";
import { Terrain } from "./Terrain.js";
/**
 * Manages dynamic loading and unloading of terrain chunks to create an "infinite" terrain feel.
 * Chunks are loaded around a specific focus point (usually the player).
 */
export class TerrainManager {
    _scene;
    _chunkSize;
    _meshSegments;
    _heightmapDetail;
    _heightmapRoughness;
    _maxHeight;
    _gridSize;
    _halfGrid;
    _algorithm;
    _onRebuild;
    _chunks = new Map();
    _currentGridX = 0;
    _currentGridZ = 0;
    _terrainMaterial;
    /**
     * Creates a new TerrainManager.
     * @param scene The scene where chunks will be added/removed.
     * @param config The manager configuration.
     */
    constructor(scene, config = {}) {
        this._scene = scene;
        this._chunkSize = config.chunkSize ?? 80;
        this._meshSegments = config.meshSegments ?? 64;
        this._heightmapDetail = config.heightmapDetail ?? 7;
        this._heightmapRoughness = config.heightmapRoughness ?? 0.55;
        this._maxHeight = config.maxHeight ?? 6.0;
        this._gridSize = config.gridSize ?? 3;
        this._halfGrid = Math.floor(this._gridSize / 2);
        this._algorithm = config.algorithm ?? "Perlin";
        this._onRebuild = config.onRebuild;
        this._terrainMaterial = config.material ?? new TerrainMaterial();
    }
    /**
     * Initializes the manager and generates the initial grid of chunks.
     * Also ensures default biome textures are loaded if missing.
     */
    async init() {
        if (undefined === this._terrainMaterial.sandMap) {
            this._terrainMaterial.sandMap = Texture.fromImage(await TextureGenerator.createSand());
        }
        if (undefined === this._terrainMaterial.grassMap) {
            this._terrainMaterial.grassMap = Texture.fromImage(await TextureGenerator.createGrass());
        }
        if (undefined === this._terrainMaterial.rockMap) {
            this._terrainMaterial.rockMap = Texture.fromImage(await TextureGenerator.createRock());
        }
        if (undefined === this._terrainMaterial.snowMap) {
            this._terrainMaterial.snowMap = Texture.fromImage(await TextureGenerator.createSnow());
        }
        this._terrainMaterial.texRepeat = [this._chunkSize / 4.0, this._chunkSize / 4.0];
        this._terrainMaterial.thresholds = [-2.0, 0.0, 2.0, 1.0];
        for (let z = -this._halfGrid; z <= this._halfGrid; z++) {
            for (let x = -this._halfGrid; x <= this._halfGrid; x++) {
                await this._generateChunk(x, z);
            }
        }
        this._onRebuild?.();
    }
    /**
     * Updates the terrain grid based on a focus point (e.g. player position).
     * Triggers rebuilding of the grid if the focus point moves to a new chunk.
     * @param focusPoint The current focus position.
     */
    async update(focusPoint) {
        const newGridX = Math.floor(focusPoint.x / this._chunkSize);
        const newGridZ = Math.floor(focusPoint.z / this._chunkSize);
        if (this._currentGridX !== newGridX || this._currentGridZ !== newGridZ) {
            this._currentGridX = newGridX;
            this._currentGridZ = newGridZ;
            await this._rebuildGrid();
        }
    }
    /**
     * Rebuilds the grid by calculating which chunks should be visible.
     * Reuses existing chunks and removes ones that are too far away.
     * @private
     */
    async _rebuildGrid() {
        const newChunks = new Map();
        const chunksToRemove = new Set(this._chunks.keys());
        let changed = false;
        for (let z = -this._halfGrid; z <= this._halfGrid; z++) {
            for (let x = -this._halfGrid; x <= this._halfGrid; x++) {
                const gridX = this._currentGridX + x;
                const gridZ = this._currentGridZ + z;
                const key = this._getChunkKey(gridX, gridZ);
                const existingChunk = this._chunks.get(key);
                if (undefined !== existingChunk) {
                    newChunks.set(key, existingChunk);
                    chunksToRemove.delete(key);
                }
                else {
                    const chunk = await this._generateChunkObject(gridX, gridZ);
                    newChunks.set(key, chunk);
                    this._scene.add(chunk);
                    changed = true;
                }
            }
        }
        for (const key of chunksToRemove) {
            const chunk = this._chunks.get(key);
            if (undefined !== chunk) {
                this._scene.remove(chunk);
                changed = true;
            }
        }
        this._chunks = newChunks;
        if (changed) {
            this._onRebuild?.();
        }
    }
    /**
     * Internal helper to generate and add a single chunk.
     */
    async _generateChunk(gridX, gridZ) {
        const key = this._getChunkKey(gridX, gridZ);
        if (this._chunks.has(key)) {
            return;
        }
        const chunk = await this._generateChunkObject(gridX, gridZ);
        this._scene.add(chunk);
        this._chunks.set(key, chunk);
    }
    /**
     * Generates a single chunk Object3D including geometry.
     */
    async _generateChunkObject(gridX, gridZ) {
        const key = this._getChunkKey(gridX, gridZ);
        const heightmapResolution = Math.pow(2, this._heightmapDetail) + 1;
        let heightmapData;
        if ("Perlin" === this._algorithm || "Simplex" === this._algorithm) {
            const pixelOffset = heightmapResolution - 1;
            const offsetX = gridX * pixelOffset;
            const offsetY = gridZ * pixelOffset;
            const noiseScale = 0.015;
            if ("Perlin" === this._algorithm) {
                heightmapData = await HeightmapGenerator.generatePerlinFloat(this._heightmapDetail, noiseScale, offsetX, offsetY, 4, 0.5);
            }
            else {
                heightmapData = await HeightmapGenerator.generateSimplexFloat(this._heightmapDetail, noiseScale, offsetX, offsetY, 4, 0.5);
            }
        }
        else {
            const seed = `${gridX},${gridZ}`;
            heightmapData = await HeightmapGenerator.generateDiamondSquareFloat(this._heightmapDetail, this._heightmapRoughness, seed);
        }
        const terrainGeo = Terrain.fromHeightData({
            heightData: heightmapData,
            heightmapResolution,
            width: this._chunkSize,
            depth: this._chunkSize,
            maxHeight: this._maxHeight,
            meshWidthSegments: this._meshSegments,
            meshDepthSegments: this._meshSegments,
        });
        const terrainObj = new Object3D(`TerrainChunk_${key}`);
        terrainObj.geometry = terrainGeo.getGeometryData();
        terrainObj.material = this._terrainMaterial;
        terrainObj.isStatic = true; // Optimization: Terrain does not move
        terrainObj.position.set(gridX * this._chunkSize, 0, gridZ * this._chunkSize);
        return terrainObj;
    }
    /**
     * Generates a unique key for a chunk coordinate.
     */
    _getChunkKey(gridX, gridZ) {
        return `${gridX}_${gridZ}`;
    }
}
//# sourceMappingURL=TerrainManager.js.map