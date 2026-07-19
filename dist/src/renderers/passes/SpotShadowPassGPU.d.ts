import { Scene } from '../../core/index.js';
import { WebGPURenderer } from '../WebGPU/WebGPURenderer.js';
import { RenderPass } from '../index.js';
import { Vector3D } from '../../math/index.js';
export declare class SpotShadowPassGPU implements RenderPass {
    name: string;
    private _dummyTargetView?;
    private _bindGroupNeedsShadowRebuild;
    private _depthMaterial?;
    private _shadowCasterBindGroup?;
    private _spotShadowTexView?;
    private _fbo?;
    private _frustum;
    execute(renderer: WebGPURenderer, scene: Scene, _ce: GPUCommandEncoder, _targetView: GPUTextureView, vp: Float32Array, camPos: Vector3D): void;
}
