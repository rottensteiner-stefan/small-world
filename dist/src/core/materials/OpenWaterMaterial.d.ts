import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
export interface OpenWaterMaterialOptions {
    waterColor?: Color;
    deepWaterColor?: Color;
    edgeColor?: Color;
    edgeSoftness?: number;
    speed?: number;
    wave1?: [number, number, number, number];
    wave2?: [number, number, number, number];
    wave3?: [number, number, number, number];
}
export declare class OpenWaterMaterial extends AbstractMaterial {
    color: Color;
    deepWaterColor: Color;
    edgeColor: Color;
    edgeSoftness: number;
    speed: number;
    wave1: [number, number, number, number];
    wave2: [number, number, number, number];
    wave3: [number, number, number, number];
    time: number;
    constructor(options?: OpenWaterMaterialOptions);
    getRenderManifest(): RenderManifest;
    getShaderDefinition(): ShaderDefinition;
}
