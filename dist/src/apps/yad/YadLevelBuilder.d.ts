import { Scene } from '../../core/Scene.js';
import { Vector3D } from '../../math/index.js';
import { LavaMaterial } from '../../core/materials/index.js';
import { PointLight, Color, Texture } from '../../core/index.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
export type YadTileType = "wall" | "door" | "sprite" | "column" | "lavaBall" | "playerSpawn" | "floor";
export interface YadLegendEntry {
    type: YadTileType;
    /** Primary texture */
    texture?: Texture;
    /** Ceiling texture (for floor type) */
    ceilingTexture?: Texture;
    /** Add a point light? */
    lightColor?: Color;
    lightIntensity?: number;
    /** Sprite specific settings */
    spriteScale?: number;
    spriteY?: number;
    bobbing?: boolean;
    isEnemy?: boolean;
    isItem?: boolean;
    /** Wall/Door specific settings */
    doorSpeed?: number;
    doorSound?: string;
}
export type YadLegend = Record<string, YadLegendEntry>;
/**
 * Configuration for the YadLevelBuilder.
 */
export interface YadLevelConfig {
    /** The dictionary mapping characters to logic */
    legend: YadLegend;
    /** Texture for standard floors. */
    floorTexture?: Texture;
    /** Texture for ceilings. */
    ceilingTexture?: Texture;
    /** Noise map for lava animation. */
    lavaNoiseMap?: Texture;
    /** Normal map for lava. */
    lavaNormalMap?: Texture;
    /** Displacement map for lava. */
    lavaDisplacementMap?: Texture;
    /** Specular map for lava. */
    lavaSpecularMap?: Texture;
    /** Ambient map for lava. */
    lavaAmbientMap?: Texture;
    /** Set characters that should use lava material for the floor instead of the default floor */
    lavaFloorChars?: string[];
    /** Set characters that should be treated as slime floor */
    slimeFloorChars?: string[];
    /** The player camera (for proximity sensing on doors) */
    playerCamera?: CameraInterfaceData;
}
/**
 * Utility to build a 3D level from an ASCII grid string.
 * Each character represents a 2x2x2 meter block.
 */
export declare class YadLevelBuilder {
    private _gridSize;
    private _wallHeight;
    /**
     * Builds a level into the provided scene.
     * @param scene The scene to add objects to.
     * @param mapData The raw string map data.
     * @param config Texture and material configuration.
     * @returns An object with playerStart and created materials for animation.
     */
    build(scene: Scene, mapData: string, config: YadLevelConfig): Promise<{
        playerStart: Vector3D;
        lavaMaterials: LavaMaterial[];
        lavaLights: PointLight[];
    }>;
}
