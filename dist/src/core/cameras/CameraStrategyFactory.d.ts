import { CameraStrategyType } from '../../enums/index.js';
import { CameraStrategy } from '../../interfaces/index.js';
export declare class CameraStrategyFactory {
    private static _strategies;
    static get(type: CameraStrategyType): CameraStrategy;
}
