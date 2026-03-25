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
/**
 * Base class for all renderer implementations.
 */
export abstract class AbstractRenderer implements Renderer {
  /** @inheritdoc */
  public abstract readonly type: RendererType;
  /** The clear color of the renderer. */
  protected _clearColor: Color = new Color(0, 0, 0, 1);

  /** @inheritdoc */
  public abstract initialize(canvas: HTMLCanvasElement): Promise<void>;

  /** @inheritdoc */
  public abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;

  /** @inheritdoc */
  public abstract setSize(width: number, height: number): void;

  /** @inheritdoc */
  public setClearColor(color: Color): void {
    this._clearColor = color;
  }

  /**
   * Extracts all lights from the scene for rendering.
   * @param scene The scene to extract lights from.
   * @returns An object containing all extracted light data.
   */
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
    let aCol: Color = new Color(0, 0, 0);
    let dCol: Color = new Color(0, 0, 0);
    let dDir: Vector3D = new Vector3D(0, 1, 0);

    const traverse = (node: Object3D): void => {
      if ("type" in node) {
        const light: AbstractLight = node as AbstractLight;

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
            const dl: DirectionalLight = light as DirectionalLight;
            dDir = dl.direction.clone().scale(-1).normalize();
            dCol = new Color(
              light.color.r * light.intensity,
              light.color.g * light.intensity,
              light.color.b * light.intensity,
            );

            break;
          }
          case LightType.POINT: {
            if (4 > pLights.length) pLights.push(light as PointLight);
            break;
          }
          case LightType.SPOT: {
            if (4 > sLights.length) sLights.push(light as SpotLight);
            break;
          }
          case LightType.AREA: {
            if (4 > aLights.length) aLights.push(light as AreaLight);
            break;
          }
        }
      }
      if (undefined !== node.children) {
        node.children.forEach(traverse);
      }
    };

    for (const obj of scene.objects) traverse(obj);

    return { aCol, dDir, dCol, pLights, sLights, aLights };
  }
}
