/// src/apps/yad/YadController.ts

import { Behavior } from "../../core/behaviors/Behavior.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { Object3D } from "../../core/Object3D.js";
import { Input } from "../../core/Input.js";
import { Keys } from "../../enums/Keys.js";
import { Scene } from "../../core/Scene.js";
import { BoundingBox, BoundingSphere, Collision } from "../../physix/index.js";
import { MathPool } from "../../math/index.js";

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
export class YadController extends Behavior {
  public enabled: boolean = true;
  private _options: Required<Omit<YadControllerOptions, "scene">> & { scene: Scene | undefined };
  private _collider?: BoundingSphere;

  /**
   * Creates a new YadController.
   * @param options The configuration options.
   */
  constructor(options: YadControllerOptions = {}) {
    super();
    this._options = {
      moveSpeed: options.moveSpeed ?? 10.0,
      rotationSpeed: options.rotationSpeed ?? 2.0,
      enableCollision: options.enableCollision ?? !!options.scene,
      collisionRadius: options.collisionRadius ?? 0.7,
      scene: options.scene,
    };
  }

  public override onAttach(target: Object3D | CameraInterfaceData): void {
    super.onAttach(target);
    this._collider = new BoundingSphere(target.position.clone(), this._options.collisionRadius);
  }

  public override update(deltaTime: number): void {
    if (!this.enabled || !this.target) {
      return;
    }

    const isCamera = "updateProjectionMatrix" in this.target;

    // 1. Rotation (Turn Left/Right)
    let rotationDelta: number = 0;
    if (Input.isPressed(Keys.A) || Input.isPressed(Keys.LEFT)) {
      rotationDelta -= 1;
    }
    if (Input.isPressed(Keys.D) || Input.isPressed(Keys.RIGHT)) {
      rotationDelta += 1;
    }

    const rotationAmount = rotationDelta * this._options.rotationSpeed * deltaTime;

    if (0 !== rotationDelta) {
      if (isCamera) {
        (this.target as unknown as CameraInterfaceData).theta += rotationAmount;
      } else {
        (this.target as Object3D).rotation.y -= rotationAmount;
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
        ? (this.target as unknown as CameraInterfaceData).theta
        : (this.target as Object3D).rotation.y;

      const sin: number = Math.sin(theta);
      const cos: number = Math.cos(theta);

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
  private _resolveCollisions(): void {
    if (!this._options.scene || !this.target || !this._collider) return;
    this._collider.center.copyFrom(this.target.position);
    this._collider.center.y += 0.5; // Offset slightly up

    const potentialHits: Object3D[] = [];
    if (this._options.scene.staticOctree)
      potentialHits.push(...this._options.scene.staticOctree.queryVolume(this._collider));
    if (this._options.scene.dynamicOctree)
      potentialHits.push(...this._options.scene.dynamicOctree.queryVolume(this._collider));

    const correction = MathPool.acquireVector().set(0, 0, 0);
    const hitCorrection = MathPool.acquireVector();

    for (const obj of potentialHits) {
      if (!obj.bounds || obj === this.target) continue;
      if (Collision.resolveSphereBox(this._collider, obj.bounds as BoundingBox, hitCorrection)) {
        correction.add(hitCorrection);
        this._collider.center.add(hitCorrection); // update sphere center iteratively
      }
    }

    this.target.position.add(correction);
    MathPool.releaseVector(correction);
    MathPool.releaseVector(hitCorrection);
  }
}
