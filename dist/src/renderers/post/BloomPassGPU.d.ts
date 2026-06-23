import { BloomElement } from './PostProcessingElement.js';
/**
 * Handles the Bloom generation (Kawase Dual Filtering) for WebGPU.
 */
export declare class BloomPassGPU {
    private _device;
    private _downsamplePipeline;
    private _upsamplePipeline;
    private _sampler;
    private _bloomTexture?;
    private _mipViews;
    private _downBindGroups;
    private _upBindGroups;
    private _uniformBuffers;
    private _width;
    private _height;
    private _mipCount;
    private _builtSourceView?;
    constructor(device: GPUDevice);
    private _buildPipelines;
    private _resizeMipChain;
    execute(ce: GPUCommandEncoder, hdrTexture: GPUTexture, hdrTextureView: GPUTextureView, bloomConfig: BloomElement): GPUTextureView | null;
    destroy(): void;
}
