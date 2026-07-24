import { Scene } from '../../core/index.js';
import { Vector3D } from '../../math/index.js';
import { LavaMaterial } from '../../core/materials/index.js';
import { PointLight } from '../../core/lights/index.js';
import { Color } from '../../core/colors/index.js';
import { Texture } from '../../core/textures/index.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
import { AudioSystem } from '../../audio/index.js';
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
    itemType?: string;
    /** Wall/Door specific settings */
    doorSpeed?: number;
    doorSound?: string;
}
export type YadLegend = Record<string, YadLegendEntry>;
export interface YadLevelConfig {
    legend: YadLegend;
    floorTexture?: Texture;
    ceilingTexture?: Texture;
    lavaNoiseMap?: Texture;
    lavaNormalMap?: Texture;
    lavaDisplacementMap?: Texture;
    lavaSpecularMap?: Texture;
    lavaAmbientMap?: Texture;
    lavaFloorChars?: string[];
    slimeFloorChars?: string[];
    playerCamera?: CameraInterfaceData;
    audio?: AudioSystem | undefined;
}
/**
 * YadLevelBuilder now wraps the generic GridLevelBuilder.
 */
export declare class YadLevelBuilder {
    private _gridSize;
    private _wallHeight;
    build(scene: Scene, mapData: string, config: YadLevelConfig): Promise<{
        playerStart: Vector3D;
        lavaMaterials: LavaMaterial[];
        lavaLights: PointLight[];
    }>;
}
