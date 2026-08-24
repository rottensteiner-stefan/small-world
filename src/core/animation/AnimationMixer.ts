import { Object3D } from "../Object3D.js";
import { AnimationClip } from "./AnimationClip.js";
import { AnimationAction } from "./AnimationAction.js";

/**
 * The AnimationMixer is the player for animations on a particular object in the scene.
 */
export class AnimationMixer {
  public root: Object3D;
  private _actions: Map<AnimationClip, AnimationAction> = new Map();
  private _bindings: Map<string, Object3D | undefined> = new Map();

  constructor(root: Object3D) {
    this.root = root;
  }

  /**
   * Returns an AnimationAction for the passed clip.
   */
  public clipAction(clip: AnimationClip): AnimationAction {
    let action = this._actions.get(clip);
    if (!action) {
      action = new AnimationAction(this, clip);
      this._actions.set(clip, action);
    }
    return action;
  }

  /**
   * Stops all active actions on this mixer.
   */
  public stopAllAction(): this {
    for (const action of this._actions.values()) {
      action.stop();
    }
    return this;
  }

  /**
   * Advances the animation time and evaluates tracks.
   * @param deltaTime Elapsed time in seconds.
   */
  public update(deltaTime: number): void {
    for (const action of this._actions.values()) {
      if (!action.isPlaying || action.weight <= 0) continue;

      action.update(deltaTime);

      // Evaluate tracks on root hierarchy
      const tracks = action.clip.tracks;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (!track) continue;

        let target = this._bindings.get(track.targetName);
        if (target === undefined) {
          target = this.root.getObjectByName(track.targetName);
          this._bindings.set(track.targetName, target);
        }

        if (target) {
          track.evaluate(action.time, target);
        }
      }
    }
  }
}
