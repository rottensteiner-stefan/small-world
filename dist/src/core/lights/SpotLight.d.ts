import { Color } from '../colors/Color.js';
import { AbstractLight } from './AbstractLight.js';
import { Vector3D } from '../../math/Vector3D.js';
export declare class SpotLight extends AbstractLight {
    distance: number;
    angle: number;
    penumbra: number;
    decay: number;
    readonly type: "SpotLight";
    direction: Vector3D;
    constructor(color?: Color, intensity?: number, distance?: number, angle?: number, // 30 Grad Kegel
    penumbra?: number, // 0 = harte Kante, 1 = extrem weich
    decay?: number);
}
