/// src/renderers/passes/PostProcessPass.ts

import { Scene } from "../../core/Scene.js";
import { WebGPURenderer } from "../WebGPURenderer.js";
import { RenderPass } from "../RenderPass.js";
import { Vector3D } from "../../math/index.js";
import { PostProcessingEffectType } from "../../enums/index.js";
import { ShaderRegistry } from "../../core/renderers/shaders/ShaderRegistry.js";

import FULLSCREEN_VERT_WGSL from "../../core/materials/shaders/PostProcess.vert.wgsl?raw";
import POST_PROCESS_FRAG_WGSL from "../../core/materials/shaders/PostProcess.frag.wgsl?raw";

/**
 * Full-screen post-processing pass (Uber-Shader).
 * Reads the HDR render texture and writes tone-mapped, gamma-corrected output
 * directly to the swap-chain (canvas). No intermediate ping-pong copies.
 */
export class PostProcessPass implements RenderPass {
  public name = "PostProcessPass";

  private _pipeline?: GPURenderPipeline;
  private _bindGroup?: GPUBindGroup;
  private _uniformBuffer?: GPUBuffer;
  private _sampler?: GPUSampler;
  private _uniformData: Float32Array = new Float32Array(16);
  private _builtTextureView?: GPUTextureView;
  private _builtBloomTextureView?: GPUTextureView;

  /**
   * Lazily initialises or rebuilds the pipeline when the HDR texture changes.
   */
  private _build(renderer: WebGPURenderer, bloomActiveView: GPUTextureView): void {
    const device = renderer._device!;

    this._sampler ??= device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    if (!this._uniformBuffer) {
      this._uniformBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    }

    const bgl = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });

    const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl] });

    const vertModule = device.createShaderModule({ code: FULLSCREEN_VERT_WGSL });
    const assembledFrag = ShaderRegistry.instance.assemble(POST_PROCESS_FRAG_WGSL, "wgsl");
    const fragModule = device.createShaderModule({ code: assembledFrag });

    this._pipeline = device.createRenderPipeline({
      layout,
      vertex: { module: vertModule, entryPoint: "vs_main" },
      fragment: {
        module: fragModule,
        entryPoint: "fs_main",
        targets: [{ format: renderer._format }],
      },
      primitive: { topology: "triangle-list" },
    });

    this._bindGroup = device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: this._sampler },
        { binding: 1, resource: renderer._hdrTextureView! },
        { binding: 2, resource: { buffer: this._uniformBuffer } },
        { binding: 3, resource: bloomActiveView },
      ],
    });
  }

  public execute(
    renderer: WebGPURenderer,
    _scene: Scene,
    ce: GPUCommandEncoder,
    _targetView: GPUTextureView,
    _vp: Float32Array,
    _camPos: Vector3D,
  ): void {
    const group = renderer.postProcessing;
    if (!group.enabled || !renderer._hdrTextureView) return;

    const bloom = group.get<import("../post/PostProcessingElement.js").BloomElement>(
      PostProcessingEffectType.BLOOM,
    );
    const bloomActiveView =
      bloom && bloom.enabled && renderer._bloomTextureView
        ? renderer._bloomTextureView
        : renderer._whiteTexView;

    // Rebuild only if we haven't built yet, or if the texture view changed (e.g. resize or bloom toggle)
    if (
      !this._pipeline ||
      this._builtTextureView !== renderer._hdrTextureView ||
      this._builtBloomTextureView !== bloomActiveView
    ) {
      this._build(renderer, bloomActiveView);
      this._builtTextureView = renderer._hdrTextureView;
      this._builtBloomTextureView = bloomActiveView;
    }

    const tm = group.get<import("../post/PostProcessingElement.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../post/PostProcessingElement.js").VignetteElement>(
      PostProcessingEffectType.VIGNETTE,
    );
    const grain = group.get<import("../post/PostProcessingElement.js").GrainElement>(
      PostProcessingEffectType.GRAIN,
    );

    // Write post-process uniforms
    this._uniformData[0] = tm && tm.enabled ? tm.exposure : 1.0;
    this._uniformData[1] = tm && tm.enabled ? 1.0 / tm.gamma : 1.0;

    // Using Float32Array to write u32 is a bit tricky:
    // we can use a DataView or Uint32Array on the same buffer.
    const u32View = new Uint32Array(
      this._uniformData.buffer,
      this._uniformData.byteOffset,
      this._uniformData.length,
    );
    u32View[2] = tm && tm.enabled ? tm.mode : 0;
    u32View[3] = vig && vig.enabled ? 1 : 0;

    this._uniformData[4] = vig ? vig.offset : 1.0;
    this._uniformData[5] = vig ? vig.darkness : 1.0;
    this._uniformData[6] = vig ? vig.roundness : 2.0;

    u32View[7] = grain && grain.enabled ? 1 : 0;
    this._uniformData[8] = grain ? grain.intensity : 0.05;
    this._uniformData[9] = (performance.now() % 100000) / 1000.0; // Time in seconds

    // Repurpose offset 10 and 11 for bloom
    u32View[10] = bloom && bloom.enabled ? 1 : 0;
    this._uniformData[11] = bloom && bloom.enabled ? bloom.intensity : 0.0;

    // Add bloom tint color at offsets 12, 13, 14
    if (bloom && bloom.enabled) {
      this._uniformData[12] = bloom.color.r;
      this._uniformData[13] = bloom.color.g;
      this._uniformData[14] = bloom.color.b;
    } else {
      this._uniformData[12] = 1.0;
      this._uniformData[13] = 1.0;
      this._uniformData[14] = 1.0;
    }
    u32View[15] = group.filterMode; // Replaced padding with filterMode

    renderer._device!.queue.writeBuffer(this._uniformBuffer!, 0, this._uniformData);

    // Final blit directly to the swap-chain (canvas)
    const screenView = renderer._context.getCurrentTexture().createView();
    const rp = ce.beginRenderPass({
      colorAttachments: [
        {
          view: screenView,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    rp.setPipeline(this._pipeline!);
    rp.setBindGroup(0, this._bindGroup!);
    // No vertex buffer needed: vertex position is generated from vertex_index
    rp.draw(3);
    rp.end();
  }
}
