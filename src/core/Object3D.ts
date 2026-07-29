import { AbstractMaterial } from "./materials/index.js";
import { BoundingVolume, GeometryDataInterface, Collidable } from "../interfaces/index.js";
import { MathUtils, Matrix4, Vector3D, MathPool } from "../math/index.js";
import { Behavior, attachBehavior, detachBehavior } from "./behaviors/Behavior.js";
import { RigidBody } from "../physix/RigidBody.js";

/**
 * Base class for all 3D objects in the scene.
 */
export class Object3D implements Collidable {
  public readonly uuid: string = MathUtils.generateUUID();
  public name: string = "";
  /** Optional app-defined category tag, for typed identification instead of matching on `name`. */
  public tag?: string;

  public rigidBody?: RigidBody;

  public geometry: GeometryDataInterface | undefined = undefined;
  public material: AbstractMaterial | undefined = undefined;
  public bounds: BoundingVolume | undefined = undefined;

  public position: Vector3D = new Vector3D();
  public rotation: Vector3D = new Vector3D();
  public scale: Vector3D = new Vector3D(1, 1, 1);

  public localMatrix: Matrix4 = new Matrix4();
  public worldMatrix: Matrix4 = new Matrix4();

  public parent: Object3D | undefined = undefined;
  public children: Object3D[] = [];
  public behaviors: Behavior[] = [];

  public isVisible: boolean = true;
  /** Whether this object should generate bounds and participate in physics/raycasting. Defaults to true. */
  public isCollidable: boolean = true;
  public frustumCulled: boolean = true;
  public isStatic: boolean = false;
  public inFrustum: boolean = true;
  public castShadow: boolean = false;
  public receiveShadow: boolean = false;

  public isPickable: boolean = false;
  public onPointerEnter?: () => void;
  public onPointerLeave?: () => void;
  public onPointerClick?: () => void;
  public onPointerDown?: (
    ray: import("../physix/index.js").Ray,
    intersectionPoint: Vector3D,
  ) => void;
  public onPointerUp?: () => void;
  public onPointerMove?: (ray: import("../physix/index.js").Ray) => void;

  constructor(name?: string) {
    this.name = name || MathUtils.generateUUID();
  }

  public add(...children: Object3D[]): void {
    for (const child of children) {
      if (child.parent) child.parent.remove(child);
      child.parent = this;
      this.children.push(child);
    }
  }

  public remove(...children: Object3D[]): void {
    for (const child of children) {
      const index: number = this.children.indexOf(child);
      if (-1 !== index) {
        child.parent = undefined;
        this.children.splice(index, 1);
      }
    }
  }

  public getObjectByName(name: string): Object3D | undefined {
    if (this.name === name) return this;
    for (let i = 0; i < this.children.length; i++) {
      const found = this.children[i]!.getObjectByName(name);
      if (found) return found;
    }
    return undefined;
  }

  public addBehavior(behavior: Behavior): this {
    attachBehavior(this.behaviors, behavior, this);
    return this;
  }

  public removeBehavior(behavior: Behavior): this {
    detachBehavior(this.behaviors, behavior);
    return this;
  }

  public translate(v: Vector3D): this {
    this.position.add(v);
    return this;
  }

  public setPosition(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
    return this;
  }

  public setRotation(x: number, y: number, z: number): this {
    this.rotation.set(x, y, z);
    return this;
  }

  public setScale(x: number, y: number = x, z: number = x): this {
    this.scale.set(x, y, z);
    return this;
  }

  public computeBounds(): this {
    if (!this.isCollidable) {
      this.bounds = undefined;
      return this;
    }

    if (this.geometry) {
      // 1. Get local bounds from geometry
      const localBounds = this.geometry.getBoundingVolume();
      // 2. Transform bounds to world space without re-allocating (if types match)
      if (!this.bounds || this.bounds.type !== localBounds.type) {
        // Create a fresh copy
        if (localBounds.type === 1 /* BoundingType.BOX */) {
          const lb = localBounds as import("../physix/index.js").BoundingBox;
          const BoxType = lb.constructor as new (min: Vector3D, max: Vector3D) => BoundingVolume;
          this.bounds = new BoxType(lb.min.clone(), lb.max.clone());
        } else if (localBounds.type === 0 /* BoundingType.SPHERE */) {
          const ls = localBounds as import("../physix/index.js").BoundingSphere;
          const SphereType = ls.constructor as new (
            center: Vector3D,
            radius: number,
          ) => BoundingVolume;
          this.bounds = new SphereType(ls.center.clone(), ls.radius);
        }
      }

      if (this.bounds && this.bounds.type === 1 /* BoundingType.BOX */) {
        const lb = localBounds as import("../physix/index.js").BoundingBox;
        const b = this.bounds as import("../physix/index.js").BoundingBox;
        b.min.copyFrom(lb.min);
        b.max.copyFrom(lb.max);
        b.transform(this.worldMatrix);
      } else if (this.bounds && this.bounds.type === 0 /* BoundingType.SPHERE */) {
        const ls = localBounds as import("../physix/index.js").BoundingSphere;
        const b = this.bounds as import("../physix/index.js").BoundingSphere;
        b.center.copyFrom(ls.center);
        b.radius = ls.radius;
        b.transform(this.worldMatrix);
      }
    }
    return this;
  }

  public lookAt(target: Vector3D, up: Vector3D = new Vector3D(0, 1, 0)): this {
    const m = MathPool.acquireMatrix();
    Matrix4.lookAt(this.position, target, up, m);
    m.invert();
    const pos = MathPool.acquireVector();
    const scale = MathPool.acquireVector();
    m.decompose(pos, this.rotation, scale);
    MathPool.releaseVector(pos);
    MathPool.releaseVector(scale);
    MathPool.releaseMatrix(m);
    return this;
  }

  public updateMatrixWorld(): void {
    this.localMatrix.compose(this.position, this.rotation, this.scale);
    if (undefined === this.parent) {
      this.worldMatrix.data.set(this.localMatrix.data);
    } else {
      Matrix4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
    }
    for (const child of this.children) {
      child.updateMatrixWorld();
    }
  }

  /**
   * Reads this object's position in world space, i.e. after resolving the full parent
   * chain -- unlike `position`, which is always local to its immediate parent. Requires
   * `worldMatrix` to be current (see `updateMatrixWorld()`).
   * @param out Optional vector to write into, to avoid allocating one per call.
   */
  public getWorldPosition(out: Vector3D = new Vector3D()): Vector3D {
    return out.set(
      this.worldMatrix.data[12]!,
      this.worldMatrix.data[13]!,
      this.worldMatrix.data[14]!,
    );
  }
}
