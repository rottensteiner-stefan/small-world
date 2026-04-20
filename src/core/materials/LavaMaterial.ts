/// src/core/materials/LavaMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

/**
 * Configuration options for LavaMaterial.
 */
export interface LavaMaterialOptions {
  /** The base glow color of the lava. Defaults to bright orange/yellow. */
  color?: Color;
  /** The color of the cooled crust. Defaults to dark grey. */
  crustColor?: Color;
  /** The speed of the lava flow animation. Defaults to 1.0. */
  flowSpeed?: number;
  /** The scale of the noise. Defaults to 2.0. */
  noiseScale?: number;
  /** A noise texture map used to generate the crust and flow. */
  noiseMap?: Texture | undefined;
}

/**
 * A highly specialized material for rendering animated, glowing lava.
 * Requires a noise map to generate the flowing crust effect on the GPU.
 */
export class LavaMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.LAVA;

  /** The color of the cooled crust. */
  public crustColor: Color;
  /** The speed of the lava flow. */
  public flowSpeed: number;
  /** The scale of the noise pattern. */
  public noiseScale: number;
  /** The current time/frame for animation. */
  public time: number = 0.0;
  /** The noise texture. */
  public noiseMap: Texture | undefined;

  /**
   * Creates a new LavaMaterial.
   * @param options The configuration options.
   */
  constructor(options: LavaMaterialOptions = {}) {
    super();
    const {
      color = new Color(1.5, 0.5, 0.0), // Over-bright for pseudo-bloom
      crustColor = new Color(0.1, 0.1, 0.1),
      flowSpeed = 1.0,
      noiseScale = 2.0,
      noiseMap = undefined,
    } = options;
    
    this.color = color;
    this.crustColor = crustColor;
    this.flowSpeed = flowSpeed;
    this.noiseScale = noiseScale;
    this.noiseMap = noiseMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: this.crustColor.toFloat32Array(), // Alias for crustColor in UBO
          u_time: this.time,
          u_flowSpeed: this.flowSpeed,
          u_noiseScale: this.noiseScale,
        },
        textures: {
          u_diffuseMap: this.noiseMap, // Base generic slot
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    props["u_specColor"] = this.crustColor.toFloat32Array();
    props["u_time"] = this.time;
    props["u_flowSpeed"] = this.flowSpeed;
    props["u_noiseScale"] = this.noiseScale;

    texs["u_diffuseMap"] = this.noiseMap;

    this._renderManifest.state = {
      ...this._renderManifest.state,
      culling: this.cullMode,
    };

    return this._renderManifest;
  }
}
