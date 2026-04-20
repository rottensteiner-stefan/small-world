import { AbstractMaterial } from "./AbstractMaterial.js";
import { CubeTexture } from "../textures/index.js";
import { CullMode, MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../colors/Color.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

/**
 * Configuration options for skybox material.
 */
export interface SkyboxMaterialOptions {
  /** The base color. Defaults to white. */
  color?: Color;
  /** The cube map texture. Defaults to undefined. */
  cubeMap?: CubeTexture | undefined;
}

/**
 * A material for skyboxes.
 */
export class SkyboxMaterial extends AbstractMaterial {
  /** The cube map texture. */
  public cubeMap: CubeTexture | undefined;

  /**
   * Creates a new SkyboxMaterial.
   * @param options The configuration options.
   */
  constructor(options: SkyboxMaterialOptions = {}) {
    super(MaterialType.SKYBOX);
    const { color = Color.WHITE, cubeMap = undefined } = options;
    this.color = color;
    this.cubeMap = cubeMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
        },
        textures: {
          u_skybox: this.cubeMap || undefined,
        },
        state: {
          depthWrite: false,
          culling: CullMode.NONE, // Skybox is visible from the inside
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    texs["u_skybox"] = this.cubeMap || undefined;

    return this._renderManifest;
  }

  /** @inheritdoc */
  public override getShaderDefinition(): ShaderDefinition {
    return {
      id: this.type,
      sources: {
        glsl300: {
          vs: `#version 300 es
in vec3 a_position;
uniform mat4 u_vp;
uniform mat4 u_model;
out vec3 v_uvw;
void main() {
  v_uvw = a_position;
  gl_Position = u_vp * u_model * vec4(a_position, 1.0);
}`,
          fs: `[BASE_FRAGMENT_HEADER]
in vec3 v_uvw;
uniform samplerCube u_skybox;
void main() {
  fragColor = texture(u_skybox, v_uvw);
}`,
        },
        glsl100: {
          vs: `attribute vec3 a_position;
uniform mat4 u_vp;
uniform mat4 u_model;
varying vec3 v_uvw;
void main() {
    v_uvw = a_position;
    gl_Position = u_vp * u_model * vec4(a_position, 1.0);
}`,
          fs: `[BASE_FS_HEADER]
varying vec3 v_uvw;
uniform samplerCube u_skybox;
void main() {
    gl_FragColor = textureCube(u_skybox, v_uvw);
}`,
        },
        wgsl: `[WGSL_STRUCTS]
struct Out {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec3f
}
@vertex fn vs(@location(0) pos: vec3f) -> Out {
    var o: Out;
    o.uv = pos;
    let wp = obj.model * vec4f(pos, 1.0);
    o.pos = (global.vp * wp).xyww;
    return o;
}
@fragment fn fs(i: Out) -> @location(0) vec4f {
    return textureSample(u_skybox, s, i.uv) * obj.color;
}`,
      },
      layout: {
        uniforms: { u_color: { type: ShaderPropertyType.COLOR } },
        textures: { u_skybox: { type: ShaderPropertyType.TEXTURE } },
      },
    };
  }
}
