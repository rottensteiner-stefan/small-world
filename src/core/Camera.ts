import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";

export enum CameraStrategy {
  FIXED = 0,
  STIFF = 1,
  SMOOTH = 2,
}

export class Camera {
  public position: Vector3D = new Vector3D(0, 10, 20);
  public target: Vector3D = new Vector3D(0, 0, 0);
  public up: Vector3D = new Vector3D(0, 1, 0);
  public strategy: CameraStrategy = CameraStrategy.SMOOTH;

  public theta = 0;
  public phi = 0.6;
  public radius = 20;
  public lerpFactor = 0.1;

  constructor(public projection: any) {}

  public update(playerPos: Vector3D, dx: number, dy: number) {
    if (dx !== 0 || dy !== 0) {
      this.theta -= dx * 0.01;
      this.phi += dy * 0.01;
      const limit = Math.PI / 2 - 0.01;
      if (this.phi > limit) this.phi = limit;
      if (this.phi < -limit) this.phi = -limit;
    }

    if (this.strategy !== CameraStrategy.FIXED) {
      this.target.x = playerPos.x;
      this.target.y = playerPos.y;
      this.target.z = playerPos.z;
    }

    const idealX = this.target.x + this.radius * Math.sin(this.theta) * Math.cos(this.phi);
    const idealY = this.target.y + this.radius * Math.sin(this.phi);
    const idealZ = this.target.z + this.radius * Math.cos(this.theta) * Math.cos(this.phi);

    if (this.strategy === CameraStrategy.STIFF) {
      this.position.x = idealX;
      this.position.y = idealY;
      this.position.z = idealZ;
    } else if (this.strategy === CameraStrategy.SMOOTH) {
      this.position.x += (idealX - this.position.x) * this.lerpFactor;
      this.position.y += (idealY - this.position.y) * this.lerpFactor;
      this.position.z += (idealZ - this.position.z) * this.lerpFactor;
    }
  }

  public getViewProjection(v: Matrix4, out: Matrix4) {
    Matrix4.multiply(this.projection.getMatrix(), v, out);
  }
}
