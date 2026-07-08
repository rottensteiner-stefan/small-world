import { Object3D } from './Object3D.js';
import { Camera } from './Camera.js';
import { Scene } from './Scene.js';
import { Renderer } from '../interfaces/index.js';
import { RenderTarget } from './textures/index.js';
/**
 * A node that renders the scene from a mirrored perspective into a RenderTarget.
 */
export declare class PlanarReflectionNode extends Object3D {
    renderTarget: RenderTarget;
    mirrorCamera: Camera;
    private _planeNormal;
    private _planeConstant;
    constructor(name?: string, width?: number, height?: number);
    /**
     * Updates the reflection texture by rendering the scene from a mirrored camera.
     * Call this in your update loop before the main render.
     */
    updateReflection(scene: Scene, mainCamera: Camera, renderer: Renderer): void;
}
