import { Scene } from '../../core/Scene.js';
import { WebGPURenderer } from '../WebGPURenderer.js';
import { RenderPass } from '../RenderPass.js';
import { Vector3D } from '../../math/index.js';
/**
 * Full-screen post-processing pass (Uber-Shader).
 * Reads the HDR render texture and writes tone-mapped, gamma-corrected output
 * directly to the swap-chain (canvas). No intermediate ping-pong copies.
 */
export declare class PostProcessPass implements RenderPass {
    name: string;
    private _pipeline?;
    private _bindGroup?;
    private _uniformBuffer?;
    private _sampler?;
    private _uniformData;
    private _builtTextureView?;
    private _builtBloomTextureView?;
    private _compiledSignature?;
    private _getSignature;
    /**
     * Lazily initialises or rebuilds the pipeline when the HDR texture changes.
     */
    private _build;
    execute(renderer: WebGPURenderer, _scene: Scene, ce: GPUCommandEncoder, _targetView: GPUTextureView, _vp: Float32Array, _camPos: Vector3D): void;
}
