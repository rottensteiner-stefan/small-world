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
  private _uniformData: Float32Array = new Float32Array(4); // Only needs 16 bytes for time
  private _builtTextureView?: GPUTextureView;
  private _builtBloomTextureView?: GPUTextureView;
  private _compiledSignature?: string;

  private _getSignature(
    group: import("../post/PostProcessingGroup.js").PostProcessingGroup,
  ): string {
    const tm = group.get<import("../post/PostProcessingElement.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../post/PostProcessingElement.js").VignetteElement>(
      PostProcessingEffectType.VIGNETTE,
    );
    const grain = group.get<import("../post/PostProcessingElement.js").GrainElement>(
      PostProcessingEffectType.GRAIN,
    );
    const bloom = group.get<import("../post/PostProcessingElement.js").BloomElement>(
      PostProcessingEffectType.BLOOM,
    );
    const quant = group.get<import("../post/PostProcessingElement.js").QuantizeElement>(
      PostProcessingEffectType.QUANTIZE,
    );

    return [
      group.filterMode,
      tm && tm.enabled ? 1 : 0,
      tm && tm.enabled ? tm.mode : 0,
      tm && tm.enabled ? tm.exposure : 1.0,
      tm && tm.enabled ? tm.gamma : 2.2,
      vig && vig.enabled ? 1 : 0,
      vig && vig.enabled ? vig.offset : 0.8,
      vig && vig.enabled ? vig.darkness : 0.5,
      vig && vig.enabled ? vig.roundness : 2.0,
      grain && grain.enabled ? 1 : 0,
      grain && grain.enabled ? grain.intensity : 0.05,
      bloom && bloom.enabled ? 1 : 0,
      bloom && bloom.enabled ? bloom.intensity : 1.0,
      bloom && bloom.enabled ? `${bloom.color.r},${bloom.color.g},${bloom.color.b}` : "1,1,1",
      quant && quant.enabled ? 1 : 0,
      quant && quant.enabled ? quant.steps : 8.0,
    ].join("|");
  }

  /**
   * Lazily initialises or rebuilds the pipeline when the HDR texture changes.
   */
  private _build(
    renderer: WebGPURenderer,
    bloomActiveView: GPUTextureView,
    group: import("../post/PostProcessingGroup.js").PostProcessingGroup,
  ): void {
    const device = renderer._device!;

    this._sampler ??= device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    if (!this._uniformBuffer) {
      this._uniformBuffer = device.createBuffer({
        size: 16, // Only u_time uniform
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
    let assembledFrag = ShaderRegistry.instance.assemble(POST_PROCESS_FRAG_WGSL, "wgsl");

    const tm = group.get<import("../post/PostProcessingElement.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../post/PostProcessingElement.js").VignetteElement>(
      PostProcessingEffectType.VIGNETTE,
    );
    const grain = group.get<import("../post/PostProcessingElement.js").GrainElement>(
      PostProcessingEffectType.GRAIN,
    );
    const bloom = group.get<import("../post/PostProcessingElement.js").BloomElement>(
      PostProcessingEffectType.BLOOM,
    );
    const quant = group.get<import("../post/PostProcessingElement.js").QuantizeElement>(
      PostProcessingEffectType.QUANTIZE,
    );

    const tmEnabled = tm && tm.enabled;
    const vigEnabled = vig && vig.enabled;
    const grainEnabled = grain && grain.enabled;
    const bloomEnabled = bloom && bloom.enabled;
    const quantEnabled = quant && quant.enabled;

    // Inject static parameters as WGSL constants, replacing default fallback declarations
    assembledFrag = assembledFrag.replace(
      "const u_exposure: f32 = 1.0;",
      `const u_exposure: f32 = ${tmEnabled ? tm.exposure.toFixed(6) : "1.0"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_inverseGamma: f32 = 1.0;",
      `const u_inverseGamma: f32 = ${tmEnabled ? (1.0 / tm.gamma).toFixed(6) : "1.0"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_toneMappingMode: u32 = 0u;",
      `const u_toneMappingMode: u32 = ${tmEnabled ? tm.mode : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_vignetteEnabled: u32 = 0u;",
      `const u_vignetteEnabled: u32 = ${vigEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_vignetteOffset: f32 = 0.8;",
      `const u_vignetteOffset: f32 = ${vig ? vig.offset.toFixed(6) : "0.8"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_vignetteDarkness: f32 = 0.5;",
      `const u_vignetteDarkness: f32 = ${vig ? vig.darkness.toFixed(6) : "0.5"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_vignetteRoundness: f32 = 2.0;",
      `const u_vignetteRoundness: f32 = ${vig ? vig.roundness.toFixed(6) : "2.0"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_grainEnabled: u32 = 0u;",
      `const u_grainEnabled: u32 = ${grainEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_grainIntensity: f32 = 0.05;",
      `const u_grainIntensity: f32 = ${grain ? grain.intensity.toFixed(6) : "0.05"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_bloomEnabled: u32 = 0u;",
      `const u_bloomEnabled: u32 = ${bloomEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_bloomIntensity: f32 = 1.0;",
      `const u_bloomIntensity: f32 = ${bloom ? bloom.intensity.toFixed(6) : "1.0"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_bloomColor: vec3f = vec3f(1.0, 1.0, 1.0);",
      `const u_bloomColor: vec3f = vec3f(${bloom ? `${bloom.color.r.toFixed(6)}, ${bloom.color.g.toFixed(6)}, ${bloom.color.b.toFixed(6)}` : "1.0, 1.0, 1.0"});`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_quantizeEnabled: u32 = 0u;",
      `const u_quantizeEnabled: u32 = ${quantEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_quantizeSteps: f32 = 8.0;",
      `const u_quantizeSteps: f32 = ${quant ? quant.steps.toFixed(6) : "8.0"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_filterMode: u32 = 0u;",
      `const u_filterMode: u32 = ${group.filterMode}u;`,
    );

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

    const sig = this._getSignature(group);

    // Rebuild if we haven't built yet, if the signature changed, or if the texture views changed
    if (
      !this._pipeline ||
      sig !== this._compiledSignature ||
      this._builtTextureView !== renderer._hdrTextureView ||
      this._builtBloomTextureView !== bloomActiveView
    ) {
      this._build(renderer, bloomActiveView, group);
      this._compiledSignature = sig;
      this._builtTextureView = renderer._hdrTextureView;
      this._builtBloomTextureView = bloomActiveView;
    }

    // Write post-process dynamic uniforms (only time uniform is active)
    this._uniformData[0] = (performance.now() % 100000) / 1000.0; // Time in seconds

    renderer._device!.queue.writeBuffer(this._uniformBuffer!, 0, this._uniformData);

    // Final blit directly to the swap-chain (canvas)
    const screenView = renderer._context.getCurrentTexture().createView();
    const rp = ce.beginRenderPass({
      colorAttachments: [
        {
          view: screenView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
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
