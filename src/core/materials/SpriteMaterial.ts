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
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
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

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;
    const state = this._renderManifest.state!;

    props["u_color"] = this.color.toFloat32Array();

    if (this.texture) {
      (props["u_texOffset"] as number[])[0] = this.texture.offset.x;
      (props["u_texOffset"] as number[])[1] = this.texture.offset.y;
      (props["u_texRepeat"] as number[])[0] = this.texture.repeat.x;
      (props["u_texRepeat"] as number[])[1] = this.texture.repeat.y;
    } else {
      (props["u_texOffset"] as number[])[0] = 0;
      (props["u_texOffset"] as number[])[1] = 0;
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
    }

    texs["u_diffuseMap"] = this.texture;

    state.transparent = this.transparent;
    state.blending = this.transparent ? BlendingMode.ALPHA : BlendingMode.OPAQUE;
    state.depthWrite = !this.transparent;
    state.isSprite = true;

    return this._renderManifest;
  }
}
