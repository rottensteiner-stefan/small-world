/// src/core/controllers/WASDController.ts

import { Controller } from "../../interfaces/index.js";
import { Object3D } from "../Object3D.js";
import { Input } from "../Input.js";
import { InputMode, Keys } from "../../enums/index.js";
import { MathPool } from "../../math/index.js";

/**
 * Configuration for the WASDController.
 */
export interface WASDControllerOptions {
  /** Movement speed in units per second. Defaults to 10. */
  moveSpeed?: number;
  /** Input mode for A/D keys (STRAFE or TANK). Defaults to TANK. */
  inputMode?: InputMode;
  /** Whether vertical movement (Q/E) is enabled. Defaults to false. */
  enableVertical?: boolean;
}

/**
 * A controller that moves an Object3D using WASD keys.
 * Movement is relative to the object's rotation (local forward).
 */
export class WASDController implements Controller {
  /** @inheritdoc */
  public enabled: boolean = true;

  private _target: Object3D;
  private _options: Required<WASDControllerOptions>;

  /**
   * Creates a new WASDController.
   * @param target The object to move.
   * @param options Configuration options.
   */
  constructor(target: Object3D, options: WASDControllerOptions = {}) {
    this._target = target;
    this._options = {
      moveSpeed: options.moveSpeed ?? 10.0,
      inputMode: options.inputMode ?? InputMode.TANK,
      enableVertical: options.enableVertical ?? false,
    };
  }

  /** @inheritdoc */
  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    const moveZ = Input.getAxis(Keys.W, Keys.S);
    const horizontalAxis = Input.getAxis(Keys.A, Keys.D);

    // Handle Rotation (A/D in TANK mode)
    if (InputMode.TANK === this._options.inputMode && 0 !== horizontalAxis) {
      this._target.rotation.y -= horizontalAxis * 2.0 * deltaTime;
    }

    if (0 !== moveZ || (0 !== horizontalAxis && InputMode.STRAFE === this._options.inputMode)) {
      // Calculate world-space direction based on object's rotation
      const forward = MathPool.acquireVector().set(0, 0, -1);
      forward.transformDirection(this._target.worldMatrix).normalize();

      const direction = MathPool.acquireVector().set(0, 0, 0);

      // W/S movement
      if (0 !== moveZ) {
        direction.add(forward.scale(-moveZ));
      }

      // A/D strafe movement
      if (InputMode.STRAFE === this._options.inputMode && 0 !== horizontalAxis) {
        const right = MathPool.acquireVector().set(1, 0, 0);
        right.transformDirection(this._target.worldMatrix).normalize();
        direction.add(right.scale(horizontalAxis));
        MathPool.releaseVector(right);
      }

      if (direction.lengthSq() > 0) {
        direction.normalize();
        this._target.position.add(direction.scale(this._options.moveSpeed * deltaTime));
      }

      MathPool.releaseVector(forward);
      MathPool.releaseVector(direction);
    }

    if (this._options.enableVertical) {
      const moveY = Input.getAxis(Keys.Q, Keys.E);
      if (0 !== moveY) {
        this._target.position.y += moveY * this._options.moveSpeed * deltaTime;
      }
    }
  }
}
