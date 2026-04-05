/// src/core/Object3D.ts

import { AbstractMaterial } from "./materials/index.js";
import { BoundingVolume, GeometryDataInterface } from "../interfaces/index.js";
import { Matrix4, Vector3D } from "../math/index.js";

/**
 * Base class for all 3D objects in the scene.
 */
export class Object3D {
  /** The unique identifier of the object. */
  public readonly uuid: string = crypto.randomUUID();
  /** The name of the object. */
  public name: string = "";

  /** The geometry data of the object. */
  public geometry: GeometryDataInterface | undefined = undefined;
  /** The material of the object. */
  public material: AbstractMaterial | undefined = undefined;
  /** The bounding volume for collision detection and frustum culling. */
  public bounds: BoundingVolume | undefined = undefined;

  /** The position of the object in local space. */
  public position: Vector3D = new Vector3D(0, 0, 0);
  /** The rotation of the object in local space (Euler angles). */
  public rotation: Vector3D = new Vector3D(0, 0, 0);
  /** The scale of the object in local space. */
  public scale: Vector3D = new Vector3D(1, 1, 1);

  /** The local transformation matrix. */
  public localMatrix: Matrix4 = new Matrix4();
  /** The world transformation matrix. */
  public worldMatrix: Matrix4 = new Matrix4();

  /** The parent object in the scene graph. */
  public parent: Object3D | undefined = undefined;
  /** The list of child objects. */
  public children: Object3D[] = [];

  /** Whether the object is visible. */
  public isVisible: boolean = true;
  /** Whether frustum culling is enabled for this object. */
  public frustumCulled: boolean = true;

  /**
   * Creates a new Object3D.
   * @param name The name of the object.
   */
  constructor(name: string = "") {
    this.name = name;
  }

  /**
   * Adds a child object.
   * @param child The child object to add.
   */
  public add(child: Object3D): void {
    if (child.parent) {
      child.parent.remove(child);
    }
    child.parent = this;
    this.children.push(child);
  }

  /**
   * Removes a child object.
   * @param child The child object to remove.
   */
  public remove(child: Object3D): void {
    const index: number = this.children.indexOf(child);
    if (-1 !== index) {
      child.parent = undefined;
      this.children.splice(index, 1);
    }
  }

  /**
   * Translates the object by a vector.
   * @param v The translation vector.
   * @returns this
   */
  public translate(v: Vector3D): this {
    this.position.add(v);
    return this;
  }

  /**
   * Sets the position of the object.
   * @param x The x coordinate.
   * @param y The y coordinate.
   * @param z The z coordinate.
   * @returns this
   */
  public setPosition(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
    return this;
  }

  /**
   * Sets the rotation of the object.
   * @param x The x rotation in radians.
   * @param y The y rotation in radians.
   * @param z The z rotation in radians.
   * @returns this
   */
  public setRotation(x: number, y: number, z: number): this {
    this.rotation.set(x, y, z);
    return this;
  }

  /**
   * Sets the scale of the object.
   * @param x The x scale.
   * @param y The y scale.
   * @param z The z scale.
   * @returns this
   */
  public setScale(x: number, y: number = x, z: number = x): this {
    this.scale.set(x, y, z);
    return this;
  }

  /**
   * Rotates the object to look at a target position.
   * @param target The target position.
   * @returns this
   */
  public lookAt(target: Vector3D): this {
    const m = new Matrix4();
    Matrix4.lookAt(this.position, target, new Vector3D(0, 1, 0), m);
    // This is a simple implementation, ideally we extract Euler angles from the matrix
    // For now, let's keep it simple as a placeholder for DX.
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
