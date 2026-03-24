import { AbstractLight } from './AbstractLight.js';
import { Color } from '../colors/Color.js';
import { Vector3D } from '../../math/Vector3D.js';
export declare class DirectionalLight extends AbstractLight {
    readonly type: "DirectionalLight";
    intensity: number;
    direction: Vector3D;
    constructor(color?: Color, intensity?: number);
}
