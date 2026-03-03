import { Scene } from "../core/Scene.js";
export interface IRenderer {
  initialize(c: HTMLCanvasElement): Promise<void>;
  render(s: Scene, vp: Float32Array): void;
  setSize(w: number, h: number): void;
}
