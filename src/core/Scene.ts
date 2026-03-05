import { Object3D } from "./Object3D.js";

export class Scene {
  private _children: Object3D[] = [];

  public add(object: Object3D): void {
    this._children.push(object);
  }

  /**
   * Entfernt ein Objekt aus der Szene.
   * @param object Das zu entfernende Object3D
   */
  public remove(object: Object3D): void {
    const index = this._children.indexOf(object);
    if (index !== -1) {
      this._children.splice(index, 1);
    }
  }

  public update(): void {
    for (const child of this._children) {
      child.updateMatrix();
    }
  }

  public get children(): Object3D[] {
    return this._children;
  }
}
