import { AbstractLight } from './AbstractLight.js';
import { Color } from '../colors/Color.js';
export declare class PointLight extends AbstractLight {
    distance: number;
    decay: number;
    readonly type: "PointLight";
    constructor(color?: Color, intensity?: number, distance?: number, decay?: number);
}
