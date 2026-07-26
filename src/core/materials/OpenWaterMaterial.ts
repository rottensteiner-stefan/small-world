import vertWGSL from "./shaders/OpenWater.vert.wgsl?raw";
import fragWGSL from "./shaders/OpenWater.frag.wgsl?raw";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../renderers/shaders/index.js";

export interface OpenWaterMaterialOptions {
  waterColor?: Color;
  deepWaterColor?: Color;
  edgeColor?: Color;
  edgeSoftness?: number;
  speed?: number;
  wave1?: [number, number, number, number];
  wave2?: [number, number, number, number];
  wave3?: [number, number, number, number];
}

export class OpenWaterMaterial extends AbstractMaterial {
  public override color: Color;
  public deepWaterColor: Color;
  public edgeColor: Color;
  public edgeSoftness: number;
  public speed: number;
  public wave1: [number, number, number, number];
  public wave2: [number, number, number, number];
  public wave3: [number, number, number, number];
  public time: number = 0.0;

  constructor(options: OpenWaterMaterialOptions = {}) {
    super(MaterialType.OPEN_WATER);
    const {
      waterColor = new Color(0.0, 0.5, 0.8),
      deepWaterColor = new Color(0.0, 0.1, 0.3),
      edgeColor = new Color(0.8, 0.9, 1.0),
      edgeSoftness = 1.0,
      speed = 1.0,
      wave1 = [1.0, 0.5, 0.1, 10.0],
      wave2 = [0.2, 0.8, 0.15, 6.0],
      wave3 = [-0.3, 0.7, 0.05, 3.0],
    } = options;

    this.color = waterColor;
    this.deepWaterColor = deepWaterColor;
    this.edgeColor = edgeColor;
    this.edgeSoftness = edgeSoftness;
    this.speed = speed;
    this.wave1 = wave1;
    this.wave2 = wave2;
    this.wave3 = wave3;

    this.transparent = true;
    this.depthWrite = false;
  }

  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = this._createBaseManifest();
      this._renderManifest.properties["u_specColor"] = this.deepWaterColor.toFloat32Array();
      // u_texOffset/u_texRepeat carry edgeColor.rgb + edgeSoftness here, not actual texture
      // UV offset/repeat — StandardWebGPULayout only has 3 free vec4 slots (already used by
      // wave1/2/3 below), so these unrelated vec2 slots are repurposed to fit edge shading data.
      this._renderManifest.properties["u_texOffset"] = [this.edgeColor.r, this.edgeColor.g];
      this._renderManifest.properties["u_texRepeat"] = [this.edgeColor.b, this.edgeSoftness];
      this._renderManifest.properties["u_extraParams"] = [...this.wave1];
      this._renderManifest.properties["u_liquidParams"] = [...this.wave2];
      this._renderManifest.properties["u_thresholds"] = [...this.wave3];
      this._renderManifest.properties["u_reflectivity"] = this.speed;
      this._renderManifest.properties["u_time"] = this.time;
    }

    this._syncBaseManifestState();

    const props = this._renderManifest.properties as Record<string, unknown>;
    props["u_specColor"] = this.deepWaterColor.toFloat32Array();

    const offset = props["u_texOffset"] as number[];
    offset[0] = this.edgeColor.r;
    offset[1] = this.edgeColor.g;

    const repeat = props["u_texRepeat"] as number[];
    repeat[0] = this.edgeColor.b;
    repeat[1] = this.edgeSoftness;

    const e = props["u_extraParams"] as number[];
    e[0] = this.wave1[0];
    e[1] = this.wave1[1];
    e[2] = this.wave1[2];
    e[3] = this.wave1[3];

    const l = props["u_liquidParams"] as number[];
    l[0] = this.wave2[0];
    l[1] = this.wave2[1];
    l[2] = this.wave2[2];
    l[3] = this.wave2[3];

    const t = props["u_thresholds"] as number[];
    t[0] = this.wave3[0];
    t[1] = this.wave3[1];
    t[2] = this.wave3[2];
    t[3] = this.wave3[3];

    props["u_reflectivity"] = this.speed;
    props["u_time"] = this.time;

    return this._renderManifest;
  }

  public override getShaderDefinition(): ShaderDefinition {
    return {
      id: this.type,
      sources: {
        wgsl: `${vertWGSL}\n[WGSL_PBR_MATH]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
      },
    };
  }
}
