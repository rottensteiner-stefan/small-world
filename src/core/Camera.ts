/// src/core/Camera.ts
import {AbstractProjection, PerspectiveProjection} from "../math/index.js";
import {CameraStrategyFactory} from "./cameras/CameraStrategyFactory.js";
import {CameraStrategyType} from "../enums/index.js";
import {ICamera} from "../interfaces/ICamera.js";
import {ICameraStrategy} from "../interfaces/index.js";
import {Matrix4} from "../math/Matrix4.js";
import {Vector3D} from "../math/Vector3D.js";

export class Camera implements ICamera {
    public position: Vector3D = new Vector3D(0, 10, 20);
    public target: Vector3D = new Vector3D(0, 0, 0);
    public up: Vector3D = new Vector3D(0, 1, 0);

    public theta = 0;
    public phi = 0.6;

    private strategy!: ICameraStrategy;

    private viewMatrix = new Matrix4();
    private viewProjMatrix = new Matrix4();

    constructor(public projection: AbstractProjection) {
        this.setStrategy(CameraStrategyType.SMOOTH);
    }

    public get viewProjectionMatrix(): Float32Array {
        return this.viewProjMatrix.data;
    }

    public get aspect(): number {
        if (this.projection instanceof PerspectiveProjection) return this.projection.aspect;
        return 1;
    }

    public set aspect(value: number) {
        if (this.projection instanceof PerspectiveProjection) {
            this.projection.aspect = value;
        }
    }

    public updateProjectionMatrix(): void {
        this.projection.update();
    }

    public updateViewMatrix(): void {
        Matrix4.lookAt(this.position, this.target, this.up, this.viewMatrix);
        Matrix4.multiply(this.projection.getMatrix(), this.viewMatrix, this.viewProjMatrix);
    }

    public setStrategy(type: CameraStrategyType): void {
        this.strategy = CameraStrategyFactory.get(type);
    }

    public get activeStrategyType(): string {
        return this.strategy.type;
    }

    public update(targetPos: Vector3D, dx: number, dy: number): void {
        this.strategy.update(this, targetPos, dx, dy);
    }
}
