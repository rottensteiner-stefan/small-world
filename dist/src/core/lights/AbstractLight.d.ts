import { Color } from '../colors/Color.js';
import { LightType } from '../../enums/LightType.js';
import { Object3D } from '../Object3D.js';
export declare abstract class AbstractLight extends Object3D {
    color: Color;
    intensity: number;
    abstract readonly type: LightType;
    protected constructor(color: Color | undefined, intensity: number, name?: string);
}
