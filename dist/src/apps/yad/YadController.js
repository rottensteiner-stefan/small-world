/// src/apps/yad/YadController.ts
import { Behavior } from "../../core/behaviors/Behavior.js";
import { Input } from "../../core/Input.js";
import { Keys } from "../../enums/Keys.js";
import { BoundingSphere, Collision } from "../../physix/index.js";
import { MathPool } from "../../math/index.js";
/**
 * A retro style controller for forward/backward movement and left/right rotation.
 * Controls:
 * - Forward: ArrowUp or W
 * - Backward: ArrowDown or S
 * - Turn Left: ArrowLeft or A
 * - Turn Right: ArrowRight or D
 */
export class YadController extends Behavior {
    enabled = true;
    _options;
    _collider;
    /**
     * Creates a new YadController.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        this._options = {
            moveSpeed: options.moveSpeed ?? 10.0,
            rotationSpeed: options.rotationSpeed ?? 2.0,
            enableCollision: options.enableCollision ?? !!options.scene,
            collisionRadius: options.collisionRadius ?? 0.7,
            scene: options.scene,
        };
    }
    onAttach(target) {
        super.onAttach(target);
        this._collider = new BoundingSphere(target.position.clone(), this._options.collisionRadius);
    }
    update(deltaTime) {
        if (!this.enabled || !this.target) {
            return;
        }
        const isCamera = "updateProjectionMatrix" in this.target;
        // 1. Rotation (Turn Left/Right)
        let rotationDelta = 0;
        if (Input.isPressed(Keys.A) || Input.isPressed(Keys.LEFT)) {
            rotationDelta -= 1;
        }
        if (Input.isPressed(Keys.D) || Input.isPressed(Keys.RIGHT)) {
            rotationDelta += 1;
        }
        const rotationAmount = rotationDelta * this._options.rotationSpeed * deltaTime;
        if (0 !== rotationDelta) {
            if (isCamera) {
                this.target.theta += rotationAmount;
            }
            else {
                this.target.rotation.y -= rotationAmount;
            }
        }
        // 2. Movement (Forward/Backward)
        let moveZ = 0;
        if (Input.isPressed(Keys.W) || Input.isPressed(Keys.UP)) {
            moveZ += 1;
        }
        if (Input.isPressed(Keys.S) || Input.isPressed(Keys.DOWN)) {
            moveZ -= 1;
        }
        if (0 !== moveZ) {
            const theta = isCamera
                ? this.target.theta
                : this.target.rotation.y;
            const sin = Math.sin(theta);
            const cos = Math.cos(theta);
            const dirX = sin * moveZ;
            const dirZ = -cos * moveZ;
            // Forward is towards -Z at theta=0
            this.target.position.x += dirX * this._options.moveSpeed * deltaTime;
            this.target.position.z += dirZ * this._options.moveSpeed * deltaTime;
        }
        // 3. Resolve Collisions
        if (true === this._options.enableCollision && undefined !== this._options.scene) {
            this._resolveCollisions();
        }
        // 4. Removed cam.update() - Camera handles its own updates
    }
    /**
     * Internal helper to resolve physical collisions against scene geometry.
     */
    _resolveCollisions() {
        if (!this._options.scene || !this.target || !this._collider)
            return;
        this._collider.center.copyFrom(this.target.position);
        this._collider.center.y += 0.5; // Offset slightly up
        const potentialHits = [];
        if (this._options.scene.staticOctree)
            potentialHits.push(...this._options.scene.staticOctree.queryVolume(this._collider));
        if (this._options.scene.dynamicOctree)
            potentialHits.push(...this._options.scene.dynamicOctree.queryVolume(this._collider));
        const correction = MathPool.acquireVector().set(0, 0, 0);
        const hitCorrection = MathPool.acquireVector();
        for (const obj of potentialHits) {
            if (!obj.bounds || obj === this.target)
                continue;
            if (Collision.resolveSphereBox(this._collider, obj.bounds, hitCorrection)) {
                correction.add(hitCorrection);
                this._collider.center.add(hitCorrection); // update sphere center iteratively
            }
        }
        this.target.position.add(correction);
        MathPool.releaseVector(correction);
        MathPool.releaseVector(hitCorrection);
    }
}
//# sourceMappingURL=YadController.js.map