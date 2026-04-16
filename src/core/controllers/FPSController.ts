/// src/core/controllers/FPSController.ts

import {CameraInterfaceData, Controller} from "../../interfaces/index.js";
import {Object3D} from "../Object3D.js";
import {Input} from "../Input.js";
import {Keys} from "../../enums/index.js";

/**
 * Configuration for the FPSController.
 */
export interface FPSControllerOptions {
    /** Movement speed in units per second. Defaults to 10. */
    moveSpeed?: number;
    /** Look sensitivity. Defaults to 0.005. */
    lookSensitivity?: number;
    /** Zoom sensitivity. Defaults to 0.5. */
    zoomSensitivity?: number;
    /** Whether movement (WASD) is enabled. Defaults to true. */
    enableMovement?: boolean;
    /** Whether rotation (Mouse) is enabled. Defaults to true. */
    enableRotation?: boolean;
    /** Whether zoom (Wheel/Pinch) is enabled. Defaults to true. */
    enableZoom?: boolean;
    /** Whether vertical movement (Q/E) is enabled. Defaults to true. */
    enableVertical?: boolean;
}

/**
 * A controller for first-person style movement and looking.
 * Can be attached to a Camera or any Object3D.
 */
export class FPSController implements Controller {
    /** @inheritdoc */
    public enabled: boolean = true;

    private _target: CameraInterfaceData | Object3D;
    private _options: Required<FPSControllerOptions>;

    /**
     * Creates a new FPSController.
     * @param target The object or camera to control.
     * @param options Configuration options.
     */
    constructor(target: CameraInterfaceData | Object3D, options: FPSControllerOptions = {}) {
        this._target = target;
        this._options = {
            moveSpeed: options.moveSpeed ?? 10.0,
            lookSensitivity: options.lookSensitivity ?? 0.005,
            zoomSensitivity: options.zoomSensitivity ?? 0.5,
            enableMovement: options.enableMovement ?? true,
            enableRotation: options.enableRotation ?? true,
            enableZoom: options.enableZoom ?? true,
            enableVertical: options.enableVertical ?? true,
        };
    }

    /** @inheritdoc */
    public update(deltaTime: number): void {
        if (!this.enabled) {
            return;
        }

        const isCamera = "projection" in this._target;

        // 1. Rotation (Mouse Look)
        let dx = 0;
        let dy = 0;
        if (this._options.enableRotation && Input.isPointerLocked) {
            dx = Input.mouse.dx;
            dy = Input.mouse.dy;
        }

        // 2. Zoom
        if (this._options.enableZoom && 0 !== Input.mouse.zoom) {
            if (isCamera) {
                const cam = this._target as CameraInterfaceData;
                const strategy = cam.strategy as any;
                if (strategy && undefined !== strategy.radius) {
                    strategy.radius += Input.mouse.zoom * strategy.radius * this._options.zoomSensitivity;
                    if (undefined !== strategy.minRadius && undefined !== strategy.maxRadius) {
                        strategy.radius = Math.max(strategy.minRadius, Math.min(strategy.maxRadius, strategy.radius));
                    }
                }
            }
        }

        // 3. Movement (Keyboard)
        if (this._options.enableMovement) {
            const moveZ = Input.getAxis(Keys.W, Keys.S);
            const moveX = Input.getAxis(Keys.A, Keys.D);

            if (0 !== moveZ || 0 !== moveX) {
                const theta = isCamera ? (this._target as CameraInterfaceData).theta : (this._target as Object3D).rotation.y;
                const sin = Math.sin(theta);
                const cos = Math.cos(theta);

                const dirX = moveX * cos + moveZ * sin;
                const dirZ = -moveX * sin + moveZ * cos;

                const pos = this._target.position;
                pos.x += dirX * this._options.moveSpeed * deltaTime;
                pos.z += dirZ * this._options.moveSpeed * deltaTime;
            }
        }

        // 4. Vertical Movement (Q/E)
        if (this._options.enableVertical) {
            const moveY = Input.getAxis(Keys.Q, Keys.E);
            if (0 !== moveY) {
                this._target.position.y += moveY * this._options.moveSpeed * deltaTime;
            }
        }

        // 5. Apply to target
        if (isCamera) {
            const cam = this._target as CameraInterfaceData;
            cam.update(cam.target, dx, dy, deltaTime);
        } else {
            const obj = this._target as Object3D;
            if (this._options.enableRotation) {
                obj.rotation.y -= dx * this._options.lookSensitivity;
                obj.rotation.x += dy * this._options.lookSensitivity;
                // Clamp pitch to avoid flipping
                const limit = 1.55; // Approx 89 degrees
                obj.rotation.x = Math.max(-limit, Math.min(limit, obj.rotation.x));
            }
        }
    }
}
