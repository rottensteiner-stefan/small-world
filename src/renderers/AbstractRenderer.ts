/// src/renderers/AbstractRenderer.ts

import {
  AbstractLight,
  AreaLight,
  Color,
  DirectionalLight,
  PointLight,
  SpotLight,
} from "../core/index.js";
import { Renderer, LightDataInterface } from "../interfaces/index.js";
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

  /** Cached light data to avoid GC pressure. */
  protected _lightData: LightDataInterface = {
    aCol: new Color(0, 0, 0),
    dDir: new Vector3D(0, 1, 0),
    dCol: new Color(0, 0, 0),
    pLights: [],
    sLights: [],
    aLights: [],
  };

  /** @inheritdoc */
  public abstract initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
  ): Promise<void>;

  /** @inheritdoc */
  public abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;

  /** @inheritdoc */
  public abstract setSize(width: number, height: number): void;

  public destroy(): void {
    // Base implementation does nothing
  }

  /** @inheritdoc */
  public setClearColor(color: Color): void {
    this._clearColor = color;
  }

  /**
   * Extracts all lights from the scene for rendering.
   * @param scene The scene to extract lights from.
   * @returns An object containing all extracted light data.
   */
  protected extractLights(scene: Scene): LightDataInterface {
    this._lightData.pLights.length = 0;
    this._lightData.sLights.length = 0;
    this._lightData.aLights.length = 0;
    this._lightData.aCol.set(0, 0, 0);
    this._lightData.dCol.set(0, 0, 0);
    this._lightData.dDir.set(0, 1, 0);

    for (const obj of scene.objects) {
      this._traverseLights(obj);
    }

    return this._lightData;
  }

  /**
   * Recursively traverses the scene to find lights.
   * @param node The current node to traverse.
   * @private
   */
  private _traverseLights(node: Object3D): void {
    if ("type" in node) {
      const light: AbstractLight = node as AbstractLight;

      switch (light.type) {
        case LightType.AMBIENT: {
          this._lightData.aCol.set(
            light.color.r * light.intensity,
            light.color.g * light.intensity,
            light.color.b * light.intensity,
          );
          break;
        }
        case LightType.DIRECTIONAL: {
          const dl: DirectionalLight = light as DirectionalLight;
          // Optimierung: Direkt setzen statt clone()
          this._lightData.dDir.set(dl.direction.x, dl.direction.y, dl.direction.z);
          this._lightData.dDir.scale(-1).normalize();
          this._lightData.dCol.set(
            light.color.r * light.intensity,
            light.color.g * light.intensity,
            light.color.b * light.intensity,
          );
          break;
        }
        case LightType.POINT: {
          if (4 > this._lightData.pLights.length) this._lightData.pLights.push(light as PointLight);
          break;
        }
        case LightType.SPOT: {
          if (4 > this._lightData.sLights.length) this._lightData.sLights.push(light as SpotLight);
          break;
        }
        case LightType.AREA: {
          if (4 > this._lightData.aLights.length) this._lightData.aLights.push(light as AreaLight);
          break;
        }
      }
    }

    if (undefined !== node.children) {
      for (const child of node.children) {
        this._traverseLights(child);
      }
    }
  }
}
