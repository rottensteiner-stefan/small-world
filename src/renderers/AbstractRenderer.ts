/// src/renderers/AbstractRenderer.ts

import { AbstractLight, Color } from "../core/index.js";
import { Renderer, LightDataInterface } from "../interfaces/index.js";
import { RendererType } from "../enums/index.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/index.js";
import { EngineConfig, QualityConfig, ToneMapping } from "../interfaces/EngineConfig.js";

/**
 * Base class for all renderer implementations.
 */
export abstract class AbstractRenderer implements Renderer {
  /** @inheritdoc */
  public abstract readonly type: RendererType;
  /** The clear color of the renderer. */
  protected _clearColor: Color = new Color(0, 0, 0, 1);

  /** Global quality settings. */
  protected _quality: QualityConfig = {
    mipmapping: true,
    maxAnisotropy: 4,
    msaa: 4,
    maxShadowResolution: 1024,
    hdr: false,
    toneMapping: ToneMapping.NONE,
  };

  /** Cached light data to avoid GC pressure. */
  protected _lightData: LightDataInterface = {
    aCol: new Color(0, 0, 0),
    aIntensity: 0,
    dDir: new Vector3D(0, 1, 0),
    dCol: new Color(0, 0, 0),
    dIntensity: 0,
    pLights: [],
    sLights: [],
    aLights: [],
  };

  /** @inheritdoc */
  public abstract initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineConfig,
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
    this._lightData.aIntensity = 0;
    this._lightData.dCol.set(0, 0, 0);
    this._lightData.dIntensity = 0;
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
    if (node instanceof AbstractLight) {
      node.applyTo(this._lightData);
    }

    if (undefined !== node.children) {
      for (const child of node.children) {
        this._traverseLights(child);
      }
    }
  }
}
