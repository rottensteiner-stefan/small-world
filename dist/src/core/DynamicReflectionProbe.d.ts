import { Object3D } from './Object3D.js';
import { Camera } from './Camera.js';
import { Scene } from './Scene.js';
import { Renderer } from '../interfaces/Renderer.js';
import { RenderTargetCube } from './textures/RenderTargetCube.js';
/**
 * A probe that renders the environment into a CubeMap from its position.
 * Features time-slicing to update only a subset of faces per frame for better performance.
 */
export declare class DynamicReflectionProbe extends Object3D {
    renderTarget: RenderTargetCube;
    probeCamera: Camera;
    /** Number of faces to update per frame (1-6). Default is 1 for max performance. */
    facesPerFrame: number;
    private _currentFace;
    /**
     * The 6 directions for the cube faces: +X, -X, +Y, -Y, +Z, -Z
     * WebGL/WebGPU cube map face order:
     * 0: +X (Right)
     * 1: -X (Left)
     * 2: +Y (Top)
     * 3: -Y (Bottom)
     * 4: +Z (Front)
     * 5: -Z (Back)
     */
    private static readonly _FACE_DIRECTIONS;
    constructor(name?: string, resolution?: number);
    /**
     * Updates the environment probe.
     * Renders the specified number of faces into the CubeMap.
     * Call this in your update loop before the main render.
     */
    updateReflection(scene: Scene, renderer: Renderer): void;
}
