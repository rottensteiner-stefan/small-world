import { AbstractLight } from './AbstractLight.js';
import { Color } from '../colors/Color.js';
export declare class AmbientLight extends AbstractLight {
    readonly type: "AmbientLight";
    constructor(color?: Color, intensity?: number);
}
