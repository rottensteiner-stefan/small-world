import { Color } from "../colors/index.js";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, BlendingMode, ShaderPropertyType } from "../../enums/index.js";
import { Texture } from "../textures/Texture.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

import fragGLSL from "./shaders/Sprite.frag.glsl?raw";
import fragGLSL100 from "./shaders/Sprite.frag.glsl100?raw";
import fragWGSL from "./shaders/Sprite.frag.wgsl?raw";

/**
 * Material for rendering 2D sprites.
 */
export class SpriteMaterial extends AbstractMaterial {
  /** The texture to display on the sprite. */
  public texture: Texture | undefined = undefined;

  /** Whether the sprite is transparent. Defaults to true. */
  public transparent: boolean = true;

  /**
   * Creates a new SpriteMaterial.
   * @param options The texture for the sprite or a configuration object.
   */
  constructor(
    options?:
      | Texture
      | {
          texture?: Texture | undefined;
          color?: Color | undefined;
          transparent?: boolean | undefined;
        },
  ) {
    super(MaterialType.SPRITE);
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
          isSprite: true,
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

  /** @inheritdoc */
  public override getShaderDefinition(): ShaderDefinition {
    return {
      id: this.type,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: fragGLSL,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: fragGLSL100,
        },
        wgsl: `[WGSL_STRUCTS]\n[WGSL_VS]\n${fragWGSL}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_texOffset: { type: ShaderPropertyType.VEC2 },
          u_texRepeat: { type: ShaderPropertyType.VEC2 },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    };
  }
}
