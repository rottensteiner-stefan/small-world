import { AbstractProjection } from '../math/index.js';
import { CameraStrategyType } from '../enums/index.js';
import { CameraInterface } from '../interfaces/CameraInterface.js';
import { Vector3D } from '../math/Vector3D.js';
export declare class Camera implements CameraInterface {
    projection: AbstractProjection;
    position: Vector3D;
    target: Vector3D;
    up: Vector3D;
    theta: number;
    phi: number;
    private _strategy;
    private _viewMatrix;
    private _viewProjMatrix;
    constructor(projection: AbstractProjection);
    get viewProjectionMatrix(): Float32Array;
    get aspect(): number;
    set aspect(value: number);
    updateProjectionMatrix(): void;
    updateViewMatrix(): void;
    setStrategy(type: CameraStrategyType): void;
    get activeStrategyType(): string;
    update(targetPos: Vector3D, dx: number, dy: number): void;
}
