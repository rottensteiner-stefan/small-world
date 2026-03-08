import { Scene } from "../core/Scene.js";
import { Color } from "../core/Color.js";

export interface IRenderer {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(scene: Scene, vpMatrix: Float32Array): void;
  setSize(width: number, height: number): void;
  setClearColor(color: Color): void;
}
