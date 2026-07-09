/// src/core/controllers/FPSController.ts
import { Behavior } from "../behaviors/index.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { Object3D, Input, InputInterface, Scene } from "../index.js";
import { InputMode, Keys } from "../../enums/index.js";
import { BoundingBox, BoundingSphere, Collision } from "../../physix/index.js";
import { MathPool } from "../../math/index.js";

/**
 * Configuration for the FPSController.
 */
export interface FPSControllerOptions {
  /** Movement speed in units per second. Defaults to 10. */
  moveSpeed?: number;
  /** Look sensitivity. Defaults to 0.005. */
  lookSensitivity?: number;
  /** Input mode for A/D keys (STRAFE or TANK). Defaults to TANK. */
  inputMode?: InputMode;
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
  /** The scene to check for collisions. */
  scene?: Scene;
  /** Optional input source (for testing). Defaults to global Input.instance. */
  input?: InputInterface;
}

/**
 * A controller for first-person style movement and looking.
 */
export class FPSController extends Behavior {
  public enabled: boolean = true;
  private _options: Required<Omit<FPSControllerOptions, "scene" | "input">> & {
    scene: Scene | undefined;
    input: InputInterface;
  };
  private _collider?: BoundingSphere;

  /**
   * Creates a new FPSController.
   * @param options The configuration options.
   */
  constructor(options: FPSControllerOptions = {}) {
    super();
    this._options = {
      moveSpeed: options.moveSpeed ?? 10.0,
      lookSensitivity: options.lookSensitivity ?? 0.005,
      inputMode: options.inputMode ?? InputMode.TANK,
      enableMovement: options.enableMovement ?? true,
      enableRotation: options.enableRotation ?? true,
      enableVertical: options.enableVertical ?? true,
      enableCollision: options.enableCollision ?? !!options.scene,
      collisionRadius: options.collisionRadius ?? 0.5,
      scene: options.scene,
      input: options.input ?? Input.instance,
    };
  }

  public override onAttach(target: import("../index.js").Object3D | CameraInterfaceData): void {
    super.onAttach(target);
    this._collider = new BoundingSphere(
      this.target!.position.clone(),
      this._options.collisionRadius,
    );
  }

  public override update(deltaTime: number): void {
    if (!this.enabled || !this.target) {
      return;
    }

    const input = this._options.input;
    const isCamera = "updateProjectionMatrix" in this.target;
    let dx = 0;
    let dy = 0;
    if (this._options.enableRotation && input.isPointerLocked) {
      dx = input.mouse.dx;
      dy = input.mouse.dy;
    }

    // 1. Horizontal Movement & Rotation
    if (this._options.enableMovement) {
      const moveZ = input.getAxis(Keys.W, Keys.S);
      const horizontalAxis = input.getAxis(Keys.A, Keys.D);

      if (InputMode.TANK === this._options.inputMode) {
        // Keyboard Rotation (A/D)
        if (0 !== horizontalAxis) {
          const rotationAmount = horizontalAxis * 2.0 * deltaTime; // 2 rad/s
          if (isCamera) {
            (this.target as unknown as CameraInterfaceData).theta += rotationAmount;
          } else {
            (this.target as Object3D).rotation.y -= rotationAmount;
          }
        }
      }

      if (0 !== moveZ || (0 !== horizontalAxis && InputMode.STRAFE === this._options.inputMode)) {
        // If it's a camera, we use its current look direction (theta)
        const theta = isCamera
          ? (this.target as unknown as CameraInterfaceData).theta
          : (this.target as import("../index.js").Object3D).rotation.y;

        const sin = Math.sin(theta);
        const cos = Math.cos(theta);

        // Forward/Backward
        if (0 !== moveZ) {
          // moveZ is -1 for W (forward), +1 for S (backward)
          this.target.position.x += -moveZ * sin * this._options.moveSpeed * deltaTime;
          this.target.position.z += moveZ * cos * this._options.moveSpeed * deltaTime;
        }

        // Strafe
        if (0 !== horizontalAxis && InputMode.STRAFE === this._options.inputMode) {
          this.target.position.x += horizontalAxis * cos * this._options.moveSpeed * deltaTime;
          this.target.position.z += horizontalAxis * sin * this._options.moveSpeed * deltaTime;
        }
      }
    }

    // 2. Vertical Movement
    if (this._options.enableVertical) {
      const moveY = input.getAxis(Keys.Q, Keys.E);
      if (0 !== moveY) {
        this.target.position.y += moveY * this._options.moveSpeed * deltaTime;
      }
    }

    // 3. Resolve Collisions (BEFORE rotation application)
    if (this._options.enableCollision && this._options.scene) {
      this._resolveCollisions();
    }

    // 4. Apply Rotation / View Update
    if (isCamera) {
      const cam = this.target as unknown as CameraInterfaceData;
      // Removed cam.update, rely on Camera's update logic
      if (this._options.enableRotation && input.isPointerLocked) {
        cam.pendingDx += dx;
        cam.pendingDy += dy;
      }
    } else {
      const obj = this.target as Object3D;
      if (this._options.enableRotation) {
        obj.rotation.y -= dx * this._options.lookSensitivity;
        obj.rotation.x += dy * this._options.lookSensitivity;
        const limit = 1.55;
        obj.rotation.x = Math.max(-limit, Math.min(limit, obj.rotation.x));
      }
    }
  }

  private _resolveCollisions(): void {
    if (!this._options.scene || !this.target || !this._collider) return;
    this._collider.center.copyFrom(this.target.position);
    this._collider.center.y += 0.5;

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
        this._collider.center.add(hitCorrection);
      }
    }

    this.target.position.add(correction);
    MathPool.releaseVector(correction);
    MathPool.releaseVector(hitCorrection);
  }
}
