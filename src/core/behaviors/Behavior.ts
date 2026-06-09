/// src/core/behaviors/Behavior.ts

import { Object3D } from "../Object3D.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { MathUtils } from "../../math/MathUtils.js";

/**
 * Base class for all behaviors attached to an Object3D.
 */
export abstract class Behavior {
  public readonly uuid: string = MathUtils.generateUUID();
  public isActive: boolean = true;

  /** The object this behavior is attached to. Set automatically. */
  public target: Object3D | CameraInterfaceData | undefined = undefined;

  /**
   * Called when the behavior is attached to an object.
   */
  public onAttach(target: Object3D | CameraInterfaceData): void {
    this.target = target;
  }

  /**
   * Called when the behavior is detached from an object.
   */
  public onDetach(): void {
    this.target = undefined;
  }

  /**
   * Called every frame to update the behavior logic.
   * @param deltaTime The time elapsed since the last frame in seconds.
   */
  public abstract update(deltaTime: number): void;
}
