import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";

export class Object3D {
  public readonly uuid: string = crypto.randomUUID();
  public name: string = "";

  public position: Vector3D = new Vector3D(0, 0, 0);
  public rotation: Vector3D = new Vector3D(0, 0, 0);
  public scale: Vector3D = new Vector3D(1, 1, 1);

  public localMatrix: Matrix4 = new Matrix4();
  public worldMatrix: Matrix4 = new Matrix4();

  public parent: Object3D | null = null;
  public children: Object3D[] = [];

  constructor(name: string = "") {
    this.name = name;
  }

  public add(child: Object3D): void {
    if (child.parent) {
      child.parent.remove(child);
    }
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

  /**
   * Berechnet die Matrizen rekursiv für den gesamten Baum.
   */
  public updateMatrixWorld(force: boolean = false): void {
    // 1. Lokale Matrix aus Pos/Rot/Scale bauen
    this.localMatrix.compose(this.position, this.rotation, this.scale);

    // 2. Welt-Matrix berechnen
    if (this.parent === null) {
      this.worldMatrix.data.set(this.localMatrix.data);
    } else {
      Matrix4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
    }

    // 3. Kinder anweisen, sich ebenfalls zu aktualisieren
    for (const child of this.children) {
      child.updateMatrixWorld(force);
    }
  }
}
