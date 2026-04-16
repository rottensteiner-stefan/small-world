/// src/core/controllers/ZoomController.ts

import { CameraInterfaceData, Controller } from "../../interfaces/index.js";
import { Input } from "../Input.js";

/**
 * Configuration for the ZoomController.
 */
export interface ZoomControllerOptions {
  /** Zoom sensitivity. Defaults to 0.5. */
  zoomSensitivity?: number;
}

/**
 * A standalone controller for handling camera zoom (Wheel/Pinch).
 */
export class ZoomController implements Controller {
  /** @inheritdoc */
  public enabled: boolean = true;

  private _camera: CameraInterfaceData;
  private _options: Required<ZoomControllerOptions>;

  /**
   * Creates a new ZoomController.
   * @param camera The camera to control.
   * @param options Configuration options.
   */
  constructor(camera: CameraInterfaceData, options: ZoomControllerOptions = {}) {
    this._camera = camera;
    this._options = {
      zoomSensitivity: options.zoomSensitivity ?? 0.5,
    };
  }

  /** @inheritdoc */
  public update(_deltaTime: number): void {
    if (!this.enabled || 0 === Input.mouse.zoom) {
      return;
    }

    this._camera.zoom(Input.mouse.zoom * this._options.zoomSensitivity);
  }
}
