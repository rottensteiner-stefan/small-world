import { Scene } from '../../core/Scene.js';
import { Vector3D } from '../../math/index.js';
import { LavaMaterial } from '../../core/materials/index.js';
import { PointLight, Texture } from '../../core/index.js';
/**
 * Configuration for the YadLevelBuilder.
 */
export interface YadLevelConfig {
    /** Texture for standard walls. */
    wallTexture?: Texture;
    /** Texture for standard floors. */
    floorTexture?: Texture;
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
    /** Texture for barrel sprites. */
    barrelTexture?: Texture;
    /** Texture for torch sprites. */
    torchTexture?: Texture;
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
