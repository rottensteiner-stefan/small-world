/// src/interfaces/CameraConstraints.ts

import { Vector3D } from "../math/Vector3D.js";

/**
 * Interface defining spatial constraints for the camera position or target.
 */
export interface CameraConstraints {
  /** The minimum world coordinates (bounding box min). */
  min?: Vector3D;
  /** The maximum world coordinates (bounding box max). */
  max?: Vector3D;
}
