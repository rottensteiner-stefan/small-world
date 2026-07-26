import BLOOM_DOWNSAMPLE_WGSL from "../../../core/materials/shaders/BloomDownsample.frag.wgsl?raw";
import BLOOM_UPSAMPLE_WGSL from "../../../core/materials/shaders/BloomUpsample.frag.wgsl?raw";
// Fullscreen triangle vertex shader
import FULLSCREEN_VERT_WGSL from "../../../core/materials/shaders/PostProcess.vert.wgsl?raw";
import { BloomElement } from "../elements/index.js";
import { TextureFilter, TextureWrap, Topology } from "../../../enums/index.js";

/**
 * Handles the Bloom generation (Kawase Dual Filtering) for WebGPU.
 */
export class BloomPassGPU {
  private _device: GPUDevice;
  private _downsamplePipeline!: GPURenderPipeline;
  private _upsamplePipeline!: GPURenderPipeline;
  private _sampler!: GPUSampler;

  private _bloomTexture?: GPUTexture;
  private _mipViews: GPUTextureView[] = [];
  private _downBindGroups: GPUBindGroup[] = [];
  private _upBindGroups: GPUBindGroup[] = [];
  private _uniformBuffers: GPUBuffer[] = []; // Reuse buffers across passes

  private _width = 0;
  private _height = 0;
  private _mipCount = 5;
  private _builtSourceView?: GPUTextureView;

  constructor(device: GPUDevice) {
    this._device = device;
    this._buildPipelines();
  }

  private _buildPipelines(): void {
    this._sampler = this._device.createSampler({
      minFilter: TextureFilter.LINEAR,
      magFilter: TextureFilter.LINEAR,
      addressModeU: TextureWrap.CLAMP_TO_EDGE,
      addressModeV: TextureWrap.CLAMP_TO_EDGE,
    });

    const bgl = this._device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      ],
    });

    const layout = this._device.createPipelineLayout({ bindGroupLayouts: [bgl] });
    const vertModule = this._device.createShaderModule({ code: FULLSCREEN_VERT_WGSL });
    const downModule = this._device.createShaderModule({ code: BLOOM_DOWNSAMPLE_WGSL });
    const upModule = this._device.createShaderModule({ code: BLOOM_UPSAMPLE_WGSL });

    this._downsamplePipeline = this._device.createRenderPipeline({
      layout,
      vertex: { module: vertModule, entryPoint: "vs_main" },
      fragment: {
        module: downModule,
        entryPoint: "fs_main",
        targets: [{ format: "rgba16float" }],
      },
      primitive: { topology: Topology.TRIANGLE_LIST },
    });

    this._upsamplePipeline = this._device.createRenderPipeline({
      layout,
      vertex: { module: vertModule, entryPoint: "vs_main" },
      fragment: {
        module: upModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: "rgba16float",
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: Topology.TRIANGLE_LIST },
    });
  }

  private _resizeMipChain(width: number, height: number, sourceView: GPUTextureView): void {
    // Generate bloom texture size (downscaled to 1/2 size)
    const bloomW = Math.max(1, Math.floor(width / 2));
    const bloomH = Math.max(1, Math.floor(height / 2));

    if (
      this._bloomTexture &&
      this._width === bloomW &&
      this._height === bloomH &&
      this._builtSourceView === sourceView
    ) {
      return;
    }

    if (this._bloomTexture) {
      this._bloomTexture.destroy();
      for (const buf of this._uniformBuffers) buf.destroy();
      this._uniformBuffers = [];
    }

    this._width = bloomW;
    this._height = bloomH;
    this._builtSourceView = sourceView;

    this._bloomTexture = this._device.createTexture({
      size: [bloomW, bloomH, 1],
      format: "rgba16float",
      mipLevelCount: this._mipCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    this._mipViews = [];
    this._downBindGroups = [];
    this._upBindGroups = [];

    // Create a uniform buffer for each level (down + up passes)
    const totalPasses = this._mipCount * 2;
    for (let i = 0; i < totalPasses; i++) {
      this._uniformBuffers.push(
        this._device.createBuffer({
          size: 32, // DownUniforms/UpUniforms size (32 bytes aligned)
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }),
      );
    }

    // 1. Create mip views
    for (let i = 0; i < this._mipCount; i++) {
      this._mipViews.push(
        this._bloomTexture.createView({
          baseMipLevel: i,
          mipLevelCount: 1,
        }),
      );
    }

    const bgl = this._downsamplePipeline.getBindGroupLayout(0);

    // 2. Create downsample bind groups
    for (let i = 0; i < this._mipCount; i++) {
      const readView = i === 0 ? sourceView : this._mipViews[i - 1]!;
      this._downBindGroups.push(
        this._device.createBindGroup({
          layout: bgl,
          entries: [
            { binding: 0, resource: this._sampler },
            { binding: 1, resource: readView },
            { binding: 2, resource: { buffer: this._uniformBuffers[i]! } },
          ],
        }),
      );
    }

    // 3. Create upsample bind groups
    for (let i = this._mipCount - 2; i >= 0; i--) {
      const readView = this._mipViews[i + 1]!;
      const bufIdx = this._mipCount + i;
      this._upBindGroups.push(
        this._device.createBindGroup({
          layout: bgl,
          entries: [
            { binding: 0, resource: this._sampler },
            { binding: 1, resource: readView },
            { binding: 2, resource: { buffer: this._uniformBuffers[bufIdx]! } },
          ],
        }),
      );
    }
  }

  public execute(
    ce: GPUCommandEncoder,
    hdrTexture: GPUTexture,
    hdrTextureView: GPUTextureView,
    bloomConfig: BloomElement,
  ): GPUTextureView | null {
    const width = hdrTexture.width;
    const height = hdrTexture.height;

    this._resizeMipChain(width, height, hdrTextureView);
    if (!this._bloomTexture) return null;

    // --- DOWNSAMPLE ---
    const threshold = bloomConfig.threshold;
    const knee = bloomConfig.softThreshold * threshold + 0.0001;

    let currentW = width;
    let currentH = height;

    for (let i = 0; i < this._mipCount; i++) {
      const destW = Math.max(1, Math.floor(this._width / Math.pow(2, i)));
      const destH = Math.max(1, Math.floor(this._height / Math.pow(2, i)));

      const data = new Float32Array([
        threshold,
        threshold - knee,
        2.0 * knee,
        0.25 / knee,
        1.0 / currentW,
        1.0 / currentH,
        i === 0 ? 1.0 : 0.0, // isFirstPass
        0.0, // padding
      ]);
      this._device.queue.writeBuffer(this._uniformBuffers[i]!, 0, data);

      const rp = ce.beginRenderPass({
        colorAttachments: [
          {
            view: this._mipViews[i]!,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      rp.setPipeline(this._downsamplePipeline);
      rp.setBindGroup(0, this._downBindGroups[i]!);
      rp.draw(3);
      rp.end();

      currentW = destW;
      currentH = destH;
    }

    // --- UPSAMPLE ---
    for (let i = this._mipCount - 2; i >= 0; i--) {
      const srcW = Math.max(1, Math.floor(this._width / Math.pow(2, i + 1)));
      const srcH = Math.max(1, Math.floor(this._height / Math.pow(2, i + 1)));

      const bufIdx = this._mipCount + i;
      const data = new Float32Array([
        1.0 / srcW,
        1.0 / srcH,
        bloomConfig.radius,
        0.0, // padding
      ]);
      this._device.queue.writeBuffer(this._uniformBuffers[bufIdx]!, 0, data);

      const rp = ce.beginRenderPass({
        colorAttachments: [
          {
            view: this._mipViews[i]!,
            loadOp: "load",
            storeOp: "store",
          },
        ],
      });

      rp.setPipeline(this._upsamplePipeline);
      const bgIdx = this._mipCount - 2 - i;
      rp.setBindGroup(0, this._upBindGroups[bgIdx]!);
      rp.draw(3);
      rp.end();
    }

    // Return the largest mip view (index 0) containing the final combined bloom blur
    return this._bloomTexture.createView({ baseMipLevel: 0, mipLevelCount: 1 });
  }

  public destroy(): void {
    if (this._bloomTexture) this._bloomTexture.destroy();
    for (const buf of this._uniformBuffers) buf.destroy();
  }
}
