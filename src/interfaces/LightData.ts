import { Color } from "../core/colors/index.js";
import { Vector3D } from "../math/index.js";
import { PointLight, SpotLight, AreaLight } from "../core/lights/index.js";

/**
 * Interface representing the data for all lights in a scene.
 */
export interface LightDataInterface {
  /** Ambient light color. */
  aCol: Color;
  /** Ambient light intensity. */
  aIntensity: number;
  /** Directional light direction. */
  dDir: Vector3D;
  /** Directional light color. */
  dCol: Color;
  /** Directional light intensity. */
  dIntensity: number;
  /** Reference to the active directional light, if any. */
  dLight?: import("../core/lights/index.js").DirectionalLight;
  /** List of point lights. */
  pLights: PointLight[];
  /** List of spot lights. */
  sLights: SpotLight[];
  /** List of area lights. */
  aLights: AreaLight[];
}
