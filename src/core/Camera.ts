import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
import { Projection } from "../math/projections/Projection.js";
import { ICameraStrategy } from "../interfaces/ICameraStrategy.js";
import { CameraStrategyType } from "../enums/CameraStrategyType.js";
import { CameraStrategyFactory } from "./cameras/CameraStrategyFactory.js";

export class Camera {
  public position: Vector3D = new Vector3D(0, 10, 20);
  public target: Vector3D = new Vector3D(0, 0, 0);
  public up: Vector3D = new Vector3D(0, 1, 0);

  // Geteilte Winkel für alle Strategien, damit der Blickwinkel erhalten bleibt
  public theta = 0;
  public phi = 0.6;

  private strategy!: ICameraStrategy;

  constructor(public projection: Projection) {
    this.setStrategy(CameraStrategyType.SMOOTH);
  }

  public setStrategy(type: CameraStrategyType): void {
    this.strategy = CameraStrategyFactory.get(type);
  }

  public get activeStrategyType(): string {
    return this.strategy.type;
  }

  public update(targetPos: Vector3D, dx: number, dy: number): void {
    this.strategy.update(this, targetPos, dx, dy);
  }

  public getViewProjection(v: Matrix4, out: Matrix4): void {
    Matrix4.multiply(this.projection.getMatrix(), v, out);
  }
}
