import { Color } from '../colors/index.js';
import { MaterialType } from '../../enums/index.js';
export declare abstract class AbstractMaterial {
    abstract readonly type: MaterialType;
    uuid: string;
    color: Color;
}
