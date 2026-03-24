import { CameraStrategyType } from '../../enums/CameraStrategyType.js';
import { CameraStrategyInterface } from '../../interfaces/CameraStrategyInterface.js';
export declare class CameraStrategyFactory {
    private static strategies;
    static get(type: CameraStrategyType): CameraStrategyInterface;
}
