import { Scene } from '../../core/index.js';
import { WebGPURenderer } from '../WebGPU/WebGPURenderer.js';
import { RenderPass } from '../index.js';
import { Vector3D } from '../../math/index.js';
export declare class CascadedShadowPassGPU implements RenderPass {
    name: string;
    private _dummyTargetView?;
    private _dirShadowTexView?;
    private _bindGroupNeedsShadowRebuild;
    private _depthMaterial?;
    /**
     * A snapshot of the global bind group taken BEFORE it ever gets rebuilt to
     * reference the real shadow map (see below). Used only while rendering shadow
     * casters: it still references the dummy fallback shadow textures, so binding
     * it doesn't create a read/write conflict on the shadow map texture we're
     * actively rendering into within the same render pass.
     */
    private _shadowCasterBindGroup?;
    execute(renderer: WebGPURenderer, scene: Scene, _ce: GPUCommandEncoder, _targetView: GPUTextureView, vp: Float32Array, camPos: Vector3D, _vMat?: Float32Array): void;
}
