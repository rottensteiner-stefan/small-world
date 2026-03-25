/// src/interfaces/Renderer.ts
import { Scene } from "../core/Scene.js";
import { Color } from "../core/index.js";
import { Vector3D } from "../math/Vector3D.js";
import { RendererType } from "../enums/index.js";

export interface Renderer {
  readonly type: RendererType; // <--- NEU
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
  setSize(width: number, height: number): void;
  setClearColor(color: Color): void;
}
