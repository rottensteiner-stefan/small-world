import { Camera } from '../../Camera.js';
import { CameraStrategyInterface } from '../../../interfaces/CameraStrategyInterface.js';
import { Vector3D } from '../../../math/Vector3D.js';
export declare class FPSStrategy implements CameraStrategyInterface {
    readonly type: "FPSCamera";
    heightOffset: number;
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}
