import { WebGLRenderPass } from '../WebGLRenderPass.js';
import { AbstractWebGLRenderer } from '../AbstractWebGLRenderer.js';
import { Scene } from '../../core/index.js';
import { Vector3D } from '../../math/index.js';
import { LightDataInterface } from '../../interfaces/index.js';
import { RenderList } from '../../core/Scene.js';
export declare class WebGLMainPass implements WebGLRenderPass {
    name: string;
    execute(renderer: AbstractWebGLRenderer, scene: Scene, vp: Float32Array, camPos: Vector3D, vMat: Float32Array | undefined, renderList: RenderList, extractedLights: LightDataInterface): void;
}
