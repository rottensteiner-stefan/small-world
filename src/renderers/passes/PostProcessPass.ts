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
  /** 20 floats (80 bytes): DynUniforms in PostProcess.frag.wgsl -- time + the 12 continuous
   * tuning parameters, packed as 5x vec4f (with padding for the two vec3 colors). */
  private _uniformData: Float32Array = new Float32Array(20);
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

    // Only structural flags/modes -- these gate real WGSL code paths (branch taken, sample
    // count) and require a shader rebuild. Continuous tuning values (exposure, vignette
    // offset/darkness/roundness, grain intensity, bloom intensity/color, quantize steps,
    // outline thickness/sensitivity/color) live in the per-frame DynUniforms buffer instead
    // (see execute()) and deliberately do NOT appear here -- tuning them must never rebuild.
    return [
      group.filterMode,
      tm && tm.enabled ? 1 : 0,
      tm && tm.enabled ? tm.mode : 0,
      vig && vig.enabled ? 1 : 0,
      grain && grain.enabled ? 1 : 0,
      bloom && bloom.enabled ? 1 : 0,
      quant && quant.enabled ? 1 : 0,
      hbao && hbao.enabled ? 1 : 0,
      outline && outline.enabled ? 1 : 0,
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
        size: 80, // DynUniforms: 5 x vec4f
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

    // Inject only STRUCTURAL parameters as WGSL constants -- these gate real code paths (branch
    // taken, sample count), so changing them legitimately needs a rebuild. Continuous tuning
    // values (exposure, vignette/grain/bloom/quantize/outline numeric params) no longer appear
    // here at all -- they're written every frame into DynUniforms instead (see execute()).
    assembledFrag = assembledFrag.replace(
      "const u_toneMappingMode: u32 = 0u;",
      `const u_toneMappingMode: u32 = ${tmEnabled ? tm.mode : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_vignetteEnabled: u32 = 0u;",
      `const u_vignetteEnabled: u32 = ${vigEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_grainEnabled: u32 = 0u;",
      `const u_grainEnabled: u32 = ${grainEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_bloomEnabled: u32 = 0u;",
      `const u_bloomEnabled: u32 = ${bloomEnabled ? 1 : 0}u;`,
    );
    assembledFrag = assembledFrag.replace(
      "const u_quantizeEnabled: u32 = 0u;",
      `const u_quantizeEnabled: u32 = ${quantEnabled ? 1 : 0}u;`,
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

    // Write the continuous tuning values every frame, independent of the rebuild guard above --
    // this is the whole point: moving a slider never touches the pipeline. Matches DynUniforms'
    // layout in PostProcess.frag.wgsl exactly (5x vec4f, index comments below give the offset).
    const tm = group.get<import("../post/index.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../post/index.js").VignetteElement>(
      PostProcessingEffectType.VIGNETTE,
    );
    const grain = group.get<import("../post/index.js").GrainElement>(
      PostProcessingEffectType.GRAIN,
    );
    const quant = group.get<import("../post/index.js").QuantizeElement>(
      PostProcessingEffectType.QUANTIZE,
    );
    const outline = group.get<import("../post/index.js").OutlineElement>(
      PostProcessingEffectType.OUTLINE,
    );

    const d = this._uniformData;
    d[0] = (performance.now() % 100000) / 1000.0; // a.x: time
    d[1] = tm ? tm.exposure : 1.0; // a.y: exposure
    d[2] = tm ? 1.0 / tm.gamma : 1.0; // a.z: inverseGamma
    d[3] = vig ? vig.offset : 0.8; // a.w: vignetteOffset
    d[4] = vig ? vig.darkness : 0.5; // b.x: vignetteDarkness
    d[5] = vig ? vig.roundness : 2.0; // b.y: vignetteRoundness
    d[6] = grain ? grain.intensity : 0.05; // b.z: grainIntensity
    d[7] = bloom ? bloom.intensity : 1.0; // b.w: bloomIntensity
    d[8] = quant ? quant.steps : 8.0; // c.x: quantizeSteps
    d[9] = outline ? outline.thickness : 1.0; // c.y: outlineThickness
    d[10] = outline ? outline.sensitivity : 1.0; // c.z: outlineSensitivity
    d[11] = 0; // c.w: pad
    d[12] = bloom ? bloom.color.r : 1.0; // bloomColor.rgb
    d[13] = bloom ? bloom.color.g : 1.0;
    d[14] = bloom ? bloom.color.b : 1.0;
    d[15] = 0; // pad
    d[16] = outline ? outline.color.r : 0.0; // outlineColor.rgb
    d[17] = outline ? outline.color.g : 0.0;
    d[18] = outline ? outline.color.b : 0.0;
    d[19] = 0; // pad

    renderer.gpuDevice!.queue.writeBuffer(this._uniformBuffer!, 0, d);

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
