import { Object3D } from "../Object3D.js";
import { Vector3D } from "../../math/Vector3D.js";
import { Quaternion } from "../../math/Quaternion.js";
import { AnimationClip } from "./AnimationClip.js";
import { AnimationAction } from "./AnimationAction.js";
import { TrackType } from "./KeyframeTrack.js";

// Mixamo appends a session-dependent numeric suffix to its rig prefix ("mixamorig:" vs.
// "mixamorig1:", "mixamorig2:", ...) unrelated to which character was exported -- a mesh and an
// animation clip pulled from separate Mixamo export sessions can end up with different suffixes
// on what is otherwise the same joint name. Stripping it from both sides before comparing (rather
// than guessing a fixed list of candidate prefixes) matches regardless of either side's suffix.
const MIXAMO_RIG_PREFIX_RE = /^mixamorig\d*:/;

interface VectorContribution {
  value: Vector3D;
  weight: number;
}

interface QuaternionContribution {
  value: Quaternion;
  weight: number;
}

/**
 * The AnimationMixer is the player for animations on a particular object in the scene.
 */
export class AnimationMixer {
  public root: Object3D;
  private _actions: Map<AnimationClip, AnimationAction> = new Map();
  private _bindings: Map<string, Object3D | undefined> = new Map();

  // Reused per-frame accumulation buffers so that N simultaneously-playing actions targeting
  // the same bone/property blend by weight instead of the last-evaluated action winning outright.
  private _vectorContributions: Map<Object3D, Map<TrackType, VectorContribution[]>> = new Map();
  private _quatContributions: Map<Object3D, QuaternionContribution[]> = new Map();
  private _blendedQuat: Quaternion = new Quaternion();

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
   * Advances the animation time and evaluates tracks. Actions targeting the same bone/property
   * simultaneously (e.g. during a crossfade) are blended by their relative `weight` rather than
   * having the last-evaluated action simply overwrite the others.
   * @param deltaTime Elapsed time in seconds.
   */
  public update(deltaTime: number): void {
    this._vectorContributions.clear();
    this._quatContributions.clear();

    for (const action of this._actions.values()) {
      if (!action.isPlaying || action.weight <= 0) continue;

      action.update(deltaTime);

      const tracks = action.clip.tracks;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (!track) continue;

        let target = this._bindings.get(track.targetName);
        if (target === undefined) {
          target = this.root.getObjectByName(track.targetName);
          if (!target) {
            const normalized = track.targetName.replace(MIXAMO_RIG_PREFIX_RE, "");
            target = this._findByNormalizedMixamoName(this.root, normalized);
          }
          this._bindings.set(track.targetName, target);
        }
        if (!target) continue;

        if ("rotation" === track.property) {
          const sampled = track.sampleQuaternion(action.time);
          let contributions = this._quatContributions.get(target);
          if (!contributions) {
            contributions = [];
            this._quatContributions.set(target, contributions);
          }
          contributions.push({ value: sampled.clone(), weight: action.weight });
        } else {
          const sampled = track.sampleVector(action.time);
          let byProperty = this._vectorContributions.get(target);
          if (!byProperty) {
            byProperty = new Map();
            this._vectorContributions.set(target, byProperty);
          }
          let contributions = byProperty.get(track.property);
          if (!contributions) {
            contributions = [];
            byProperty.set(track.property, contributions);
          }
          contributions.push({ value: sampled.clone(), weight: action.weight });
        }
      }
    }

    for (const [target, byProperty] of this._vectorContributions) {
      for (const [property, contributions] of byProperty) {
        this._applyBlendedVector(target, property, contributions);
      }
    }
    for (const [target, contributions] of this._quatContributions) {
      this._applyBlendedQuaternion(target, contributions);
    }
  }

  /** Last-resort target lookup for a track name that didn't match any node exactly, and whose
   * Mixamo rig prefix (if any) was already stripped into `normalized`. Walks the tree comparing
   * each node's own name with its rig prefix stripped the same way, so it matches regardless of
   * which numeric suffix (if any) the node's own name happens to carry -- see `MIXAMO_RIG_PREFIX_RE`'s
   * comment for why a fixed list of candidate prefixes isn't enough. */
  private _findByNormalizedMixamoName(node: Object3D, normalized: string): Object3D | undefined {
    if (node.name.replace(MIXAMO_RIG_PREFIX_RE, "") === normalized) return node;
    for (const child of node.children) {
      const found = this._findByNormalizedMixamoName(child, normalized);
      if (found) return found;
    }
    return undefined;
  }

  private _applyBlendedVector(
    target: Object3D,
    property: TrackType,
    contributions: VectorContribution[],
  ): void {
    const dest = "translation" === property ? target.position : target.scale;

    if (1 === contributions.length) {
      dest.copyFrom(contributions[0]!.value);
      return;
    }

    let totalWeight = 0;
    for (const c of contributions) totalWeight += c.weight;
    if (0 >= totalWeight) return;

    let x = 0,
      y = 0,
      z = 0;
    for (const c of contributions) {
      x += c.value.x * c.weight;
      y += c.value.y * c.weight;
      z += c.value.z * c.weight;
    }
    dest.set(x / totalWeight, y / totalWeight, z / totalWeight);
  }

  private _applyBlendedQuaternion(target: Object3D, contributions: QuaternionContribution[]): void {
    if (1 === contributions.length) {
      target.quaternion = (target.quaternion || new Quaternion()).copyFrom(contributions[0]!.value);
      return;
    }

    // Incremental weighted slerp: fold each additional sample in proportional to its share of
    // the accumulated weight so far. This is the standard approach for blending N quaternions
    // without a closed-form weighted average (which quaternions don't have).
    this._blendedQuat.copyFrom(contributions[0]!.value);
    let accumulatedWeight = contributions[0]!.weight;
    for (let i = 1; i < contributions.length; i++) {
      const c = contributions[i]!;
      const newWeight = accumulatedWeight + c.weight;
      if (0 < newWeight) {
        this._blendedQuat.slerp(c.value, c.weight / newWeight);
      }
      accumulatedWeight = newWeight;
    }
    target.quaternion = (target.quaternion || new Quaternion()).copyFrom(this._blendedQuat);
  }
}
