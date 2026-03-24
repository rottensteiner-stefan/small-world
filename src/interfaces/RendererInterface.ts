/// src/interfaces/RendererInterface.ts
import { Scene } from "../core/Scene.js";
import { Color } from "../core/colors/Color.js";
import { Vector3D } from "../math/Vector3D.js";
import { RendererType } from "../enums/RendererType.js"; // <--- NEU

export interface RendererInterface {
  readonly type: RendererType; // <--- NEU
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
  setSize(width: number, height: number): void;
  setClearColor(color: Color): void;
}
