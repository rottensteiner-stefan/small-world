import { Scene } from './Scene.js';
import { Camera } from './Camera.js';
/**
 * Handles Gamification events: raycasts into the scene and triggers pointer events
 * on Object3D instances (onPointerEnter, onPointerLeave, onPointerClick).
 */
export declare class InteractionManager {
    scene: Scene;
    camera: Camera;
    canvas: HTMLCanvasElement;
    private _raycaster;
    private _ndcCoords;
    private _hoveredObject;
    private _wasLeftDown;
    constructor(scene: Scene, camera: Camera, canvas: HTMLCanvasElement);
    /**
     * Called every frame to process input and fire events.
     */
    update(): void;
    private _clearHover;
    private _getPickableObjects;
}
