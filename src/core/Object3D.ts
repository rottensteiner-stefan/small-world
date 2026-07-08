/// src/core/Object3D.ts
import { AbstractMaterial } from "./materials/index.js";
import { BoundingVolume } from "../interfaces/index.js";
import { GeometryDataInterface } from "../interfaces/index.js";
import { MathUtils } from "../math/index.js";
import { Matrix4 } from "../math/index.js";
import { Quaternion } from "../math/index.js";
import { Vector3D } from "../math/index.js";
import { Behavior } from "./behaviors/index.js";

/**
 * Base class for all 3D objects in the scene.
 */
export class Object3D {
  public readonly uuid: string = MathUtils.generateUUID();
  public name: string = "";

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

  public addBehavior(behavior: Behavior): this {
    behavior.onAttach(this);
    this.behaviors.push(behavior);
    return this;
  }

  public removeBehavior(behavior: Behavior): this {
    const index = this.behaviors.indexOf(behavior);
    if (index !== -1) {
      behavior.onDetach();
      this.behaviors.splice(index, 1);
    }
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
    if (this.geometry) {
      // 1. Get local bounds from geometry
      const localBounds = this.geometry.getBoundingVolume();
      // 2. Transform bounds to world space without re-allocating
      if (!this.bounds) {
        // Create a fresh copy
        if (localBounds.type === 1 /* BoundingType.BOX */) {
          const lb = localBounds as import("../physix/index.js").BoundingBox;
          const BoxType = lb.constructor as new (min: Vector3D, max: Vector3D) => BoundingVolume;
          this.bounds = new BoxType(lb.min.clone(), lb.max.clone());
        }
      }

      if (this.bounds && this.bounds.type === 1 /* BoundingType.BOX */) {
        const lb = localBounds as import("../physix/index.js").BoundingBox;
        const b = this.bounds as import("../physix/index.js").BoundingBox;
        b.min.copyFrom(lb.min);
        b.max.copyFrom(lb.max);
        b.transform(this.worldMatrix);
      }
    }
    return this;
  }

  public lookAt(target: Vector3D, up: Vector3D = new Vector3D(0, 1, 0)): this {
    const m = new Matrix4();
    Matrix4.lookAt(this.position, target, up, m);
    const q = new Quaternion();
    q.setFromRotationMatrix(m);
    return this;
  }

  public updateMatrixWorld(force: boolean = false): void {
    this.localMatrix.compose(this.position, this.rotation, this.scale);
    if (undefined === this.parent) {
      this.worldMatrix.data.set(this.localMatrix.data);
    } else {
      Matrix4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
    }
    for (const child of this.children) {
      child.updateMatrixWorld(force);
    }
  }
}
