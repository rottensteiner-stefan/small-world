/// src/interfaces/Renderer.ts

import { Scene } from "../core/Scene.js";
import { Color, AreaLight, PointLight, SpotLight } from "../core/index.js";
import { Vector3D } from "../math/Vector3D.js";
import { RendererType } from "../enums/index.js";

export interface LightDataInterface {
  aCol: Color;
  dDir: Vector3D;
  dCol: Color;
  pLights: PointLight[];
  sLights: SpotLight[];
  aLights: AreaLight[];
}

export interface Renderer {
  readonly type: RendererType; // <--- NEU
  initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>): Promise<void>;
  render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
  setSize(width: number, height: number): void;
  setClearColor(color: Color): void;
  destroy?(): void;
}
