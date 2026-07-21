import { WebGLRenderPass } from '../WebGLRenderPass.js';
import { AbstractWebGLRenderer } from '../AbstractWebGLRenderer.js';
import { Scene } from '../../core/index.js';
import { Vector3D } from '../../math/index.js';
import { LightDataInterface } from '../../interfaces/index.js';
import { RenderList } from '../../core/Scene.js';
export declare class WebGLPostProcessPass implements WebGLRenderPass {
    name: string;
    execute(renderer: AbstractWebGLRenderer, _scene: Scene, _vp: Float32Array, _camPos: Vector3D, _vMat: Float32Array | undefined, _renderList: RenderList, _extractedLights: LightDataInterface): void;
}
