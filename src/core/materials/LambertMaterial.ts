/// src/core/materials/LambertMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

/**
 * Configuration options for Lambert material.
 */
export interface LambertMaterialOptions {
  /** The base color of the material. Defaults to white. */
  color?: Color;
  /** The diffuse texture map. Defaults to undefined. */
  diffuseMap?: Texture | undefined;
  /** The normal texture map. Defaults to undefined. */
  normalMap?: Texture | undefined;
}

/**
 * A material that uses the Lambertian reflectance model.
 */
export class LambertMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.LAMBERT;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;
  /** The normal texture map. */
  public normalMap: Texture | undefined;

  constructor(options: LambertMaterialOptions = {}) {
    super();
    const { color = Color.WHITE, diffuseMap = undefined, normalMap = undefined } = options;
    this.color = color;
    this.diffuseMap = diffuseMap;
    this.normalMap = normalMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_shininess: 0.0,
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
          u_normalMap: this.normalMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();

    if (this.diffuseMap) {
      (props["u_texOffset"] as number[])[0] = this.diffuseMap.offset.x;
      (props["u_texOffset"] as number[])[1] = this.diffuseMap.offset.y;
      (props["u_texRepeat"] as number[])[0] = this.diffuseMap.repeat.x;
      (props["u_texRepeat"] as number[])[1] = this.diffuseMap.repeat.y;
    } else {
      (props["u_texOffset"] as number[])[0] = 0;
      (props["u_texOffset"] as number[])[1] = 0;
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
    }

    texs["u_diffuseMap"] = this.diffuseMap;
    texs["u_normalMap"] = this.normalMap;

    return this._renderManifest;
  }
}
