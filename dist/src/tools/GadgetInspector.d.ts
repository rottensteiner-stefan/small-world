import { Scene } from '../core/Scene.js';
import { CameraInterfaceData } from '../interfaces/index.js';
import { Object3D } from '../core/Object3D.js';
/**
 * A lightweight editor/inspector overlay for small-world.
 * Uses Raycasting for object picking and Tweakpane for property editing.
 */
export declare class GadgetInspector {
    private _scene;
    private _camera;
    private _canvas;
    private _pane;
    private _raycaster;
    private _mouse;
    private _selectedObject;
    private _highlightMesh;
    private _folder;
    /**
     * Creates a new Gadget Inspector overlay.
     * @param _scene The scene to inspect.
     * @param _camera The camera used to raycast.
     * @param _canvas The canvas to attach picking events to.
     */
    constructor(_scene: Scene, _camera: CameraInterfaceData, _canvas: HTMLCanvasElement);
    private _getAllObjects;
    private _onPointerDown;
    /**
     * Selects an object and updates the GUI.
     * @param obj The object to select.
     */
    selectObject(obj: Object3D): void;
    /**
     * Deselects the current object.
     */
    deselect(): void;
    /**
     * Rebuilds the Tweakpane UI for the selected object.
     * @param obj The newly selected object.
     */
    private _buildGUI;
    /**
     * Updates the inspector logic (should be called in the render loop).
     */
    update(): void;
}
