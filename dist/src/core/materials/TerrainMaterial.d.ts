import { AbstractMaterial } from './AbstractMaterial.js';
import { Texture } from '../textures/Texture.js';
export declare class TerrainMaterial extends AbstractMaterial {
    readonly type: "TerrainMaterial";
    shininess: number;
    sandMap: Texture | null;
    grassMap: Texture | null;
    rockMap: Texture | null;
    snowMap: Texture | null;
    texRepeat: [number, number];
    thresholds: [number, number, number, number];
}
