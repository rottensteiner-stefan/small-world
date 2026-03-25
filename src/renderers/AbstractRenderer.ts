/// src/renderers/AbstractRenderer.ts

import {
  AbstractLight,
  AreaLight,
  Color,
  DirectionalLight,
  PointLight,
  SpotLight,
} from "../core/index.js";
import { Renderer } from "../interfaces/index.js";
import { LightType, RendererType } from "../enums/index.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/Vector3D.js";

export abstract class AbstractRenderer implements Renderer {
  public abstract readonly type: RendererType;
  protected _clearColor: Color = new Color(0, 0, 0, 1);

  public abstract initialize(canvas: HTMLCanvasElement): Promise<void>;

  public abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;

  public abstract setSize(width: number, height: number): void;

  public setClearColor(color: Color): void {
    this._clearColor = color;
  }

  // Diese Methode ist in ALLEN Renderern (sogar WebGPU) exakt gleich!
  protected extractLights(scene: Scene): {
    aCol: Color;
    dDir: Vector3D;
    dCol: Color;
    pLights: PointLight[];
    sLights: SpotLight[];
    aLights: AreaLight[];
  } {
    const aLights: AreaLight[] = [];
    const pLights: PointLight[] = [];
    const sLights: SpotLight[] = [];
    let aCol = new Color(0, 0, 0);
    let dCol = new Color(0, 0, 0);
    let dDir = new Vector3D(0, 1, 0);

    const traverse = (node: Object3D): void => {
      // Duck-Typing: Wenn das Objekt ein 'type' Feld hat, behandeln wir es als Licht
      if ("type" in node) {
        const light = node as AbstractLight; // TypeScript beruhigen

        switch (light.type) {
          case LightType.AMBIENT: {
            aCol = new Color(
              light.color.r * light.intensity,
              light.color.g * light.intensity,
              light.color.b * light.intensity,
            );
            break;
          }
          case LightType.DIRECTIONAL: {
            const dl = light as DirectionalLight;
            dDir = dl.direction.clone().scale(-1).normalize();
            dCol = new Color(
              light.color.r * light.intensity,
              light.color.g * light.intensity,
              light.color.b * light.intensity,
            );

            break;
          }
          case LightType.POINT: {
            if (pLights.length < 4) pLights.push(light as PointLight);
            break;
          }
          case LightType.SPOT: {
            if (sLights.length < 4) sLights.push(light as SpotLight);
            break;
          }
          case LightType.AREA: {
            if (aLights.length < 4) aLights.push(light as AreaLight);
            break;
          }
        }
      }
      if (node.children) node.children.forEach(traverse);
    };

    for (const obj of scene.objects) traverse(obj);

    return { aCol, dDir, dCol, pLights, sLights, aLights };
  }
}
