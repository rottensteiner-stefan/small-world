/// src/geometry/TerrainManager.ts
import { Scene } from "../core/index.js";
import { Object3D, Texture } from "../core/index.js";
import { Vector3D } from "../math/index.js";
import { HeightmapGenerator, TextureGenerator } from "../utils/index.js";
import { Terrain } from "./Terrain.js";
import { TerrainMaterial } from "../core/materials/index.js";

type TerrainAlgorithm = "DiamondSquare" | "Perlin" | "Simplex";

interface TerrainManagerConfig {
  chunkSize?: number; // Weltgröße eines Chunks (z.B. 80x80)
  meshSegments?: number; // Auflösung des Meshes pro Chunk (z.B. 64x64)
  heightmapDetail?: number; // Detail für Diamond-Square (z.B. 7 -> 129x129 Heightmap)
  heightmapRoughness?: number; // Zerklüftung der Heightmap
  maxHeight?: number; // Maximale Höhe des Terrains
  gridSize?: number; // Anzahl der Chunks in einer Reihe/Spalte (z.B. 3 für 3x3)
  material?: TerrainMaterial; // Optional: Vorgefertigtes Material
  algorithm?: TerrainAlgorithm; // Welcher Algorithmus?
}

export class TerrainManager {
  private _scene: Scene;
  private readonly _chunkSize: number;
  private readonly _meshSegments: number;
  private readonly _heightmapDetail: number;
  private readonly _heightmapRoughness: number;
  private readonly _maxHeight: number;
  private readonly _gridSize: number;
  private readonly _halfGrid: number;
  private readonly _algorithm: TerrainAlgorithm;

  private _chunks = new Map<string, Object3D>();
  private _currentGridX: number = 0;
  private _currentGridZ: number = 0;

  private readonly _terrainMaterial: TerrainMaterial;

  constructor(scene: Scene, config: TerrainManagerConfig = {}) {
    this._scene = scene;
    this._chunkSize = config.chunkSize ?? 80;
    this._meshSegments = config.meshSegments ?? 64;
    this._heightmapDetail = config.heightmapDetail ?? 7;
    this._heightmapRoughness = config.heightmapRoughness ?? 0.55;
    this._maxHeight = config.maxHeight ?? 6.0;
    this._gridSize = config.gridSize ?? 3;
    this._halfGrid = Math.floor(this._gridSize / 2);
    this._algorithm = config.algorithm ?? "Perlin"; // Perlin ist jetzt Standard für Infinite Terrain

    this._terrainMaterial = config.material || new TerrainMaterial();
  }

  public async init(): Promise<void> {
    if (!this._terrainMaterial.sandMap) {
      this._terrainMaterial.sandMap = Texture.fromImage(await TextureGenerator.createSand());
    }
    if (!this._terrainMaterial.grassMap) {
      this._terrainMaterial.grassMap = Texture.fromImage(await TextureGenerator.createGrass());
    }
    if (!this._terrainMaterial.rockMap) {
      this._terrainMaterial.rockMap = Texture.fromImage(await TextureGenerator.createRock());
    }
    if (!this._terrainMaterial.snowMap) {
      this._terrainMaterial.snowMap = Texture.fromImage(await TextureGenerator.createSnow());
    }
    this._terrainMaterial.texRepeat = [this._chunkSize / 4, this._chunkSize / 4];
    this._terrainMaterial.thresholds = [-2.0, 0.0, 2.0, 1.0];

    for (let z = -this._halfGrid; z <= this._halfGrid; z++) {
      for (let x = -this._halfGrid; x <= this._halfGrid; x++) {
        await this._generateChunk(x, z);
      }
    }
  }

  public async update(focusPoint: Vector3D): Promise<void> {
    const newGridX = Math.floor(focusPoint.x / this._chunkSize);
    const newGridZ = Math.floor(focusPoint.z / this._chunkSize);

    if (newGridX !== this._currentGridX || newGridZ !== this._currentGridZ) {
      this._currentGridX = newGridX;
      this._currentGridZ = newGridZ;
      await this._rebuildGrid();
    }
  }

  private async _rebuildGrid(): Promise<void> {
    const newChunks = new Map<string, Object3D>();
    const chunksToRemove = new Set(this._chunks.keys());

    for (let z = -this._halfGrid; z <= this._halfGrid; z++) {
      for (let x = -this._halfGrid; x <= this._halfGrid; x++) {
        const gridX = this._currentGridX + x;
        const gridZ = this._currentGridZ + z;
        const key = this._getChunkKey(gridX, gridZ);

        if (this._chunks.has(key)) {
          newChunks.set(key, this._chunks.get(key)!);
          chunksToRemove.delete(key);
        } else {
          const chunk = await this._generateChunkObject(gridX, gridZ);
          newChunks.set(key, chunk);
          this._scene.add(chunk);
        }
      }
    }

    for (const key of chunksToRemove) {
      const chunk = this._chunks.get(key);
      if (chunk) {
        this._scene.remove(chunk);
      }
    }
    this._chunks = newChunks;
  }

  private async _generateChunk(gridX: number, gridZ: number): Promise<void> {
    const key = this._getChunkKey(gridX, gridZ);
    if (this._chunks.has(key)) return;

    const chunk = await this._generateChunkObject(gridX, gridZ);
    this._scene.add(chunk);
    this._chunks.set(key, chunk);
  }

  private async _generateChunkObject(gridX: number, gridZ: number): Promise<Object3D> {
    const key = this._getChunkKey(gridX, gridZ);
    const heightmapResolution = Math.pow(2, this._heightmapDetail) + 1;

    let heightmapData: Float32Array;

    if (this._algorithm === "Perlin" || this._algorithm === "Simplex") {
      // Offset berechnen:
      // Wir wollen, dass die Pixel nahtlos weitergehen.
      // resolution-1 ist die Anzahl der Segmente.
      const pixelOffset = heightmapResolution - 1;
      const offsetX = gridX * pixelOffset;
      const offsetY = gridZ * pixelOffset;

      // Scale so wählen, dass es gut aussieht.
      // Da wir in Pixeln rechnen, müssen wir relativ klein skalieren.
      // z.B. 0.01 bedeutet, dass sich das Noise alle 100 Pixel wiederholt.
      const noiseScale = 0.015;

      if (this._algorithm === "Perlin") {
        heightmapData = await HeightmapGenerator.generatePerlinFloat(
          this._heightmapDetail,
          noiseScale,
          offsetX,
          offsetY,
          4, // Octaves
          0.5, // Persistence
        );
      } else {
        heightmapData = await HeightmapGenerator.generateSimplexFloat(
          this._heightmapDetail,
          noiseScale,
          offsetX,
          offsetY,
          4,
          0.5,
        );
      }
    } else {
      // Fallback zu Diamond-Square (nicht nahtlos)
      const seed = `${gridX},${gridZ}`;
      heightmapData = await HeightmapGenerator.generateDiamondSquareFloat(
        this._heightmapDetail,
        this._heightmapRoughness,
        seed,
      );
    }

    const terrainGeo = Terrain.fromHeightData(
      heightmapData,
      heightmapResolution,
      this._chunkSize,
      this._chunkSize,
      this._maxHeight,
      this._meshSegments,
      this._meshSegments,
    );

    const terrainObj = new Object3D(`TerrainChunk_${key}`);
    terrainObj.geometry = terrainGeo.getGeometryData();
    terrainObj.material = this._terrainMaterial;

    terrainObj.position.set(gridX * this._chunkSize, 0, gridZ * this._chunkSize);

    return terrainObj;
  }

  private _getChunkKey(gridX: number, gridZ: number): string {
    return `${gridX}_${gridZ}`;
  }
}
