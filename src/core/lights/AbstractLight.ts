/// src/core/lights/AbstractLight.ts

import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { Object3D } from "../Object3D.js";
import { LightDataInterface } from "../../interfaces/index.js";

/**
 * Configuration options for lights.
 */
export interface LightOptions {
  /** The color of the light. Defaults to white. */
  color?: Color;
  /** The intensity of the light. Defaults to 1.0. */
  intensity?: number;
  /** The name of the light object. Defaults to "Light". */
  name?: string;
  /** Whether the light casts shadows. Defaults to false. */
  castShadow?: boolean;
  /** The resolution of the shadow map for this light. Defaults to 512. */
  shadowResolution?: number;
}

/**
 * Base class for all light types.
 */
export abstract class AbstractLight extends Object3D {
  /** The type of the light. */
  public abstract readonly type: LightType;

  /** The color of the light. */
  public color: Color;

  /** The intensity of the light. */
  public intensity: number;

  /** Whether the light casts shadows. */
  public castShadow: boolean;

  /** The resolution of the shadow map for this light. */
  public shadowResolution: number;

  /**
   * Applies the light's data to the collective light data structure.
   * @param data The structure to populate.
   */
  public abstract applyTo(data: LightDataInterface): void;

  /**
   * Creates a new AbstractLight.
   * @param options The configuration options for the light.
   */
  protected constructor(options: LightOptions = {}) {
    const {
      color = Color.WHITE,
      intensity = 1.0,
      name = "Light",
      castShadow = false,
      shadowResolution = 512,
    } = options;
    super(name);
    this.color = color;
    this.intensity = intensity;
    this.castShadow = castShadow;
    this.shadowResolution = shadowResolution;
  }
}
