/// src/core/behaviors/FirstPersonController.ts
import { Behavior } from "./Behavior.js";
import { CameraInterfaceData, Events } from "../../interfaces/index.js";
import { Object3D } from "../index.js";
import { Input } from "../index.js";
import { Keys } from "../../enums/index.js";
import { Scene } from "../index.js";
import { BoundingBox } from "../../physix/index.js";
import { BoundingSphere } from "../../physix/index.js";
import { Collision } from "../../physix/index.js";
import { MathPool } from "../../math/index.js";

/**
 * Configuration for the FirstPersonController.
 */
export interface FirstPersonControllerOptions {
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
  /** The global event bus */
  events?: Events;
  /** Enable classic retro tank controls (turning with A/D) vs modern strafing. Defaults to true. */
  retroTankControls?: boolean;
}

/**
 * A generalized First Person Controller handling movement, rotation, and collisions.
 */
export class FirstPersonController extends Behavior {
  public enabled: boolean = true;
  protected _options: Required<Omit<FirstPersonControllerOptions, "scene" | "events">> & {
    scene: Scene | undefined;
    events: Events | undefined;
  };
  protected _collider?: BoundingSphere;

  // Public state for other behaviors (like weapon bobbing or footsteps) to read
  public distanceMoved: number = 0;
  public bobPhase: number = 0;
  public isMoving: boolean = false;

  /**
   * Creates a new FirstPersonController.
   * @param options The configuration options.
   */
  constructor(options: FirstPersonControllerOptions = {}) {
    super();
    this._options = {
      moveSpeed: options.moveSpeed ?? 10.0,
      rotationSpeed: options.rotationSpeed ?? 2.0,
      enableCollision: options.enableCollision ?? !!options.scene,
      collisionRadius: options.collisionRadius ?? 0.7,
      scene: options.scene,
      events: options.events,
      retroTankControls: options.retroTankControls ?? true,
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
    this.isMoving = false;

    // 1. Rotation (Turn Left/Right)
    let rotationDelta: number = 0;
    if (this._options.retroTankControls) {
      if (Input.isPressed(Keys.A) || Input.isPressed(Keys.LEFT)) {
        rotationDelta -= 1;
      }
      if (Input.isPressed(Keys.D) || Input.isPressed(Keys.RIGHT)) {
        rotationDelta += 1;
      }
    } else {
      // Modern mouse look or pointer lock logic could go here if implemented
      if (Input.isPressed(Keys.LEFT)) rotationDelta -= 1;
      if (Input.isPressed(Keys.RIGHT)) rotationDelta += 1;
    }

    const rotationAmount = rotationDelta * this._options.rotationSpeed * deltaTime;

    if (0 !== rotationDelta) {
      if (isCamera) {
        (this.target as unknown as CameraInterfaceData).theta += rotationAmount;
      } else {
        (this.target as Object3D).rotation.y -= rotationAmount;
      }
    }

    // 2. Movement
    let moveZ: number = 0;
    let moveX: number = 0;

    if (Input.isPressed(Keys.W) || Input.isPressed(Keys.UP)) {
      moveZ += 1;
    }
    if (Input.isPressed(Keys.S) || Input.isPressed(Keys.DOWN)) {
      moveZ -= 1;
    }

    if (!this._options.retroTankControls) {
      // Strafing
      if (Input.isPressed(Keys.A)) moveX -= 1;
      if (Input.isPressed(Keys.D)) moveX += 1;
    }

    if (0 !== moveZ || 0 !== moveX) {
      this.isMoving = true;
      const theta: number = isCamera
        ? (this.target as unknown as CameraInterfaceData).theta
        : (this.target as Object3D).rotation.y;

      const sin: number = Math.sin(theta);
      const cos: number = Math.cos(theta);

      // Forward is towards -Z at theta=0
      let dirX = sin * moveZ;
      let dirZ = -cos * moveZ;

      // Add strafe (perpendicular)
      dirX += cos * moveX;
      dirZ += sin * moveX;

      this.target.position.x += dirX * this._options.moveSpeed * deltaTime;
      this.target.position.z += dirZ * this._options.moveSpeed * deltaTime;
    }

    // 3. Update Walk Cycle / Bob Phase
    const totalMovement =
      Math.abs(rotationAmount) + (this.isMoving ? this._options.moveSpeed * deltaTime : 0);
    if (totalMovement > 0) {
      this.distanceMoved += totalMovement;
      this.bobPhase += totalMovement * 2.0;
    } else {
      // Smoothly return bob phase to 0 or multiple of PI when not moving, so weapon/head rests centered
      const remainder = this.bobPhase % (Math.PI * 2);
      if (remainder > 0.1) {
        const target = remainder > Math.PI ? Math.PI * 2 : 0;
        this.bobPhase += (target - remainder) * deltaTime * 5;
      }
    }

    // 4. Resolve Collisions
    if (true === this._options.enableCollision && undefined !== this._options.scene) {
      this._resolveCollisions();
    }
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
