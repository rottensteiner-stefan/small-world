/// src/core/Camera.ts

import {AbstractProjection, PerspectiveProjection} from "../math/index.js";
import {CameraEffectFactory, CameraStrategyFactory} from "./cameras/index.js";
import {CameraEffectType, CameraStrategyType} from "../enums/index.js";
import {CameraConstraints, CameraEffect, CameraInterfaceData, CameraStrategy,} from "../interfaces/index.js";
import {Matrix4} from "../math/Matrix4.js";
import {Vector3D} from "../math/Vector3D.js";

/**
 * Standard implementation of the CameraInterfaceData.
 */
export class Camera implements CameraInterfaceData {
    /** @inheritdoc */
    public position: Vector3D = new Vector3D(0, 10, 20);
    /** @inheritdoc */
    public target: Vector3D = new Vector3D(0, 0, 0);
    /** @inheritdoc */
    public up: Vector3D = new Vector3D(0, 1, 0);

    /** @inheritdoc */
    public theta: number = 0;
    /** @inheritdoc */
    public phi: number = 0.6;

    private _strategy!: CameraStrategy;

    private _effects: CameraEffect[] = [];

    private _viewMatrix: Matrix4 = new Matrix4();
    private _viewProjMatrix: Matrix4 = new Matrix4();

    /**
     * Creates a new Camera.
     * @param projection The projection to use.
     */
    constructor(public projection: AbstractProjection) {
        this.setStrategy(CameraStrategyType.SMOOTH);
    }

    /** @inheritdoc */
    public get viewProjectionMatrix(): Float32Array {
        return this._viewProjMatrix.data;
    }

    /** @inheritdoc */
    public get aspect(): number {
        if (this.projection instanceof PerspectiveProjection) {
            return this.projection.aspect;
        }
        return 1;
    }

    /** @inheritdoc */
    public set aspect(value: number) {
        if (this.projection instanceof PerspectiveProjection) {
            this.projection.aspect = value;
        }
    }

    /** @inheritdoc */
    public updateProjectionMatrix(): void {
        this.projection.update();
    }

    /** @inheritdoc */
    public updateViewMatrix(): void {
        const finalPos = this.position.clone();
        const finalTarget = this.target.clone();

        for (const effect of this._effects) {
            finalPos.add(effect.offset);
            finalTarget.add(effect.targetOffset);
        }

        Matrix4.lookAt(finalPos, finalTarget, this.up, this._viewMatrix);
        Matrix4.multiply(this.projection.getMatrix(), this._viewMatrix, this._viewProjMatrix);
    }

    /** @inheritdoc */
    public get strategy(): CameraStrategy {
        return this._strategy;
    }

    /** @inheritdoc */
    public setStrategy(type: CameraStrategyType): void {
        const oldConstraints: CameraConstraints | undefined = this._strategy?.constraints;
        this._strategy = CameraStrategyFactory.get(type);
        if (undefined !== oldConstraints) {
            this._strategy.constraints = oldConstraints;
        }
    }

    /** @inheritdoc */
    public setConstraints(constraints?: CameraConstraints): void {
        this._strategy.constraints = constraints;
    }

    /** @inheritdoc */
    public get activeStrategyType(): string {
        return this._strategy.type;
    }

    /** @inheritdoc */
    public update(targetPos: Vector3D, dx: number, dy: number, deltaTime: number = 0.016): void {
        this._strategy.update(this, targetPos, dx, dy);

        // Update effects
        for (let i: number = this._effects.length - 1; 0 <= i; i--) {
            const effect: CameraEffect = this._effects[i]!;
            effect.update(deltaTime);
            if (effect.isFinished) {
                this._effects.splice(i, 1);
            }
        }
    }

    /**
     * Adds a new effect to the camera.
     * @param effect The effect to add.
     */
    public addEffect(effect: CameraEffect): void {
        this._effects.push(effect);
    }

    /**
     * Creates and adds a new effect by type.
     * @param type The type of effect.
     * @param intensity The intensity.
     * @param duration The duration in seconds.
     */
    public applyEffect(type: CameraEffectType, intensity?: number, duration?: number): void {
        this.addEffect(CameraEffectFactory.create(type, intensity, duration));
    }
}
