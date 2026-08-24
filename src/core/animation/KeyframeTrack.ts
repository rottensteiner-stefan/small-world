import { Vector3D } from "../../math/Vector3D.js";
import { Quaternion } from "../../math/Quaternion.js";

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
   * Samples this track at the given time. Valid only for tracks with `property === "rotation"`.
   * The returned Quaternion is owned scratch state, reused across calls -- copy it before the
   * next call to `sampleQuaternion`/`sampleVector` on this same track if it must be retained.
   */
  public sampleQuaternion(time: number): Quaternion {
    const index = this._findSegment(time);
    if (index.alpha === null) {
      this._readQuaternion(index.i0, this._tempQuatA);
      return this._tempQuatA;
    }
    this._readQuaternion(index.i0, this._tempQuatA);
    this._readQuaternion(index.i1, this._tempQuatB);
    return this._tempQuatA.slerp(this._tempQuatB, index.alpha);
  }

  /**
   * Samples this track at the given time. Valid only for tracks with `property === "translation"`
   * or `property === "scale"`. The returned Vector3D is owned scratch state, reused across calls --
   * copy it before the next call to `sampleQuaternion`/`sampleVector` on this same track if it must
   * be retained.
   */
  public sampleVector(time: number): Vector3D {
    const index = this._findSegment(time);
    if (index.alpha === null) {
      this._readVector(index.i0, this._tempVecA);
      return this._tempVecA;
    }
    this._readVector(index.i0, this._tempVecA);
    this._readVector(index.i1, this._tempVecB);
    return this._tempVecA.lerp(this._tempVecB, index.alpha);
  }

  /**
   * Locates the keyframe segment containing `time`. Returns `alpha: null` when `time` falls
   * exactly on (or outside) a keyframe, or the interpolation is stepped, so the caller should
   * read `i0` directly without blending.
   */
  private _findSegment(time: number): { i0: number; i1: number; alpha: number | null } {
    if (0 === this.times.length) {
      return { i0: 0, i1: 0, alpha: null };
    }
    const lastIdx = this.times.length - 1;
    if (lastIdx <= 0 || time <= this.times[0]!) {
      return { i0: 0, i1: 0, alpha: null };
    }
    if (time >= this.times[lastIdx]!) {
      return { i0: lastIdx, i1: lastIdx, alpha: null };
    }

    let i0 = 0;
    let i1 = 1;
    while (i1 < this.times.length && this.times[i1]! < time) {
      i0++;
      i1++;
    }

    if (this.interpolation === "STEP") {
      return { i0, i1, alpha: null };
    }

    const t0 = this.times[i0]!;
    const t1 = this.times[i1]!;
    return { i0, i1, alpha: (time - t0) / (t1 - t0) };
  }

  private _readQuaternion(index: number, out: Quaternion): void {
    const stride = 4;
    const offset = index * stride;
    if (offset + stride > this.values.length) return;
    out.set(
      this.values[offset + 0]!,
      this.values[offset + 1]!,
      this.values[offset + 2]!,
      this.values[offset + 3]!,
    );
  }

  private _readVector(index: number, out: Vector3D): void {
    const stride = 3;
    const offset = index * stride;
    if (offset + stride > this.values.length) return;
    out.set(this.values[offset + 0]!, this.values[offset + 1]!, this.values[offset + 2]!);
  }
}
