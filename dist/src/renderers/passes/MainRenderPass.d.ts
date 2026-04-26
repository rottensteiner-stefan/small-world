import { Scene } from '../../core/Scene.js';
import { WebGPURenderer } from '../WebGPURenderer.js';
import { RenderPass } from '../RenderPass.js';
/**
 * Standard render pass for opaque and skybox objects.
 */
export declare class MainRenderPass implements RenderPass {
    name: string;
    execute(renderer: WebGPURenderer, scene: Scene, ce: GPUCommandEncoder, targetView: GPUTextureView, _vp: Float32Array, _camPos: any, vMat?: Float32Array): void;
}
