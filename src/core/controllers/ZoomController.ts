import { Behavior } from "../behaviors/index.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { InputInterface } from "../index.js";
import { AudioSystem } from "../../audio/AudioSystem.js";

/**
 * Configuration for the ZoomController.
 */
export interface ZoomControllerOptions {
  /** The input source. Required for reading zoom delta. */
  input?: InputInterface;
  /** Audio system reference. Required — no global fallback. */
  audio?: AudioSystem;
  /** Zoom sensitivity. Defaults to 0.5. */
  zoomSensitivity?: number;
}

/**
 * A standalone controller for handling camera zoom (Wheel/Pinch).
 */
export class ZoomController extends Behavior {
  public enabled: boolean = true;
  private _options: Required<ZoomControllerOptions>;

  /**
   * Creates a new ZoomController.
   * @param options Configuration options.
   */
  constructor(options: ZoomControllerOptions) {
    super();
    if (!options.input) throw new Error("ZoomController requires an 'input' option.");
    this._options = {
      input: options.input,
      zoomSensitivity: options.zoomSensitivity ?? 0.5,
      audio: options.audio as AudioSystem,
    };
  }

  public override update(_deltaTime: number): void {
    if (!this.enabled || !this.target || 0 === this._options.input.mouse.zoom) {
      return;
    }

    const cam = this.target as unknown as CameraInterfaceData;
    cam.zoom(this._options.input.mouse.zoom * this._options.zoomSensitivity);
  }
}
