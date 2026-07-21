/// src/core/behaviors/Behavior.ts
import { Object3D } from "../index.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { MathUtils } from "../../math/index.js";

/**
 * Definition of a single configurable field inside the Gadget Inspector.
 */
export interface InspectorField {
  type: "number" | "boolean" | "string" | "choice";
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[] | Record<string, string | number>;
  path?: string; // Optional path for nested values like 'options.smoothness'
}

/**
 * Base class for all behaviors attached to an Object3D.
 */
export abstract class Behavior {
  public static readonly inspector?: Record<string, InspectorField>;

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

/**
 * Attaches a behavior to a host (Object3D or Camera) and appends it to its
 * behaviors list. Shared by every host so they don't each reimplement the
 * same attach-then-push logic.
 */
export function attachBehavior(
  behaviors: Behavior[],
  behavior: Behavior,
  target: Object3D | CameraInterfaceData,
): void {
  behavior.onAttach(target);
  behaviors.push(behavior);
}

/**
 * Detaches a behavior from a host's behaviors list, if present.
 */
export function detachBehavior(behaviors: Behavior[], behavior: Behavior): void {
  const index: number = behaviors.indexOf(behavior);
  if (-1 !== index) {
    behavior.onDetach();
    behaviors.splice(index, 1);
  }
}
