import { Scene } from '../../core/index.js';
import { WebGPURenderer } from '../WebGPU/index.js';
import { RenderPass } from '../index.js';
import { Vector3D } from '../../math/index.js';
/**
 * Standard render pass for opaque and skybox objects.
 */
export declare class MainRenderPass implements RenderPass {
    name: string;
    execute(renderer: WebGPURenderer, scene: Scene, ce: GPUCommandEncoder, targetView: GPUTextureView, vp: Float32Array, camPos: Vector3D, vMat?: Float32Array): void;
}
