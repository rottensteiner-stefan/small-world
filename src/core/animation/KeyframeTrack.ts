import { Vector3D } from "../../math/Vector3D.js";
import { Quaternion } from "../../math/Quaternion.js";
import { Object3D } from "../Object3D.js";
import { Bone } from "./Bone.js";

export type TrackType = "translation" | "rotation" | "scale";
export type InterpolationType = "LINEAR" | "STEP" | "CUBICSPLINE";

/**
 * Represents a single animation track animating a property of an Object3D/Bone over time.
 */
export class KeyframeTrack {
  public targetName: string;
  public property: TrackType;
  public times: Float32Array;
  public values: Float32Array;
  public interpolation: InterpolationType;

  private _tempQuatA: Quaternion = new Quaternion();
  private _tempQuatB: Quaternion = new Quaternion();
  private _tempVecA: Vector3D = new Vector3D();
  private _tempVecB: Vector3D = new Vector3D();

  constructor(
    targetName: string,
    property: TrackType,
    times: Float32Array,
    values: Float32Array,
    interpolation: InterpolationType = "LINEAR",
  ) {
    this.targetName = targetName;
    this.property = property;
    this.times = times;
    this.values = values;
    this.interpolation = interpolation;
  }

  /**
   * Evaluates the track at the specified time and applies the value to the target object.
   */
  public evaluate(time: number, target: Object3D | Bone): void {
    if (this.times.length === 0) return;

    // Handle out of bounds
    if (time <= this.times[0]!) {
      this._applyDirect(0, target);
      return;
    }
    const lastIdx = this.times.length - 1;
    if (time >= this.times[lastIdx]!) {
      this._applyDirect(lastIdx, target);
      return;
    }

    // Binary search or linear search for keyframe segment
    let i0 = 0;
    let i1 = 1;
    while (i1 < this.times.length && this.times[i1]! < time) {
      i0++;
      i1++;
    }

    const t0 = this.times[i0]!;
    const t1 = this.times[i1]!;
    const alpha = (time - t0) / (t1 - t0);

    if (this.interpolation === "STEP") {
      this._applyDirect(i0, target);
      return;
    }

    // Linear / Slerp Interpolation
    if (this.property === "rotation") {
      const stride = 4;
      this._tempQuatA.set(
        this.values[i0 * stride + 0]!,
        this.values[i0 * stride + 1]!,
        this.values[i0 * stride + 2]!,
        this.values[i0 * stride + 3]!,
      );
      this._tempQuatB.set(
        this.values[i1 * stride + 0]!,
        this.values[i1 * stride + 1]!,
        this.values[i1 * stride + 2]!,
        this.values[i1 * stride + 3]!,
      );

      // Slerp
      this._tempQuatA.slerp(this._tempQuatB, alpha);

      target.quaternion = (target.quaternion || new Quaternion()).copyFrom(this._tempQuatA);
    } else {
      const stride = 3;
      this._tempVecA.set(
        this.values[i0 * stride + 0]!,
        this.values[i0 * stride + 1]!,
        this.values[i0 * stride + 2]!,
      );
      this._tempVecB.set(
        this.values[i1 * stride + 0]!,
        this.values[i1 * stride + 1]!,
        this.values[i1 * stride + 2]!,
      );

      this._tempVecA.lerp(this._tempVecB, alpha);

      if (this.property === "translation") {
        target.position.copyFrom(this._tempVecA);
      } else if (this.property === "scale") {
        target.scale.copyFrom(this._tempVecA);
      }
    }
  }

  private _applyDirect(index: number, target: Object3D | Bone): void {
    if (this.property === "rotation") {
      const stride = 4;
      this._tempQuatA.set(
        this.values[index * stride + 0]!,
        this.values[index * stride + 1]!,
        this.values[index * stride + 2]!,
        this.values[index * stride + 3]!,
      );
      if ("quaternion" in target && (target as Bone).quaternion) {
        (target as Bone).quaternion!.copyFrom(this._tempQuatA);
      } else {
        target.quaternion = (target.quaternion || new Quaternion()).copyFrom(this._tempQuatA);
      }
    } else {
      const stride = 3;
      this._tempVecA.set(
        this.values[index * stride + 0]!,
        this.values[index * stride + 1]!,
        this.values[index * stride + 2]!,
      );
      if (this.property === "translation") {
        target.position.copyFrom(this._tempVecA);
      } else if (this.property === "scale") {
        target.scale.copyFrom(this._tempVecA);
      }
    }
  }
}
