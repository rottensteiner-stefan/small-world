/// src/core/controllers/WASDController.ts

import { Controller } from "../../interfaces/index.js";
import { Object3D } from "../Object3D.js";
import { Input } from "../Input.js";
import { Keys } from "../../enums/index.js";
import { MathPool } from "../../math/index.js";

/**
 * Configuration for the WASDController.
 */
export interface WASDControllerOptions {
  /** Movement speed in units per second. Defaults to 10. */
  moveSpeed?: number;
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
      enableVertical: options.enableVertical ?? false,
    };
  }

  /** @inheritdoc */
  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    const moveZ = Input.getAxis(Keys.W, Keys.S);
    const moveX = Input.getAxis(Keys.A, Keys.D);

    if (0 !== moveZ || 0 !== moveX) {
      // Calculate world-space direction based on object's rotation
      const forward = MathPool.acquireVector().set(0, 0, -1);
      forward.transformDirection(this._target.worldMatrix).normalize();

      const right = MathPool.acquireVector().set(1, 0, 0);
      right.transformDirection(this._target.worldMatrix).normalize();

      const direction = MathPool.acquireVector().set(0, 0, 0);
      direction.add(forward.scale(-moveZ)); // moveZ is -1 for W, 1 for S. But we want forward for W.

      direction.set(0, 0, 0);
      if (0 !== moveZ) {
        // W is -1, S is 1. We want to move forward (0,0,-1) when W is pressed.
        // So: moveZ * (forward vector)
        direction.add(forward.scale(-moveZ));
      }
      if (0 !== moveX) {
        // A is -1, D is 1. Right is (1,0,0).
        direction.add(right.scale(moveX));
      }

      if (direction.lengthSq() > 0) {
        direction.normalize();
        this._target.position.add(direction.scale(this._options.moveSpeed * deltaTime));
      }

      MathPool.releaseVector(forward);
      MathPool.releaseVector(right);
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
