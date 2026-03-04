import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
import { Color } from "./Color.js";

export class Object3D {
  public position: Vector3D = new Vector3D(0, 0, 0);
  public rotation: Vector3D = new Vector3D(0, 0, 0);
  public scale: Vector3D = new Vector3D(1, 1, 1);
  public color: Color = Color.WHITE;
  public geometry: any = null;
  public modelMatrix = new Matrix4();
  private static tM = new Matrix4();
  private static rM = new Matrix4();

  public updateMatrix(): void {
    Matrix4.translate(this.position, this.modelMatrix);
    if (this.rotation.y !== 0) {
      Matrix4.rotateY(this.rotation.y, Object3D.rM);
      Matrix4.multiply(this.modelMatrix, Object3D.rM, Object3D.tM);
      this.modelMatrix.data.set(Object3D.tM.data);
    }
  }
}
