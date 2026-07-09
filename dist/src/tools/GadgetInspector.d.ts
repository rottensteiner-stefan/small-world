import { FolderApi } from 'tweakpane';
import { Scene, Object3D } from '../core/index.js';
import { CameraInterfaceData, Renderer } from '../interfaces/index.js';
import { ForgeTool, ForgeToolOptions } from './forge/ForgeTool.js';
/**
 * A lightweight editor/inspector overlay for small-world.
 * Uses Raycasting for object picking and Tweakpane for property editing.
 */
export declare class GadgetInspector extends ForgeTool {
    private _scene;
    private _camera;
    private _canvas;
    private _renderer?;
    private _pane;
    private _raycaster;
    private _mouse;
    private _selectedObject;
    private _highlightMesh;
    private _folder;
    private _stats;
    private _resolutionBinding?;
    private _fpsBinding?;
    private _objectsBinding?;
    private _visibleBinding?;
    private _lastFpsUpdate;
    private _frameCount;
    /**
     * Creates a new Gadget Inspector overlay.
     * @param _scene The scene to inspect.
     * @param _camera The camera used to raycast.
     * @param _canvas The canvas to attach picking events to.
     * @param _renderer The active renderer instance.
     */
    constructor(_scene: Scene, _camera: CameraInterfaceData, _canvas: HTMLCanvasElement, _renderer?: Renderer | undefined, options?: ForgeToolOptions);
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
     * Adds a top-level scene control folder to the inspector.
     * Use this from examples to expose custom runtime parameters (e.g. ball count sliders).
     * @param title The folder title shown in the UI.
     * @returns The created FolderApi instance for adding bindings.
     */
    addSceneFolder(title: string): FolderApi;
    /**
     * Updates the inspector logic (should be called in the render loop).
     */
    update(): void;
    private _countSceneObjects;
    getState(): unknown;
    setState(_state: unknown): void;
}
