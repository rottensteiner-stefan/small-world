import { Color } from '../colors/Color.js';
import { AbstractLight } from './AbstractLight.js';
export declare class AreaLight extends AbstractLight {
    width: number;
    height: number;
    readonly type: "AreaLight";
    constructor(color?: Color, intensity?: number, width?: number, // Breite der Leuchtfläche
    height?: number);
}
