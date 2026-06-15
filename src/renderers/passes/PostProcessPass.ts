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
    _pad0:    f32,
    _pad1:    f32,
}
@group(0) @binding(2) var<uniform> u: PostUniforms;

// Reinhard tone mapping (simple, proven, industry-standard fallback)
fn toneMapReinhard(hdr: vec3f, exposure: f32) -> vec3f {
    let mapped = hdr * exposure;
    return mapped / (mapped + vec3f(1.0));
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
    let tonemapped = toneMapReinhard(hdr, u.exposure);
    let srgb = linearToSRGB(tonemapped, u.inverseGamma);

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
  private _uniformData: Float32Array = new Float32Array(4);
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
      // exposure (f32) + gamma (f32) + 2x padding = 16 bytes (min uniform alignment)
      this._uniformBuffer = device.createBuffer({
        size: 16,
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
    if (!renderer.postConfig.enabled || !renderer._hdrTextureView) return;

    // Rebuild only if we haven't built yet, or if the texture view changed (e.g. resize)
    if (!this._pipeline || this._builtTextureView !== renderer._hdrTextureView) {
      this._build(renderer);
      this._builtTextureView = renderer._hdrTextureView;
    }

    // Write post-process uniforms
    this._uniformData[0] = renderer.postConfig.exposure;
    this._uniformData[1] = 1.0 / renderer.postConfig.gamma;
    this._uniformData[2] = 0;
    this._uniformData[3] = 0;

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
