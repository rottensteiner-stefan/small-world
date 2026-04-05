/// src/core/materials/SpriteMaterial.ts

import { Color } from "../colors/index.js";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/index.js";
import { Texture } from "../textures/Texture.js";

/**
 * Material for rendering 2D sprites.
 */
export class SpriteMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.SPRITE;

  /** The texture to display on the sprite. */
  public texture: Texture | undefined = undefined;

  /**
   * Creates a new SpriteMaterial.
   * @param options The texture for the sprite or a configuration object.
   */
  constructor(options?: Texture | { texture?: Texture; color?: Color }) {
    super();
    if (options instanceof Texture) {
      this.texture = options;
    } else if (options) {
      this.texture = options.texture;
      if (options.color) {
        this.color = options.color;
      }
    }
  }
}
