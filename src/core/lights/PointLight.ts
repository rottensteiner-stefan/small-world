import { AbstractLight, LightOptions, MAX_CLUSTERED_LIGHTS_PER_TYPE } from "./AbstractLight.js";
import { LightType } from "../../enums/index.js";
import { LightDataInterface } from "../../interfaces/index.js";

/**
 * Configuration options for point light.
 */
export interface PointLightOptions extends LightOptions {
  /** The maximum distance of the light. Defaults to 50.0. */
  distance?: number;
  /** The decay factor of the light. Defaults to 2.0. */
  decay?: number;
}

/**
 * Point light that emits light in all directions from a single point.
 */
export class PointLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.POINT;

  /** The maximum distance of the light. */
  public distance: number;

  /** The decay factor of the light. */
  public decay: number;

  /**
   * Creates a new PointLight.
   * @param options The configuration options for the light.
   */
  constructor(options: PointLightOptions = {}) {
    const { distance = 50.0, decay = 2.0, name = "PointLight" } = options;
    super({ ...options, name });
    this.distance = distance;
    this.decay = decay;
  }

  /** @inheritdoc */
  public override applyTo(data: LightDataInterface): void {
    // Global cap, not per-object nearest-N selection -- see docs/adr/0004-point-spot-light-global-cap.md.
    if (MAX_CLUSTERED_LIGHTS_PER_TYPE > data.pLights.length) {
      data.pLights.push(this);
    }
  }
}
