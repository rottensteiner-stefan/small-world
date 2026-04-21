/// src/core/materials/AbstractMaterial.ts
import { Color } from "../colors/index.js";
import { MaterialType, CullMode } from "../../enums/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderProvider } from "../../interfaces/index.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";
import { ShaderRegistry } from "../renderers/shaders/ShaderRegistry.js";
import { MathUtils } from "../../math/index.js";

/**
 * Base class for all material types.
 */
export abstract class AbstractMaterial implements ShaderProvider {
  /** The unique identifier of the material. */
  public uuid: string = MathUtils.generateUUID();
  /** The base color of the material. */
  public color: Color = Color.WHITE;

  /** The culling mode for this material. Defaults to BACK. */
  public cullMode: CullMode = CullMode.BACK;

  /** Cached render manifest to avoid frequent allocations. */
  protected _renderManifest: RenderManifest | undefined = undefined;

  /**
   * Creates a new material and automatically registers it with the ShaderRegistry.
   * @param type The type of the material.
   */
  protected constructor(public readonly type: MaterialType) {
    // Self-registration: The moment a material is instantiated,
    // the engine knows how to handle its shader.
    ShaderRegistry.instance.registerProvider(this.type, this);
  }

  /**
   * Returns a manifest describing the requirements for rendering this material.
...
   * @returns The render manifest.
   */
  public abstract getRenderManifest(): RenderManifest;

  /** @inheritdoc */
  public abstract getShaderDefinition(): ShaderDefinition;
}
