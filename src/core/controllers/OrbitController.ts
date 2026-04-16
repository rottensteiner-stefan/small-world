/// src/core/controllers/OrbitController.ts

import { Controller } from "../../interfaces/index.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { Input } from "../Input.js";

/**
 * Configuration for the OrbitController.
 */
export interface OrbitControllerOptions {
  /** Look sensitivity. Defaults to 0.005. */
  lookSensitivity?: number;
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
export class OrbitController implements Controller {
  /** @inheritdoc */
  public enabled: boolean = true;

  private _camera: CameraInterfaceData;
  private _options: Required<OrbitControllerOptions>;

  /**
   * Creates a new OrbitController.
   * @param camera The camera to control.
   * @param options Configuration options.
   */
  constructor(camera: CameraInterfaceData, options: OrbitControllerOptions = {}) {
    this._camera = camera;
    this._options = {
      lookSensitivity: options.lookSensitivity ?? 0.005,
      minPhi: options.minPhi ?? 0.01,
      maxPhi: options.maxPhi ?? Math.PI - 0.01,
      enableRotation: options.enableRotation ?? true,
    };
  }

  /** @inheritdoc */
  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    // 1. Handle Rotation
    let dx = 0;
    let dy = 0;
    if (this._options.enableRotation && Input.isPointerLocked) {
      dx = Input.mouse.dx;
      dy = Input.mouse.dy;
    }

    // 2. Update Camera
    this._camera.update(this._camera.target, dx, dy, deltaTime);
  }
}
