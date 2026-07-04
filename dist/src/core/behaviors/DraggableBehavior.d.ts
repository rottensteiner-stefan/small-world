import { Behavior } from './Behavior.js';
import { Object3D } from '../Object3D.js';
import { Camera } from '../Camera.js';
/**
 * Allows an object to be dragged around in 3D space.
 * Dragging happens on a plane parallel to the camera view.
 */
export declare class DraggableBehavior extends Behavior {
    private _camera;
    private _isDragging;
    private _planeNormal;
    private _planePoint;
    private _dragOffset;
    constructor(camera: Camera);
    onAttach(target: Object3D): void;
    onDetach(): void;
    update(_deltaTime: number): void;
}
