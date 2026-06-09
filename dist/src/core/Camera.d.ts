import { AbstractProjection } from '../math/index.js';
import { CameraEffectType, CameraStrategyType } from '../enums/index.js';
import { CameraConstraints, CameraEffect, CameraInterfaceData, CameraStrategy } from '../interfaces/index.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Vector3D } from '../math/Vector3D.js';
import { Behavior } from './behaviors/Behavior.js';
/**
 * Standard implementation of the CameraInterfaceData.
 */
export declare class Camera implements CameraInterfaceData {
    /** @inheritdoc */
    position: Vector3D;
    /** @inheritdoc */
    target: Vector3D;
    /** @inheritdoc */
    up: Vector3D;
    /** @inheritdoc */
    theta: number;
    /** @inheritdoc */
    phi: number;
    /** @inheritdoc */
    pendingDx: number;
    /** @inheritdoc */
    pendingDy: number;
    /** @inheritdoc */
    behaviors: Behavior[];
    private _projection;
    private _aspect;
    private _strategy;
    private _effects;
    private _viewMatrix;
    private _viewProjMatrix;
    /**
     * Creates a new Camera.
     * @param projection The projection to use.
     */
    constructor(projection: AbstractProjection);
    /** @inheritdoc */
    get projection(): AbstractProjection;
    /** @inheritdoc */
    set projection(value: AbstractProjection);
    /** @inheritdoc */
    get viewProjectionMatrix(): Float32Array;
    /** @inheritdoc */
    get viewProjectionMatrix4(): Matrix4;
    /** @inheritdoc */
    get viewMatrix(): Float32Array;
    /** @inheritdoc */
    get viewMatrix4(): Matrix4;
    /** @inheritdoc */
    get aspect(): number;
    /** @inheritdoc */
    set aspect(value: number);
    /** @inheritdoc */
    zoom(delta: number): void;
    /** @inheritdoc */
    updateProjectionMatrix(): void;
    /** @inheritdoc */
    updateViewMatrix(): void;
    /** @inheritdoc */
    screenToWorld(screenX: number, screenY: number): Vector3D;
    /** @inheritdoc */
    get strategy(): CameraStrategy;
    /** @inheritdoc */
    setStrategy(type: CameraStrategyType): void;
    /** @inheritdoc */
    setConstraints(constraints?: CameraConstraints): void;
    addBehavior(behavior: Behavior): this;
    removeBehavior(behavior: Behavior): this;
    /** @inheritdoc */
    get activeStrategyType(): string;
    /** @inheritdoc */
    update(targetPos: Vector3D, dx: number, dy: number, deltaTime?: number): void;
    /**
     * Adds a new effect to the camera.
     * @param effect The effect to add.
     */
    addEffect(effect: CameraEffect): void;
    /**
     * Creates and adds a new effect by type.
     * @param type The type of effect.
     * @param intensity The intensity.
     * @param duration The duration in seconds.
     */
    applyEffect(type: CameraEffectType, intensity?: number, duration?: number): void;
}
