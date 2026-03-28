/// src/core/lights/AmbientLight.ts

import { AbstractLight, LightOptions } from "./AbstractLight.js";
import { LightType } from "../../enums/index.js";

/**
 * Configuration options for ambient light.
 */
export interface AmbientLightOptions extends LightOptions {}

/**
 * Ambient light that illuminates all objects in the scene equally.
 */
export class AmbientLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.AMBIENT;

  /**
   * Creates a new AmbientLight.
   * @param options The configuration options for the light.
   */
  constructor(options: AmbientLightOptions = {}) {
    const { name = "AmbientLight" } = options;
    super({ ...options, name });
  }
}
