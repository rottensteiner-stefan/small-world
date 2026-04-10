/// src/core/materials/SpriteMaterial.ts

import { Color } from "../colors/index.js";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, BlendingMode } from "../../enums/index.js";
import { Texture } from "../textures/Texture.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

/**
 * Material for rendering 2D sprites.
 */
export class SpriteMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.SPRITE;

  /** The texture to display on the sprite. */
  public texture: Texture | undefined = undefined;

  /** Whether the sprite is transparent. Defaults to true. */
  public transparent: boolean = true;

  /**
   * Creates a new SpriteMaterial.
   * @param options The texture for the sprite or a configuration object.
   */
  constructor(options?: Texture | { texture?: Texture; color?: Color; transparent?: boolean }) {
    super();
    if (options instanceof Texture) {
      this.texture = options;
    } else if (options) {
      this.texture = options.texture;
      if (options.color) {
        this.color = options.color;
      }
      if (options.transparent !== undefined) {
        this.transparent = options.transparent;
      }
    }
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    return {
      shaderId: this.type,
      properties: {
        u_color: this.color,
      },
      textures: {
        u_diffuseMap: this.texture,
      },
      state: {
        transparent: this.transparent,
        blending: this.transparent ? BlendingMode.ALPHA : BlendingMode.OPAQUE,
        depthWrite: !this.transparent,
      },
    };
  }
}
