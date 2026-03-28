/// src/core/lights/AreaLight.ts

import { LightOptions, AbstractLight } from "./AbstractLight.js";
import { LightType } from "../../enums/index.js";

/**
 * Configuration options for area light.
 */
export interface AreaLightOptions extends LightOptions {
  /** The width of the light area. Defaults to 5.0. */
  width?: number;
  /** The height/length of the light area. Defaults to 5.0. */
  height?: number;
}

/**
 * Area light that emits light from a rectangular plane.
 */
export class AreaLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.AREA;

  /** The width of the light area. */
  public width: number;

  /** The height/length of the light area. */
  public height: number;

  /**
   * Creates a new AreaLight.
   * @param options The configuration options for the light.
   */
  constructor(options: AreaLightOptions = {}) {
    const { width = 5.0, height = 5.0, name = "AreaLight" } = options;
    super({ ...options, name });
    this.width = width;
    this.height = height;
  }
}
