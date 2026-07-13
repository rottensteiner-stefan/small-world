/// src/core/controllers/OrbitController.ts
import { Behavior } from "../behaviors/index.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { Input } from "../index.js";

/**
 * Configuration for the OrbitController.
 */
export interface OrbitControllerOptions {
  /** Look sensitivity. Defaults to 0.005. */
  lookSensitivity?: number;
  /** Rotation speed for keyboard. Defaults to 2.0. */
  rotationSpeed?: number;
  /** Minimum vertical angle (phi) in radians. Defaults to 0.01. */
  minPhi?: number;
  /** Maximum vertical angle (phi) in radians. Defaults to PI - 0.01. */
  maxPhi?: number;
  /** Whether rotation (Mouse) is enabled. Defaults to true. */
  enableRotation?: boolean;
}

/**
 * A controller that orbits a camera around a fixed target.
 */
export class OrbitController extends Behavior {
  public enabled: boolean = true;
  private _options: Required<OrbitControllerOptions>;

  /**
   * Creates a new OrbitController.
   * @param options Configuration options.
   */
  constructor(options: OrbitControllerOptions = {}) {
    super();
    this._options = {
      lookSensitivity: options.lookSensitivity ?? 0.005,
      rotationSpeed: options.rotationSpeed ?? 2.0,
      minPhi: options.minPhi ?? 0.01,
      maxPhi: options.maxPhi ?? Math.PI - 0.01,
      enableRotation: options.enableRotation ?? true,
    };
  }

  public override update(_deltaTime: number): void {
    if (!this.enabled || !this.target) {
      return;
    }

    const cam = this.target as unknown as CameraInterfaceData;

    // 1. Handle Rotation
    if (this._options.enableRotation) {
      if (Input.isPointerLocked || Input.mouse.left) {
        cam.pendingDx += Input.mouse.dx;
        cam.pendingDy += Input.mouse.dy;
      }
    }
  }
}
