import { Object3D } from "./Object3D.js";
export class Scene {
  public objects: Object3D[] = [];
  public add(obj: Object3D): void {
    this.objects.push(obj);
  }
  public remove(obj: Object3D): void {
    const index = this.objects.indexOf(obj);
    if (index !== -1) this.objects.splice(index, 1);
  }
  public update(): void {
    for (const obj of this.objects) {
      if (obj.updateMatrixWorld) obj.updateMatrixWorld(true);
    }
  }
}
