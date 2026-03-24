/// src/core/lights/DirectionalLight.ts
import { AbstractLight } from "./AbstractLight.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { Vector3D } from "../../math/Vector3D.js";

/**
 * Directional light that emits light in a specific direction.
 */
export class DirectionalLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.DIRECTIONAL;

  /** The direction of the light. */
  public direction: Vector3D = new Vector3D(0, -1, 0).normalize();

  /**
   * Creates a new DirectionalLight.
   * @param color The color of the light.
   * @param intensity The intensity of the light.
   */
  constructor(color: Color = Color.WHITE, intensity: number = 1.0) {
    super(color, intensity, "DirectionalLight");
  }
}
