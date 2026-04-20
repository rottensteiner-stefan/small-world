/// src/core/controllers/FPSController.ts

import {CameraInterfaceData, Controller} from "../../interfaces/index.js";
import {Object3D} from "../Object3D.js";
import {Input} from "../Input.js";
import {Keys} from "../../enums/index.js";
import {Scene} from "../Scene.js";
import {BoundingBox, BoundingSphere, Collision} from "../../physics/index.js";
import {MathPool} from "../../math/index.js";

/**
 * Configuration for the FPSController.
 */
export interface FPSControllerOptions {
    /** Movement speed in units per second. Defaults to 10. */
    moveSpeed?: number;
    /** Look sensitivity. Defaults to 0.005. */
    lookSensitivity?: number;
    /** Whether movement (WASD) is enabled. Defaults to true. */
    enableMovement?: boolean;
    /** Whether rotation (Mouse) is enabled. Defaults to true. */
    enableRotation?: boolean;
    /** Whether vertical movement (Q/E) is enabled. Defaults to true. */
    enableVertical?: boolean;
    /** Whether collisions are enabled. Requires a Scene reference. */
    enableCollision?: boolean;
    /** The radius of the collision sphere. Defaults to 0.5. */
    collisionRadius?: number;
}

/**
 * A controller for first-person style movement and looking.
 */
export class FPSController implements Controller {
    public enabled: boolean = true;

    private _target: CameraInterfaceData | Object3D;
    private _options: Required<FPSControllerOptions>;
    private _scene: Scene | undefined;
    private _collider: BoundingSphere;

    /**
     * Creates a new FPSController.
     */
    constructor(target: CameraInterfaceData | Object3D, options: FPSControllerOptions = {}, scene?: Scene) {
        this._target = target;
        this._scene = scene;
        this._options = {
            moveSpeed: options.moveSpeed ?? 10.0,
            lookSensitivity: options.lookSensitivity ?? 0.005,
            enableMovement: options.enableMovement ?? true,
            enableRotation: options.enableRotation ?? true,
            enableVertical: options.enableVertical ?? true,
            enableCollision: options.enableCollision ?? !!scene,
            collisionRadius: options.collisionRadius ?? 0.5,
        };
        this._collider = new BoundingSphere(this._target.position.clone(), this._options.collisionRadius);
    }

    public update(deltaTime: number): void {
        if (!this.enabled) return;

        const isCamera = "projection" in this._target;
        let dx = 0;
        let dy = 0;
        if (this._options.enableRotation && Input.isPointerLocked) {
            dx = Input.mouse.dx;
            dy = Input.mouse.dy;
        }

        // 1. Horizontal Movement
        if (this._options.enableMovement) {
            const moveZ = Input.getAxis(Keys.W, Keys.S);
            const moveX = Input.getAxis(Keys.A, Keys.D);

            if (0 !== moveZ || 0 !== moveX) {
                // If it's a camera, we use its current look direction (theta)
                const theta = isCamera ? (this._target as CameraInterfaceData).theta : (this._target as Object3D).rotation.y;
                const sin = Math.sin(theta);
                const cos = Math.cos(theta);
                const dirX = moveX * cos + moveZ * sin;
                const dirZ = -moveX * sin + moveZ * cos;

                this._target.position.x += dirX * this._options.moveSpeed * deltaTime;
                this._target.position.z += dirZ * this._options.moveSpeed * deltaTime;
            }
        }

        // 2. Vertical Movement
        if (this._options.enableVertical) {
            const moveY = Input.getAxis(Keys.Q, Keys.E);
            if (0 !== moveY) {
                this._target.position.y += moveY * this._options.moveSpeed * deltaTime;
            }
        }

        // 3. Resolve Collisions (BEFORE rotation application)
        if (this._options.enableCollision && this._scene) {
            this._resolveCollisions();
        }

        // 4. Apply Rotation / View Update
        if (isCamera) {
            const cam = this._target as CameraInterfaceData;
            // Pass dx/dy to the camera's update which handles theta/phi
            cam.update(cam.target, dx, dy, deltaTime);
        } else {
            const obj = this._target as Object3D;
            if (this._options.enableRotation) {
                obj.rotation.y -= dx * this._options.lookSensitivity;
                obj.rotation.x += dy * this._options.lookSensitivity;
                const limit = 1.55;
                obj.rotation.x = Math.max(-limit, Math.min(limit, obj.rotation.x));
            }
        }
    }

    private _resolveCollisions(): void {
        if (!this._scene) return;
        this._collider.center.copyFrom(this._target.position);

        const potentialHits: Object3D[] = [];
        if (this._scene.staticOctree) potentialHits.push(...this._scene.staticOctree.queryVolume(this._collider));
        if (this._scene.dynamicOctree) potentialHits.push(...this._scene.dynamicOctree.queryVolume(this._collider));

        const correction = MathPool.acquireVector().set(0, 0, 0);
        const hitCorrection = MathPool.acquireVector();

        for (const obj of potentialHits) {
            if (!obj.bounds || obj === this._target) continue;
            if (Collision.resolveSphereBox(this._collider, obj.bounds as BoundingBox, hitCorrection)) {
                correction.add(hitCorrection);
                this._collider.center.add(hitCorrection);
            }
        }

        this._target.position.add(correction);
        MathPool.releaseVector(correction);
        MathPool.releaseVector(hitCorrection);
    }
}
