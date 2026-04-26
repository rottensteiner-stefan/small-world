/// src/interfaces/LightData.ts

import { Color } from "../core/colors/Color.js";
import { Vector3D } from "../math/Vector3D.js";

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
  pLights: any[];
  /** List of spot lights. */
  sLights: any[];
  /** List of area lights. */
  aLights: any[];
}
