import { Vector3D, Quaternion, MathUtils } from "../math/index.js";
import { Color } from "./colors/index.js";

/**
 * Shallow-clones `source` (same runtime prototype via `Object.create`, every own enumerable
 * property copied via `Object.assign`), then fixes up the two things a blind shallow copy gets
 * wrong for every `Object3D`/`AbstractMaterial`/`Behavior` in this engine:
 * - Any own property that is a `Vector3D`/`Quaternion`/`Color` instance is deep-cloned, so the
 *   copy doesn't alias the source's transform/color state.
 * - An own `uuid: string` property (every one of those three base classes declares one) is
 *   regenerated, so the copy gets its own identity.
 *
 * Everything else -- geometry data, textures, enum/primitive fields -- stays shared by
 * reference, which is the correct default: geometry/texture data is immutable, and sharing it
 * across duplicated objects is standard practice, not a bug.
 *
 * Callers (`Object3D.clone()`, `AbstractMaterial.clone()`, `Behavior.clone()`) each still need to
 * fix up their own class-specific reference fields this can't know about generically -- e.g.
 * `Object3D.clone()` must still deep-clone `children`/`behaviors`/`material` and reset `parent`/
 * `bounds`/the transform matrices itself.
 */
export function shallowCloneWithValueTypes<T extends object>(source: T): T {
  const copy = Object.create(Object.getPrototypeOf(source) as object) as T;
  Object.assign(copy, source);

  for (const key of Object.keys(copy) as (keyof T)[]) {
    const value = copy[key];
    if (value instanceof Vector3D || value instanceof Quaternion || value instanceof Color) {
      copy[key] = (value as unknown as { clone(): unknown }).clone() as T[keyof T];
    }
  }

  if ("uuid" in copy && "string" === typeof (copy as { uuid?: unknown }).uuid) {
    (copy as { uuid: string }).uuid = MathUtils.generateUUID();
  }

  return copy;
}
