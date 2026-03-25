/// src/core/materials/SpriteMaterial.ts

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
   * @param texture The texture for the sprite.
   */
  constructor(texture?: Texture) {
    super();
    this.texture = texture;
  }
}
