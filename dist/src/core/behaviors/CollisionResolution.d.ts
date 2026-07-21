import { CameraInterfaceData } from '../../interfaces/index.js';
import { Object3D } from '../Object3D.js';
import { Scene } from '../Scene.js';
import { BoundingSphere } from '../../physix/index.js';
/**
 * Resolves sphere-vs-scene collisions for a character-style controller, pushing
 * `target.position` out of any overlapping static/dynamic/spatial-hash geometry.
 * Shared by FirstPersonController and FPSController.
 */
export declare function resolveSphereCollisions(collider: BoundingSphere | undefined, target: (Object3D | CameraInterfaceData) | undefined, scene: Scene | undefined): void;
