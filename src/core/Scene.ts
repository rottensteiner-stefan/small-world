import { Object3D } from "./Object3D.js";
export class Scene {
  public children: Object3D[] = [];
  public add(o: Object3D) {
    this.children.push(o);
  }
  public update() {
    for (const c of this.children) c.updateMatrix();
  }
}
