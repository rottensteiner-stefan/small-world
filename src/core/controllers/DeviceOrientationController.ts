/// src/core/controllers/DeviceOrientationController.ts
import { Behavior } from "../behaviors/index.js";
import { Object3D } from "../index.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { DeviceCaps, DeviceFeature } from "../DeviceCaps.js";

/**
 * A controller that rotates its target based on the device's physical orientation sensors.
 */
export class DeviceOrientationController extends Behavior {
  public enabled: boolean = true;
  private _alpha: number = 0;
  private _beta: number = 0;
  private _gamma: number = 0;
  private _isInitialized: boolean = false;

  private _onDeviceOrientation = (event: DeviceOrientationEvent): void => {
    this._alpha = event.alpha ? (event.alpha * Math.PI) / 180.0 : 0;
    this._beta = event.beta ? (event.beta * Math.PI) / 180.0 : 0;
    this._gamma = event.gamma ? (event.gamma * Math.PI) / 180.0 : 0;
    this._isInitialized = true;
  };

  public override onAttach(target: Object3D | CameraInterfaceData): void {
    super.onAttach(target);
    this._initSensors();
  }

  private async _initSensors(): Promise<void> {
    if (!DeviceCaps.hasFeature(DeviceFeature.DEVICE_ORIENTATION)) {
      console.warn(
        "[DeviceOrientationController] DeviceOrientationEvent is not supported on this device.",
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === "granted") {
          this._startListening();
        } else {
          console.warn(
            "[DeviceOrientationController] Permission to access device orientation was denied.",
          );
        }
      } catch (err: unknown) {
        console.error("[DeviceOrientationController] Error requesting sensor permission:", err);
      }
    } else {
      this._startListening();
    }
  }

  private _startListening(): void {
    window.addEventListener("deviceorientation", this._onDeviceOrientation);
  }

  public override update(_deltaTime: number): void {
    if (!this.enabled || !this.target || !this._isInitialized) {
      return;
    }

    const isCamera = "updateProjectionMatrix" in this.target;

    // Depending on the screen orientation, we might need to swap axes.
    // For now, we assume standard portrait mode where:
    // alpha = rotation around Z (maps to world Y / yaw)
    // beta = rotation around X (maps to world X / pitch)
    // gamma = rotation around Y (maps to world Z / roll)

    if (isCamera) {
      const cam = this.target as unknown as CameraInterfaceData;
      cam.theta = this._alpha;
      // beta is usually 90 degrees (PI/2) when holding the phone upright.
      // Small World's phi expects 0 when looking straight forward.
      cam.phi = this._beta - Math.PI / 2.0;
    } else {
      const obj = this.target as Object3D;
      obj.rotation.set(this._beta - Math.PI / 2.0, this._alpha, -this._gamma);
    }
  }

  public override onDetach(): void {
    window.removeEventListener("deviceorientation", this._onDeviceOrientation);
    super.onDetach();
  }
}
