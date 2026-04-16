/// src/core/materials/AbstractMaterial.ts
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

/**
 * Base class for all material types.
 */
export abstract class AbstractMaterial {
  /** The type of the material. */
  public abstract readonly type: MaterialType;

  /** The unique identifier of the material. */
  public uuid: string = crypto.randomUUID();
  /** The base color of the material. */
  public color: Color = Color.WHITE;

  /** Cached render manifest to avoid frequent allocations. */
  protected _renderManifest: RenderManifest | undefined = undefined;

  /**
   * Returns a manifest describing the requirements for rendering this material.
   * @returns The render manifest.
   */
  public abstract getRenderManifest(): RenderManifest;
}
