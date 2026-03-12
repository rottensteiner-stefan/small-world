/// src/renderers/AbstractRenderer.ts
import { IRenderer } from "../interfaces/IRenderer.js";
import { RendererType } from "../enums/RendererType.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/Vector3D.js";
import { Color } from "../core/colors/Color.js";
import { Object3D } from "../core/Object3D.js";
import { AbstractLight } from "../core/lights/AbstractLight.js";
import { LightType } from "../enums/LightType.js";
import { PointLight } from "../core/lights/PointLight.js";
import { SpotLight } from "../core/lights/SpotLight.js";
import { DirectionalLight } from "../core/lights/DirectionalLight.js";

export abstract class AbstractRenderer implements IRenderer {
  public abstract readonly type: RendererType;
  protected clearColor: Color = new Color(0, 0, 0, 1);

  public abstract initialize(canvas: HTMLCanvasElement): Promise<void>;
  public abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
  public abstract setSize(width: number, height: number): void;

  public setClearColor(color: Color): void {
    this.clearColor = color;
  }

  // Diese Methode ist in ALLEN Renderern (sogar WebGPU) exakt gleich!
  protected extractLights(scene: Scene) {
    let aCol = new Color(0, 0, 0);
    let dDir = new Vector3D(0, 1, 0);
    let dCol = new Color(0, 0, 0);
    const pLights: PointLight[] = [];
    const sLights: SpotLight[] = [];

    const traverse = (node: Object3D | AbstractLight) => {
      if (node instanceof AbstractLight) {
        switch (node.type) {
          case LightType.AMBIENT:
            aCol = new Color(
              node.color.r * node.intensity,
              node.color.g * node.intensity,
              node.color.b * node.intensity,
            );
            break;
          case LightType.DIRECTIONAL:
            const dl = node as DirectionalLight;
            dDir = dl.direction.clone().scale(-1).normalize();
            dCol = new Color(
              node.color.r * node.intensity,
              node.color.g * node.intensity,
              node.color.b * node.intensity,
            );
            break;
          case LightType.POINT:
            if (pLights.length < 4) pLights.push(node as PointLight);
            break;
          case LightType.SPOT:
            if (sLights.length < 4) sLights.push(node as SpotLight);
            break;
        }
      }
      if (node.children) node.children.forEach(traverse);
    };

    for (const obj of scene.objects) traverse(obj);

    return { aCol, dDir, dCol, pLights, sLights };
  }
}
