import { Vector3D } from "../math/Vector3D.js";
import { Matrix4 } from "../math/Matrix4.js";
import { AbstractMaterial } from "./materials/AbstractMaterial.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IBoundingVolume } from "../interfaces/IBoundingVolume.js";

export class Object3D {
  public readonly uuid: string = crypto.randomUUID();
  public name: string = "";

  public geometry: IGeometryData | null = null;
  public material: AbstractMaterial | null = null; // <--- NEU
  public bounds: IBoundingVolume | null = null;

  public position: Vector3D = new Vector3D(0, 0, 0);
  public rotation: Vector3D = new Vector3D(0, 0, 0);
  public scale: Vector3D = new Vector3D(1, 1, 1);

  public localMatrix: Matrix4 = new Matrix4();
  public worldMatrix: Matrix4 = new Matrix4();

  public parent: Object3D | null = null;
  public children: Object3D[] = [];

  public isVisible: boolean = true;
  public frustumCulled: boolean = true;

  constructor(name: string = "") {
    this.name = name;
  }

  public add(child: Object3D): void {
    if (child.parent) child.parent.remove(child);
    child.parent = this;
    this.children.push(child);
  }
  public remove(child: Object3D): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      child.parent = null;
      this.children.splice(index, 1);
    }
  }
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
