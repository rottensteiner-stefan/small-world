import { AbstractProjection, Matrix4, Vector3D } from '../math/index.js';
import { CameraEffectType, CameraStrategyType } from '../enums/index.js';
import { CameraStrategy } from './CameraStrategy.js';
import { CameraConstraints } from './CameraConstraints.js';
import { CameraEffect } from './CameraEffect.js';
import { Behavior } from '../core/behaviors/Behavior.js';
/**
 * Interface representing the core data and API of a camera.
 */
export interface CameraInterfaceData {
    /** The behaviors attached to this camera. */
    behaviors: Behavior[];
    /** Horizontal rotation delta accumulated by behaviors. */
    pendingDx: number;
    /** Vertical rotation delta accumulated by behaviors. */
    pendingDy: number;
    /** The currently active camera control strategy. */
    readonly strategy: CameraStrategy;
    /** The position of the camera in world space. */
    position: Vector3D;
    /** The target point the camera is looking at. */
    target: Vector3D;
    /** The up vector of the camera (usually 0, 1, 0). */
    up: Vector3D;
    /** The aspect ratio (width / height). */
    aspect: number;
    /** The active projection (e.g., Perspective, Orthographic). */
    projection: AbstractProjection;
    /** The rotation angle around the Y-axis (yaw). */
    theta: number;
    /** The rotation angle around the X-axis (pitch). */
    phi: number;
    /** The unique type identifier of the active strategy. */
    readonly activeStrategyType: string;
    /** The combined view-projection matrix as a Float32Array. */
    viewProjectionMatrix: Float32Array;
    /** The combined view-projection matrix as a Matrix4 instance. */
    viewProjectionMatrix4: Matrix4;
    /** The view matrix as a Float32Array. */
    viewMatrix: Float32Array;
    /** The view matrix as a Matrix4 instance. */
    viewMatrix4: Matrix4;
    /**
     * Adds a behavior to the camera.
     * @param behavior The behavior to add.
     */
    addBehavior(behavior: Behavior): this;
    /**
     * Removes a behavior from the camera.
     * @param behavior The behavior to remove.
     */
    removeBehavior(behavior: Behavior): this;
    /**
     * Switches the camera's control behavior.
     * @param type The type of strategy to use.
     */
    setStrategy(type: CameraStrategyType): void;
    /**
     * Sets or removes spatial constraints for the active strategy.
     * @param constraints The constraints to apply, or undefined to clear.
     */
    setConstraints(constraints?: CameraConstraints): void;
    /**
     * Performs the movement and logic of the active strategy.
     * @param targetPos The target position to follow.
     * @param dx The horizontal rotation delta.
     * @param dy The vertical rotation delta.
     * @param deltaTime Elapsed time since the last frame.
     */
    update(targetPos: Vector3D, dx: number, dy: number, deltaTime?: number): void;
    /**
     * Adds a new effect to the camera.
     * @param effect The effect to add.
     */
    addEffect(effect: CameraEffect): void;
    /**
     * Creates and adds a new effect by its type.
     * @param type The type of effect.
     * @param intensity The intensity factor.
     * @param duration The duration in seconds.
     */
    applyEffect(type: CameraEffectType, intensity?: number, duration?: number): void;
    /**
     * Adjusts the zoom level (radius, FOV, or orthographic bounds).
     * @param delta The zoom delta.
     */
    zoom(delta: number): void;
    /**
     * Recomputes the projection matrix.
     */
    updateProjectionMatrix(): void;
    /**
     * Recomputes the view matrix and the combined view-projection matrix.
     */
    updateViewMatrix(): void;
    /**
     * Maps screen coordinates (NDC -1 to 1) to world coordinates on the Y=0 plane.
     * @param screenX Normalized X coordinate (-1 to 1).
     * @param screenY Normalized Y coordinate (-1 to 1).
     * @returns The world position on the Y=0 plane.
     */
    screenToWorld(screenX: number, screenY: number): Vector3D;
}
