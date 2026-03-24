import { AbstractMaterial } from './index.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
export declare class PhongMaterial extends AbstractMaterial {
    readonly type: "PhongMaterial";
    specularColor: Color;
    shininess: number;
    diffuseMap: Texture | null;
}
