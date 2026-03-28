/// src/core/lights/DirectionalLight.ts

import { AbstractLight, LightOptions } from "./AbstractLight.js";
import { LightType } from "../../enums/LightType.js";
import { Vector3D } from "../../math/Vector3D.js";

/**
 * Configuration options for directional light.
 */
export interface DirectionalLightOptions extends LightOptions {
  /** The direction of the light. Defaults to (0, -1, 0). */
  direction?: Vector3D;
}

/**
 * Directional light that emits light in a specific direction.
 */
export class DirectionalLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.DIRECTIONAL;

  /** The direction of the light. */
  public direction: Vector3D;

  /**
   * Creates a new DirectionalLight.
   * @param options The configuration options for the light.
   */
  constructor(options: DirectionalLightOptions = {}) {
    const { direction = new Vector3D(0, -1, 0).normalize(), name = "DirectionalLight" } = options;
    super({ ...options, name });
    this.direction = direction;
  }
}
