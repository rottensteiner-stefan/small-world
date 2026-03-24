/// src/core/lights/SpotLight.ts
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { AbstractLight } from "./AbstractLight.js";
import { Vector3D } from "../../math/Vector3D.js";

/**
 * Spot light that emits light in a cone shape.
 */
export class SpotLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.SPOT;

  /** The direction of the light. */
  public direction: Vector3D = new Vector3D(0, -1, 0).normalize();

  /**
   * Creates a new SpotLight.
   * @param color The color of the light.
   * @param intensity The intensity of the light.
   * @param distance The maximum distance of the light.
   * @param angle The angle of the light cone in radians.
   * @param penumbra The penumbra factor (0-1).
   * @param decay The decay factor of the light.
   */
  constructor(
    color: Color = Color.WHITE,
    intensity: number = 1.0,
    public distance: number = 50.0,
    public angle: number = Math.PI / 6,
    public penumbra: number = 0.5,
    public decay: number = 2.0,
  ) {
    super(color, intensity, "SpotLight");
  }
}
