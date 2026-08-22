import FULLSCREEN_VERT_WGSL from "../../core/materials/shaders/PostProcess.vert.wgsl?raw";
import POST_PROCESS_FRAG_WGSL from "../../core/materials/shaders/PostProcess.frag.wgsl?raw";
import { Scene } from "../../core/index.js";
import { WebGPURenderer } from "../WebGPU/index.js";
import { RenderPass } from "../index.js";
import { Vector3D } from "../../math/index.js";
import {
  PostProcessingEffectType,
  TextureFilter,
  TextureWrap,
  Topology,
} from "../../enums/index.js";
import { ShaderRegistry } from "../../core/renderers/shaders/index.js";

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
  private _builtHbaoTextureView?: GPUTextureView;
  private _compiledSignature?: string;

  private _getSignature(group: import("../post/index.js").PostProcessingGroup): string {
    const tm = group.get<import("../post/index.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../post/index.js").VignetteElement>(
      PostProcessingEffectType.VIGNETTE,
    );
    const grain = group.get<import("../post/index.js").GrainElement>(
      PostProcessingEffectType.GRAIN,
    );
    const bloom = group.get<import("../post/index.js").BloomElement>(
      PostProcessingEffectType.BLOOM,
    );
    const quant = group.get<import("../post/index.js").QuantizeElement>(
      PostProcessingEffectType.QUANTIZE,
    );
    const hbao = group.get<import("../post/index.js").HbaoElement>(PostProcessingEffectType.HBAO);
    const outline = group.get<import("../post/index.js").OutlineElement>(
      PostProcessingEffectType.OUTLINE,
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
      hbao && hbao.enabled ? 1 : 0,
      outline && outline.enabled ? 1 : 0,
      outline && outline.enabled ? outline.thickness : 1.0,
      outline && outline.enabled ? outline.sensitivity : 1.0,
      outline && outline.enabled
        ? `${outline.color.r},${outline.color.g},${outline.color.b}`
        : "0,0,0",
    ].join("|");
  }

  /**
   * Lazily initialises or rebuilds the pipeline when the HDR texture changes.
   */
  private _build(
    renderer: WebGPURenderer,
    colorView: GPUTextureView,
    bloomActiveView: GPUTextureView,
    hbaoActiveView: GPUTextureView,
    group: import("../post/index.js").PostProcessingGroup,
  ): void {
    const device = renderer.gpuDevice!;

    this._sampler ??= device.createSampler({
      minFilter: TextureFilter.LINEAR,
      magFilter: TextureFilter.LINEAR,
      addressModeU: TextureWrap.CLAMP_TO_EDGE,
      addressModeV: TextureWrap.CLAMP_TO_EDGE,
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
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });

    const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl] });

    const vertModule = device.createShaderModule({ code: FULLSCREEN_VERT_WGSL });
    let assembledFrag = ShaderRegistry.instance.assemble(POST_PROCESS_FRAG_WGSL, "wgsl");

    const tm = group.get<import("../post/index.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../post/index.js").VignetteElement>(
      PostProcessingEffectType.VIGNETTE,
    );
    const grain = group.get<import("../post/index.js").GrainElement>(
      PostProcessingEffectType.GRAIN,
    );
    const bloom = group.get<import("../post/index.js").BloomElement>(
      PostProcessingEffectType.BLOOM,
    );
    const quant = group.get<import("../post/index.js").QuantizeElement>(
      PostProcessingEffectType.QUANTIZE,
    );
    const hbao = group.get<import("../post/index.js").HbaoElement>(PostProcessingEffectType.HBAO);
    const outline = group.get<import("../post/index.js").OutlineElement>(
      PostProcessingEffectType.OUTLINE,
    );

    const tmEnabled = tm && tm.enabled;
    const vigEnabled = vig && vig.enabled;
    const grainEnabled = grain && grain.enabled;
    const bloomEnabled = bloom && bloom.enabled;
    const quantEnabled = quant && quant.enabled;
    const hbaoEnabled = hbao && hbao.enabled;
    const outlineEnabled = outline && outline.enabled;

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
      "const u_hbaoEnabled: u32 = 0u;",
      `const u_hbaoEnabled: u32 = ${hbaoEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_outlineEnabled: u32 = 0u;",
      `const u_outlineEnabled: u32 = ${outlineEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_outlineThickness: f32 = 1.0;",
      `const u_outlineThickness: f32 = ${outline ? outline.thickness.toFixed(6) : "1.0"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_outlineSensitivity: f32 = 1.0;",
      `const u_outlineSensitivity: f32 = ${outline ? outline.sensitivity.toFixed(6) : "1.0"};`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_outlineColor: vec3f = vec3f(0.0, 0.0, 0.0);",
      `const u_outlineColor: vec3f = vec3f(${outline ? `${outline.color.r.toFixed(6)}, ${outline.color.g.toFixed(6)}, ${outline.color.b.toFixed(6)}` : "0.0, 0.0, 0.0"});`,
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
        targets: [{ format: renderer.gpuFormat }],
      },
      primitive: { topology: Topology.TRIANGLE_LIST },
    });

    this._bindGroup = device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: this._sampler },
        { binding: 1, resource: colorView },
        { binding: 2, resource: { buffer: this._uniformBuffer } },
        { binding: 3, resource: bloomActiveView },
        { binding: 4, resource: hbaoActiveView },
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
    if (!group.enabled || !renderer.hdrTextureView) return;

    // If TAA and/or Motion Trail resolved this frame, the uber pass reacts to that instead of
    // the raw per-frame color -- `_hdrTextureView` itself must stay untouched so both keep
    // reading fresh input next frame (see WebGPURenderer.render()).
    const colorView =
      renderer.motionTrailResolvedView ?? renderer.taaResolvedView ?? renderer.hdrTextureView;

    const bloom = group.get<import("../post/index.js").BloomElement>(
      PostProcessingEffectType.BLOOM,
    );
    const bloomActiveView =
      bloom && bloom.enabled && renderer.bloomTextureView
        ? renderer.bloomTextureView
        : renderer.whiteTextureView;

    const hbao = group.get<import("../post/index.js").HbaoElement>(PostProcessingEffectType.HBAO);
    const hbaoActiveView =
      hbao && hbao.enabled && renderer.hbaoTextureView
        ? renderer.hbaoTextureView
        : renderer.whiteTextureView;

    const sig = this._getSignature(group);

    // Rebuild if we haven't built yet, if the signature changed, or if the texture views changed
    if (
      !this._pipeline ||
      sig !== this._compiledSignature ||
      this._builtTextureView !== colorView ||
      this._builtBloomTextureView !== bloomActiveView ||
      this._builtHbaoTextureView !== hbaoActiveView
    ) {
      this._build(renderer, colorView, bloomActiveView, hbaoActiveView, group);
      this._compiledSignature = sig;
      this._builtTextureView = colorView;
      this._builtBloomTextureView = bloomActiveView;
      this._builtHbaoTextureView = hbaoActiveView;
    }

    // Write post-process dynamic uniforms (only time uniform is active)
    this._uniformData[0] = (performance.now() % 100000) / 1000.0; // Time in seconds

    renderer.gpuDevice!.queue.writeBuffer(this._uniformBuffer!, 0, this._uniformData);

    // Final blit directly to the swap-chain (canvas)
    const screenView = renderer.gpuCanvasContext.getCurrentTexture().createView();
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
