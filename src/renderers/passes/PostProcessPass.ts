/// src/renderers/passes/PostProcessPass.ts

import { Scene } from "../../core/Scene.js";
import { WebGPURenderer } from "../WebGPURenderer.js";
import { RenderPass } from "../RenderPass.js";
import { Vector3D } from "../../math/index.js";

// language=WGSL
const FULLSCREEN_VERT_WGSL = /* wgsl */ `
@vertex
fn vs_main(@builtin(vertex_index) id: u32) -> @builtin(position) vec4f {
    // Generate a fullscreen triangle from vertex index alone.
    // 3 vertices cover the entire clip space.
    let x = f32((id << 1u) & 2u) * 2.0 - 1.0;
    let y = f32(id & 2u) * 2.0 - 1.0;
    return vec4f(x, y, 0.0, 1.0);
}
`;

// language=WGSL
const POST_PROCESS_FRAG_WGSL = /* wgsl */ `
@group(0) @binding(0) var hdrSampler: sampler;
@group(0) @binding(1) var hdrTexture: texture_2d<f32>;

struct PostUniforms {
    exposure: f32,
    inverseGamma: f32,
    toneMappingMode: u32,
    vignetteEnabled: u32,
    vignetteOffset: f32,
    vignetteDarkness: f32,
    vignetteRoundness: f32,
    grainEnabled: u32,
    grainIntensity: f32,
    time: f32,
    _pad2: f32,
}
@group(0) @binding(2) var<uniform> u: PostUniforms;

fn random(st: vec2f) -> f32 {
    var p3  = fract(vec3f(st.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Reinhard tone mapping (simple, proven, industry-standard fallback)
fn toneMapReinhard(hdr: vec3f, exposure: f32) -> vec3f {
    let mapped = hdr * exposure;
    return mapped / (mapped + vec3f(1.0));
}

// Cineon tone mapping (Optimized filmic operator by Jim Hejl and Richard Burgess-Dawson)
fn toneMapCineon(hdr: vec3f, exposure: f32) -> vec3f {
    let mapped = max(vec3f(0.0), hdr * exposure - vec3f(0.004));
    return (mapped * (6.2 * mapped + vec3f(0.5))) / (mapped * (6.2 * mapped + vec3f(1.7)) + vec3f(0.06));
}

// ACES Filmic tone mapping (Narkowicz fit)
fn toneMapACESFilmic(hdr: vec3f, exposure: f32) -> vec3f {
    let mapped = hdr * exposure;
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return clamp((mapped * (a * mapped + b)) / (mapped * (c * mapped + d) + e), vec3f(0.0), vec3f(1.0));
}

// Linear -> sRGB gamma correction
fn linearToSRGB(linear: vec3f, invGamma: f32) -> vec3f {
    return pow(clamp(linear, vec3f(0.0), vec3f(1.0)), vec3f(invGamma));
}

@fragment
fn fs_main(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    let dims = vec2f(textureDimensions(hdrTexture, 0));
    let uv = coord.xy / dims;

    let hdr = textureSample(hdrTexture, hdrSampler, uv).rgb;
    
    var tonemapped = hdr * u.exposure;
    if (u.toneMappingMode == 1u) {
        tonemapped = toneMapReinhard(hdr, u.exposure);
    } else if (u.toneMappingMode == 2u) {
        tonemapped = toneMapCineon(hdr, u.exposure);
    } else if (u.toneMappingMode == 3u) {
        tonemapped = toneMapACESFilmic(hdr, u.exposure);
    }
    
    var srgb = linearToSRGB(tonemapped, u.inverseGamma);

    // Apply Vignette if enabled
    if (u.vignetteEnabled == 1u) {
        let d_uv = abs(uv - vec2f(0.5)) * 2.0;
        let d = pow(pow(d_uv.x, u.vignetteRoundness) + pow(d_uv.y, u.vignetteRoundness), 1.0 / u.vignetteRoundness);
        let d_old_scale = d * 0.5;
        let innerRadius = u.vignetteOffset * 0.5;
        let vignette = 1.0 - smoothstep(innerRadius, u.vignetteOffset, d_old_scale);
        srgb *= mix(1.0, vignette, clamp(u.vignetteDarkness, 0.0, 1.0));
    }

    // Apply Film Grain
    if (u.grainEnabled == 1u) {
        let noise = random(uv * dims + vec2f(u.time, -u.time));
        let grain = (noise - 0.5) * u.grainIntensity;
        srgb += vec3f(grain);
    }

    return vec4f(srgb, 1.0);
}
`;

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
  private _uniformData: Float32Array = new Float32Array(12);
  private _builtTextureView?: GPUTextureView;

  /**
   * Lazily initialises or rebuilds the pipeline when the HDR texture changes.
   */
  private _build(renderer: WebGPURenderer): void {
    const device = renderer._device!;

    this._sampler ??= device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    if (!this._uniformBuffer) {
      this._uniformBuffer = device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    }

    const bgl = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      ],
    });

    const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl] });

    const vertModule = device.createShaderModule({ code: FULLSCREEN_VERT_WGSL });
    const fragModule = device.createShaderModule({ code: POST_PROCESS_FRAG_WGSL });

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

    // Rebuild only if we haven't built yet, or if the texture view changed (e.g. resize)
    if (!this._pipeline || this._builtTextureView !== renderer._hdrTextureView) {
      this._build(renderer);
      this._builtTextureView = renderer._hdrTextureView;
    }

    const tm =
      group.get<import("../post/PostProcessingElement.js").ToneMappingElement>("ToneMapping");
    const vig = group.get<import("../post/PostProcessingElement.js").VignetteElement>("Vignette");
    const grain = group.get<import("../post/PostProcessingElement.js").GrainElement>("Grain");

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
    this._uniformData[10] = 0;
    this._uniformData[11] = 0;

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
