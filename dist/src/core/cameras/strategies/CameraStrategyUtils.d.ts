import { CameraConstraints } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/index.js';
/**
 * Clamps a vector in-place against optional min/max constraints.
 * Shared by the camera strategies to avoid duplicating the same
 * min/max branching in each of them.
 */
export declare function clampVector(vector: Vector3D, constraints: CameraConstraints | undefined): void;
