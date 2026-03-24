import { Camera } from '../../Camera.js';
import { CameraStrategyInterface } from '../../../interfaces/CameraStrategyInterface.js';
import { Vector3D } from '../../../math/Vector3D.js';
export declare class SmoothStrategy implements CameraStrategyInterface {
    readonly type: "SmoothCamera";
    radius: number;
    lerpFactor: number;
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}
