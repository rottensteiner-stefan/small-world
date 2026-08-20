import FULLSCREEN_VERT_WGSL from "../../../core/materials/shaders/PostProcess.vert.wgsl?raw";
import AO_FRAG_WGSL from "../../../core/materials/shaders/AO.frag.wgsl?raw";
import { HbaoElement } from "../elements/index.js";
import { Topology } from "../../../enums/index.js";

/**
 * Generates the HBAO texture for WebGPU -- same algorithm as AOPassGL, reading the opaque
 * depth texture directly via `textureLoad` (no sampler needed for a `texture_depth_2d`).
 */
export class AOPassGPU {
  private _device: GPUDevice;
  private _pipeline!: GPURenderPipeline;
  private _uniformBuffer!: GPUBuffer;
  private _uniformData: Float32Array = new Float32Array(8);

  private _aoTexture?: GPUTexture;
  private _aoTextureView?: GPUTextureView;
  private _bindGroup?: GPUBindGroup;
  private _builtDepthView?: GPUTextureView;
  private _width = 0;
  private _height = 0;

  constructor(device: GPUDevice) {
    this._device = device;
    this._buildPipeline();
  }

  private _buildPipeline(): void {
    this._uniformBuffer = this._device.createBuffer({
      size: 32, // AOUniforms: 8 x f32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgl = this._device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "depth" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      ],
    });

    const layout = this._device.createPipelineLayout({ bindGroupLayouts: [bgl] });
    const vertModule = this._device.createShaderModule({ code: FULLSCREEN_VERT_WGSL });
    const fragModule = this._device.createShaderModule({ code: AO_FRAG_WGSL });

    this._pipeline = this._device.createRenderPipeline({
      layout,
      vertex: { module: vertModule, entryPoint: "vs_main" },
      fragment: {
        module: fragModule,
        entryPoint: "fs_main",
        targets: [{ format: "r8unorm" }],
      },
      primitive: { topology: Topology.TRIANGLE_LIST },
    });
  }

  private _resize(width: number, height: number, depthView: GPUTextureView): void {
    if (
      this._aoTexture &&
      this._width === width &&
      this._height === height &&
      this._builtDepthView === depthView
    ) {
      return;
    }

    this._aoTexture?.destroy();
    this._width = width;
    this._height = height;
    this._builtDepthView = depthView;

    this._aoTexture = this._device.createTexture({
      size: [width, height],
      format: "r8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this._aoTextureView = this._aoTexture.createView();

    const bgl = this._pipeline.getBindGroupLayout(0);
    this._bindGroup = this._device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: depthView },
        { binding: 1, resource: { buffer: this._uniformBuffer } },
      ],
    });
  }

  /**
   * Renders the HBAO texture from the opaque depth texture.
   * @param ce The command encoder to record into.
   * @param depthView View of the already-captured opaque (pre-transparent) depth texture.
   * @param width Canvas width in pixels.
   * @param height Canvas height in pixels.
   * @param near Camera near plane.
   * @param far Camera far plane.
   * @param projMatrixData The camera's raw perspective projection matrix.
   * @param hbao The HBAO effect parameters (radius, intensity).
   * @returns A view of the single-channel AO texture (R = occlusion factor), or null if unavailable.
   */
  public execute(
    ce: GPUCommandEncoder,
    depthView: GPUTextureView,
    width: number,
    height: number,
    near: number,
    far: number,
    projMatrixData: Float32Array,
    hbao: HbaoElement,
  ): GPUTextureView | null {
    this._resize(width, height, depthView);
    if (!this._aoTexture || !this._aoTextureView || !this._bindGroup) return null;

    // Perspective matrix diagonal scale terms (see Matrix4.perspective): data[0]=A, data[5]=B.
    this._uniformData[0] = near;
    this._uniformData[1] = far;
    this._uniformData[2] = projMatrixData[0]!;
    this._uniformData[3] = projMatrixData[5]!;
    this._uniformData[4] = hbao.radius;
    this._uniformData[5] = hbao.intensity;
    this._device.queue.writeBuffer(this._uniformBuffer, 0, this._uniformData);

    const rp = ce.beginRenderPass({
      colorAttachments: [
        {
          view: this._aoTextureView,
          clearValue: { r: 1, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    rp.setPipeline(this._pipeline);
    rp.setBindGroup(0, this._bindGroup);
    rp.draw(3);
    rp.end();

    return this._aoTextureView;
  }

  public destroy(): void {
    this._aoTexture?.destroy();
    this._uniformBuffer?.destroy();
  }
}
