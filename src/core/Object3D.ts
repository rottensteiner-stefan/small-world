import { Matrix4 } from "../math/Matrix4.js";
import { Color } from "./Color.js";

export class Object3D {
  public position: [number, number, number] = [0, 0, 0];
  public rotation: [number, number, number] = [0, 0, 0];
  public scale: [number, number, number] = [1, 1, 1];
  public color: Color = Color.WHITE; // Jetzt als Instanz
  public geometry: any = null;
  public modelMatrix = new Matrix4();
  private static tM = new Matrix4();
  private static rM = new Matrix4();

  public updateMatrix(): void {
    Matrix4.translate(this.position[0], this.position[1], this.position[2], this.modelMatrix);
    if (this.rotation[1] !== 0) {
      Matrix4.rotateY(this.rotation[1], Object3D.rM);
      Matrix4.multiply(this.modelMatrix, Object3D.rM, Object3D.tM);
      this.modelMatrix.data.set(Object3D.tM.data);
    }
  }
}
