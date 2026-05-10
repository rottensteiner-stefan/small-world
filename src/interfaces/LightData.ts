/// src/interfaces/LightData.ts

import { Color } from "../core/colors/Color.js";
import { Vector3D } from "../math/Vector3D.js";
import { PointLight } from "../core/lights/PointLight.js";
import { SpotLight } from "../core/lights/SpotLight.js";
import { AreaLight } from "../core/lights/AreaLight.js";

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
  /** List of point lights. */
  pLights: PointLight[];
  /** List of spot lights. */
  sLights: SpotLight[];
  /** List of area lights. */
  aLights: AreaLight[];
}
