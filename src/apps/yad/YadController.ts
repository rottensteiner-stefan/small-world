/// src/apps/yad/YadController.ts

import { CameraInterfaceData, Controller } from "../../interfaces/index.js";
import { Object3D } from "../../core/Object3D.js";
import { Input } from "../../core/Input.js";
import { Keys } from "../../enums/Keys.js";
import { Scene } from "../../core/Scene.js";
import { BoundingBox, BoundingSphere, Collision } from "../../physix/index.js";
import { MathPool } from "../../math/index.js";
import { Vector3D } from "../../math/Vector3D.js";

/**
 * Configuration for the YadController.
 */
export interface YadControllerOptions {
  /** Movement speed in units per second. Defaults to 10. */
  moveSpeed?: number;
  /** Rotation speed in radians per second. Defaults to 2.0. */
  rotationSpeed?: number;
  /** Whether collisions are enabled. Requires a Scene reference. */
  enableCollision?: boolean;
  /** The radius of the collision sphere. Defaults to 0.5. */
  collisionRadius?: number;
  /** The scene to check for collisions. */
  scene?: Scene;
}

/**
 * A retro style controller for forward/backward movement and left/right rotation.
 * Controls:
 * - Forward: ArrowUp or W
 * - Backward: ArrowDown or S
 * - Turn Left: ArrowLeft or A
 * - Turn Right: ArrowRight or D
 */
export class YadController implements Controller {
  /** @inheritdoc */
  public enabled: boolean = true;

  private _target: CameraInterfaceData | Object3D;
  private _options: Required<Omit<YadControllerOptions, "scene">> & { scene: Scene | undefined };
  private _collider: BoundingSphere;

  /**
   * Creates a new YadController.
   * @param target The target object or camera to control.
   * @param options The configuration options.
   */
  constructor(target: CameraInterfaceData | Object3D, options: YadControllerOptions = {}) {
    this._target = target;
    this._options = {
      moveSpeed: options.moveSpeed ?? 10.0,
      rotationSpeed: options.rotationSpeed ?? 2.0,
      enableCollision: options.enableCollision ?? !!options.scene,
      collisionRadius: options.collisionRadius ?? 0.7,
      scene: options.scene,
    };
    this._collider = new BoundingSphere(
      this._target.position.clone(),
      this._options.collisionRadius,
    );
  }

  /** @inheritdoc */
  public update(deltaTime: number): void {
    if (false === this.enabled) {
      return;
    }

    const isCamera: boolean = "projection" in this._target;

    // 1. Rotation (Turn Left/Right)
    let rotationDelta: number = 0;
    if (Input.isPressed(Keys.A) || Input.isPressed(Keys.LEFT)) {
      rotationDelta -= 1;
    }
    if (Input.isPressed(Keys.D) || Input.isPressed(Keys.RIGHT)) {
      rotationDelta += 1;
    }

    if (0 !== rotationDelta) {
      if (isCamera) {
        (this._target as CameraInterfaceData).theta +=
          rotationDelta * this._options.rotationSpeed * deltaTime;
      } else {
        (this._target as Object3D).rotation.y +=
          rotationDelta * this._options.rotationSpeed * deltaTime;
      }
    }

    // 2. Movement (Forward/Backward)
    let moveZ: number = 0;
    if (Input.isPressed(Keys.W) || Input.isPressed(Keys.UP)) {
      moveZ += 1;
    }
    if (Input.isPressed(Keys.S) || Input.isPressed(Keys.DOWN)) {
      moveZ -= 1;
    }

    if (0 !== moveZ) {
      const theta: number = isCamera
        ? (this._target as CameraInterfaceData).theta
        : (this._target as Object3D).rotation.y;

      const sin: number = Math.sin(theta);
      const cos: number = Math.cos(theta);

      // Forward is towards -Z at theta=0
      this._target.position.x += sin * moveZ * this._options.moveSpeed * deltaTime;
      this._target.position.z -= cos * moveZ * this._options.moveSpeed * deltaTime;
    }

    // 3. Resolve Collisions
    if (true === this._options.enableCollision && undefined !== this._options.scene) {
      this._resolveCollisions();
    }

    // 4. Update Camera internal state if needed
    if (isCamera) {
      const cam: CameraInterfaceData = this._target as CameraInterfaceData;
      // We pass 0 for dx/dy as we handle keyboard rotation manually
      cam.update(cam.target, 0, 0, deltaTime);
    }
  }

  /**
   * Internal helper to resolve physical collisions against scene geometry.
   */
  private _resolveCollisions(): void {
    if (undefined === this._options.scene) {
      return;
    }
    this._collider.center.copyFrom(this._target.position);

    const potentialHits: Object3D[] = [];
    if (undefined !== this._options.scene.staticOctree) {
      const hits: Object3D[] = this._options.scene.staticOctree.queryVolume(this._collider);
      if (0 < hits.length) {
        // console.log(`[YadController] Hits found: ${hits.length}`);
      }
      potentialHits.push(...hits);
    }
    if (undefined !== this._options.scene.dynamicOctree) {
      potentialHits.push(...this._options.scene.dynamicOctree.queryVolume(this._collider));
    }

    const correction: Vector3D = MathPool.acquireVector().set(0, 0, 0);
    const hitCorrection: Vector3D = MathPool.acquireVector();

    for (const obj of potentialHits) {
      if (undefined === obj.bounds || obj === this._target) {
        continue;
      }
      if (Collision.resolveSphereBox(this._collider, obj.bounds as BoundingBox, hitCorrection)) {
        // console.log(`[YadController] Collided with ${obj.name}. Correction: ${hitCorrection.x}, ${hitCorrection.z}`);
        correction.add(hitCorrection);
        this._collider.center.add(hitCorrection);
      }
    }

    this._target.position.add(correction);
    MathPool.releaseVector(correction);
    MathPool.releaseVector(hitCorrection);
  }
}
