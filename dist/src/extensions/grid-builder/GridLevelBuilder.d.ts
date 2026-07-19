import { Object3D, Scene } from '../../core/index.js';
import { Vector3D } from '../../math/index.js';
import { AbstractMaterial } from '../../core/materials/index.js';
import { Texture } from '../../core/textures/index.js';
export type GridTileType = "block" | "floor" | "sprite" | "custom";
export interface GridLegendEntry {
    /** The type of tile to generate */
    type: GridTileType;
    /** Primary texture or material */
    texture?: Texture;
    material?: AbstractMaterial;
    /** Ceiling texture/material (for floor type) */
    ceilingTexture?: Texture;
    ceilingMaterial?: AbstractMaterial;
    /** Scale for block/sprite types */
    scale?: number | Vector3D;
    /** Custom Y offset for sprites/blocks */
    offsetY?: number;
    /** If true, the object will not be added to the static octree (e.g. for dynamic elements) */
    isDynamic?: boolean;
    /** Custom builder callback for total control */
    onBuild?: (x: number, y: number, worldX: number, worldZ: number, scene: Scene) => Object3D | void;
    /** If true, the floor and ceiling won't be generated for this tile */
    preventFloorCeiling?: boolean;
    /** Index for texture array (if the material uses one) */
    textureIndex?: number;
    /** Optional generic identification tag applied to the built floor object (e.g. for gameplay hazard checks) */
    tag?: string;
}
export type GridLegend = Record<string, GridLegendEntry>;
export interface GridLevelConfig {
    /** Map of ASCII characters to legend definitions */
    legend: GridLegend;
    /** Default material/texture for floor where no block is defined */
    defaultFloorMaterial?: AbstractMaterial;
    defaultFloorTexture?: Texture;
    /** Default material/texture for ceiling where no block is defined */
    defaultCeilingMaterial?: AbstractMaterial;
    defaultCeilingTexture?: Texture;
    /** Size of each grid cell in world units (default: 2.0) */
    gridSize?: number;
    /** Height of the walls/ceiling (default: 3.0) */
    wallHeight?: number;
}
/**
 * A generalized utility to build 3D levels from ASCII grids.
 */
export declare class GridLevelBuilder {
    /**
     * Builds a level into the provided scene.
     * @param scene The scene to add objects to.
     * @param mapData The raw ASCII string map.
     * @param config The configuration and legend for mapping characters to 3D.
     * @returns The world position of the first found "player" spawn or center of map.
     */
    build(scene: Scene, mapData: string, config: GridLevelConfig): Promise<Vector3D>;
}
