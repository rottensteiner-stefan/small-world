import { Scene } from "../core/Scene.js";
import { Color } from "../core/Color.js";
import { Vector3D } from "../math/Vector3D.js";

export interface IRenderer {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
  setSize(width: number, height: number): void;
  setClearColor(color: Color): void;
}
