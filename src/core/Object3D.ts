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
  public geometry: GeometryDataInterface | null = null;
  /** The material of the object. */
  public material: AbstractMaterial | null = null;
  /** The bounding volume for collision detection and frustum culling. */
  public bounds: BoundingVolume | null = null;

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
  public parent: Object3D | null = null;
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
    if (index !== -1) {
      child.parent = null;
      this.children.splice(index, 1);
    }
  }

  /**
   * Updates the world matrix of the object and its children.
   * @param force Whether to force the update.
   */
  public updateMatrixWorld(force: boolean = false): void {
    this.localMatrix.compose(this.position, this.rotation, this.scale);
    if (this.parent === null) {
      this.worldMatrix.data.set(this.localMatrix.data);
    } else {
      Matrix4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
    }
    for (const child of this.children) {
      child.updateMatrixWorld(force);
    }
  }
}
