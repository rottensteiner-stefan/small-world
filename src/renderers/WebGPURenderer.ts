/// src/renderers/WebGPURenderer.ts

import {
  Texture,
  CubeTexture,
  ShaderRegistry,
  RenderManifest,
} from "../core/index.js";
import { GeometryDataInterface } from "../interfaces/index.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/Vector3D.js";
import { BlendingMode, CullMode, MaterialType, RendererType } from "../enums/index.js";

import { AbstractRenderer } from "./AbstractRenderer.js";

interface WebGPUGeoCache {
  vb: GPUBuffer;
  nb: GPUBuffer | null;
  uvb: GPUBuffer | null;
  ib: GPUBuffer | null;
  wib: GPUBuffer | null; // Wireframe Index Buffer
  indexCount: number;
  wireframeIndexCount: number;
  vertexCount: number;
  format: GPUIndexFormat | null;
}

interface WebGPUPipelineCache {
  pipeline: GPURenderPipeline;
  layout: GPUPipelineLayout;
  bgLayouts: GPUBindGroupLayout[];
}

/**
 * WebGPU implementation of the renderer.
 */
export class WebGPURenderer extends AbstractRenderer {
  /** @inheritdoc */
  public override readonly type: RendererType = RendererType.WEB_GPU;
  private _adapter: GPUAdapter | null = null;
  private _device: GPUDevice | null = null;
  private _context!: GPUCanvasContext;
  private _format!: GPUTextureFormat;

  private _pipelines: Map<string, WebGPUPipelineCache> = new Map();
  private _shaderModules: Map<string, GPUShaderModule> = new Map();

  private _sampler!: GPUSampler;
  private _whiteTexView!: GPUTextureView;
  private _defaultCubeTexView!: GPUTextureView;

  private _geoCache: Map<GeometryDataInterface, WebGPUGeoCache> = new Map();
  private _textureViewCache: Map<Texture, GPUTextureView> = new Map();
  private _cubeTextureViewCache: Map<CubeTexture, GPUTextureView> = new Map();
  private _samplerCache: Map<string, GPUSampler> = new Map();

  private _depthTexture!: GPUTexture;

  // Generic Buffers for Uniforms (per Object)
  private _objUniformBuffers: Map<Object3D, GPUBuffer> = new Map();
  private _objLightBuffers: Map<Object3D, { pl: GPUBuffer; sl: GPUBuffer; al: GPUBuffer }> = new Map();
  private _objBindGroups: Map<string, GPUBindGroup> = new Map();

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
  ): Promise<void> {
    this._adapter = await navigator.gpu.requestAdapter(attributes);
    if (!this._adapter) throw new Error("[WebGPURenderer] No adapter found.");
    this._device = await this._adapter.requestDevice();

    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("[WebGPURenderer] Could not get webgpu context.");
    this._context = context as GPUCanvasContext;

    this._format = navigator.gpu.getPreferredCanvasFormat();
    this._context.configure({
      device: this._device,
      format: this._format,
      alphaMode: "premultiplied",
    });

    this._sampler = this._device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });

    // Default Textures
    const whiteTex: GPUTexture = this._device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this._device.queue.writeTexture(
      { texture: whiteTex },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      [1, 1],
    );
    this._whiteTexView = whiteTex.createView();

    const whiteCube: GPUTexture = this._device.createTexture({
      size: [1, 1, 6],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    for (let i: number = 0; i < 6; i++) {
      this._device.queue.writeTexture(
        { texture: whiteCube, origin: [0, 0, i] },
        new Uint8Array([50, 50, 100, 255]),
        { bytesPerRow: 4 },
        [1, 1],
      );
    }
    this._defaultCubeTexView = whiteCube.createView({ dimension: "cube" });

    this.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  private _getShaderModule(shaderId: string): GPUShaderModule {
    let sm = this._shaderModules.get(shaderId);
    if (!sm) {
      const def = ShaderRegistry.instance.get(shaderId);
      if (!def || !def.sources.wgsl) {
        throw new Error(`[WebGPURenderer] Shader definition for ${shaderId} not found or missing WGSL source.`);
      }
      const code = ShaderRegistry.instance.assemble(def.sources.wgsl, "wgsl");
      sm = this._device!.createShaderModule({ label: shaderId, code });
      this._shaderModules.set(shaderId, sm);
    }
    return sm;
  }

  private _getPipeline(manifest: RenderManifest, topology: GPUPrimitiveTopology = "triangle-list"): WebGPUPipelineCache {
    const shaderId = manifest.shaderId;
    const state = manifest.state || {};
    const cullMode = state.culling || CullMode.BACK;
    const blending = state.blending || BlendingMode.OPAQUE;
    const depthWrite = state.depthWrite !== undefined ? state.depthWrite : true;

    const key = `${shaderId}_${topology}_${cullMode}_${blending}_${depthWrite}`;
    let cache = this._pipelines.get(key);

    if (!cache) {
      const sm = this._getShaderModule(shaderId);

      // 1. Create BindGroupLayouts based on layout
      const objEntries: GPUBindGroupLayoutEntry[] = [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      ];
      const objBGL = this._device!.createBindGroupLayout({ entries: objEntries });

      const texEntries: GPUBindGroupLayoutEntry[] = [];
      // We always put a sampler at binding 1 for now (SmallWorld convention)
      // Actually, let's just mirror the current texBGL for compatibility with standard shaders
      if (shaderId === MaterialType.SKYBOX) {
        texEntries.push({ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } });
        texEntries.push({ binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } });
      } else {
        // Standard SmallWorld Tex Layout (compatible with our Uber-Shaders)
        texEntries.push({ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }); // Diffuse
        texEntries.push({ binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } });   // Sampler
        texEntries.push({ binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }); // Terrain Sand
        texEntries.push({ binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }); // Terrain Grass
        texEntries.push({ binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }); // Terrain Rock
        texEntries.push({ binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }); // Terrain Snow
      }
      const texBGL = this._device!.createBindGroupLayout({ entries: texEntries });

      const pipelineLayout = this._device!.createPipelineLayout({
        bindGroupLayouts: [objBGL, texBGL],
      });

      const vertexBuffers: GPUVertexBufferLayout[] = [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
      ];

      const targets: GPUColorTargetState[] = [{ format: this._format }];
      if (blending === BlendingMode.ALPHA) {
        targets[0]!.blend = {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        };
      } else if (blending === BlendingMode.ADDITIVE) {
        targets[0]!.blend = {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
        };
      }

      const pipeline = this._device!.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module: sm, entryPoint: "vs", buffers: vertexBuffers },
        fragment: { module: sm, entryPoint: "fs", targets },
        primitive: { topology, cullMode },
        depthStencil: { depthWriteEnabled: depthWrite, depthCompare: "less-equal", format: "depth24plus" },
      });

      cache = { pipeline, layout: pipelineLayout, bgLayouts: [objBGL, texBGL] };
      this._pipelines.set(key, cache);
    }

    return cache;
  }

  private _getTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) {
      return this._whiteTexView;
    }
    let view: GPUTextureView | undefined = this._textureViewCache.get(tex);
    if (!view) {
      const t: GPUTexture = this._device!.createTexture({
        size: [tex.image.width, tex.image.height],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this._device!.queue.copyExternalImageToTexture(
        { source: tex.image, flipY: true },
        { texture: t },
        [tex.image.width, tex.image.height],
      );
      view = t.createView();
      this._textureViewCache.set(tex, view);
    }
    return view;
  }

  private _getGPUCubeTextureView(tex: CubeTexture): GPUTextureView {
    let view: GPUTextureView | undefined = this._cubeTextureViewCache.get(tex);
    if (!view) {
      const img = tex.images[0]!;
      const t: GPUTexture = this._device!.createTexture({
        size: [img.width, img.height, 6],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      for (let i: number = 0; i < 6; i++) {
        this._device!.queue.copyExternalImageToTexture(
          { source: tex.images[i]! },
          { texture: t, origin: [0, 0, i] },
          [img.width, img.height],
        );
      }
      view = t.createView({ dimension: "cube" });
      this._cubeTextureViewCache.set(tex, view);
    }
    return view;
  }

  private _getSampler(tex: Texture): GPUSampler {
    const key: string = `${tex.addressModeU}_${tex.addressModeV}_${tex.magFilter}_${tex.minFilter}`;
    if (!this._samplerCache.has(key)) {
      this._samplerCache.set(
        key,
        this._device!.createSampler({
          addressModeU: tex.addressModeU,
          addressModeV: tex.addressModeV,
          magFilter: tex.magFilter,
          minFilter: tex.minFilter,
          mipmapFilter: "linear",
        }),
      );
    }
    return this._samplerCache.get(key)!;
  }

  private _getGeoCache(geo: GeometryDataInterface): WebGPUGeoCache {
    let c = this._geoCache.get(geo);
    if (!c) {
      const createBuf = (data: Float32Array | Uint16Array | Uint32Array, usage: number): GPUBuffer => {
        const b = this._device!.createBuffer({ size: (data.byteLength + 3) & ~3, usage, mappedAtCreation: true });
        if (data instanceof Float32Array) new Float32Array(b.getMappedRange()).set(data);
        else if (data instanceof Uint16Array) new Uint16Array(b.getMappedRange()).set(data);
        else new Uint32Array(b.getMappedRange()).set(data);
        b.unmap();
        return b;
      };
      c = {
        vb: createBuf(geo.vertices, GPUBufferUsage.VERTEX),
        nb: geo.normals ? createBuf(geo.normals, GPUBufferUsage.VERTEX) : null,
        uvb: geo.uvs ? createBuf(geo.uvs, GPUBufferUsage.VERTEX) : null,
        ib: geo.indices ? createBuf(geo.indices, GPUBufferUsage.INDEX) : null,
        wib: geo.wireframeIndices ? createBuf(geo.wireframeIndices, GPUBufferUsage.INDEX) : null,
        indexCount: geo.indices ? geo.indices.length : 0,
        wireframeIndexCount: geo.wireframeIndices ? geo.wireframeIndices.length : 0,
        vertexCount: geo.vertices.length / 3,
        format: geo.indices instanceof Uint32Array || geo.wireframeIndices instanceof Uint32Array ? "uint32" : "uint16",
      };

      this._geoCache.set(geo, c);
    }
    return c;
  }

  private _getObjBuffers(obj: Object3D): { ub: GPUBuffer; pl: GPUBuffer; sl: GPUBuffer; al: GPUBuffer } {
    let ub = this._objUniformBuffers.get(obj);
    let lights = this._objLightBuffers.get(obj);

    if (!ub || !lights) {
      ub = this._device!.createBuffer({ size: 512, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const pl = this._device!.createBuffer({ size: 512, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      const sl = this._device!.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      const al = this._device!.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      lights = { pl, sl, al };
      this._objUniformBuffers.set(obj, ub);
      this._objLightBuffers.set(obj, lights);
    }
    return { ub, ...lights };
  }

  private _getObjBindGroup(obj: Object3D, layout: GPUBindGroupLayout): GPUBindGroup {
    const key = obj.uuid + "_" + (layout as any).label; 
    let bg = this._objBindGroups.get(key);
    if (!bg) {
      const bufs = this._getObjBuffers(obj);
      bg = this._device!.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: bufs.ub } },
          { binding: 1, resource: { buffer: bufs.pl } },
          { binding: 2, resource: { buffer: bufs.sl } },
          { binding: 3, resource: { buffer: bufs.al } },
        ],
      });
      this._objBindGroups.set(key, bg);
    }
    return bg;
  }

  private _getTexBindGroup(manifest: RenderManifest, layout: GPUBindGroupLayout): GPUBindGroup {
    const entries: GPUBindGroupEntry[] = [];
    
    if (manifest.shaderId === MaterialType.SKYBOX) {
      const tex = manifest.textures["u_skybox"] as CubeTexture;
      entries.push({ binding: 0, resource: tex ? this._getGPUCubeTextureView(tex) : this._defaultCubeTexView });
      entries.push({ binding: 1, resource: this._sampler });
    } else {
      const diff = manifest.textures["u_diffuseMap"] as Texture;
      entries.push({ binding: 0, resource: diff ? this._getTextureView(diff) : this._whiteTexView });
      entries.push({ binding: 1, resource: diff ? this._getSampler(diff) : this._sampler });
      
      const sand = manifest.textures["u_sandMap"] as Texture;
      entries.push({ binding: 2, resource: sand ? this._getTextureView(sand) : this._whiteTexView });
      const grass = manifest.textures["u_grassMap"] as Texture;
      entries.push({ binding: 3, resource: grass ? this._getTextureView(grass) : this._whiteTexView });
      const rock = manifest.textures["u_rockMap"] as Texture;
      entries.push({ binding: 4, resource: rock ? this._getTextureView(rock) : this._whiteTexView });
      const snow = manifest.textures["u_snowMap"] as Texture;
      entries.push({ binding: 5, resource: snow ? this._getTextureView(snow) : this._whiteTexView });
    }

    return this._device!.createBindGroup({ layout, entries });
  }

  /** @inheritdoc */
  public render(scene: Scene, vpMatrix: Float32Array, camPos: Vector3D = new Vector3D()): void {
    if (!this._device) return;

    const ce = this._device.createCommandEncoder();
    const rp = ce.beginRenderPass({
      colorAttachments: [{ view: this._context.getCurrentTexture().createView(), clearValue: this._clearColor, loadOp: "clear", storeOp: "store" }],
      depthStencilAttachment: { view: this._depthTexture.createView(), depthClearValue: 1.0, depthLoadOp: "clear", depthStoreOp: "store" },
    });

    const { aCol, dDir, dCol, pLights, sLights, aLights } = this.extractLights(scene);

    const plData = new Float32Array(32);
    pLights.forEach((pl, i) => {
      plData.set([pl.worldMatrix.data[12]!, pl.worldMatrix.data[13]!, pl.worldMatrix.data[14]!, 0.0], i * 8);
      plData.set([pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity, 0.0], i * 8 + 4);
    });

    const slData = new Float32Array(64);
    sLights.forEach((sl, i) => {
      const offset = i * 16;
      slData.set([sl.worldMatrix.data[12]!, sl.worldMatrix.data[13]!, sl.worldMatrix.data[14]!, 0.0], offset);
      const dir = sl.direction.clone().normalize();
      slData.set([dir.x, dir.y, dir.z, 0.0], offset + 4);
      slData.set([sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity, 0.0], offset + 8);
      slData.set([Math.cos(sl.angle), Math.cos(sl.angle * (1.0 - sl.penumbra)), sl.distance, sl.decay], offset + 12);
    });

    const alData = new Float32Array(96);
    aLights.forEach((al, i) => {
      const mat = al.worldMatrix.data, offset = i * 24;
      alData.set([mat[12]!, mat[13]!, mat[14]!, 0.0], offset);
      alData.set([al.color.r * al.intensity, al.color.g * al.intensity, al.color.b * al.intensity, 0.0], offset + 4);
      alData.set([mat[0]!, mat[1]!, mat[2]!, 0.0], offset + 8);
      alData.set([mat[4]!, mat[5]!, mat[6]!, 0.0], offset + 12);
      alData.set([mat[8]!, mat[9]!, mat[10]!, 0.0], offset + 16);
      alData.set([al.width / 2.0, al.height / 2.0, 0.0, 0.0], offset + 20);
    });

    const drawObject = (obj: Object3D, pass: number): void => {
      if (!obj.isVisible) return;

      if (obj.geometry && obj.material) {
        const manifest = obj.material.getRenderManifest();
        const topology: GPUPrimitiveTopology = manifest.shaderId === MaterialType.WIREFRAME ? "line-list" : "triangle-list";

        if (pass === 1) {
          if (manifest.shaderId !== MaterialType.SKYBOX && obj.frustumCulled) return;
        } else {
          if (manifest.shaderId === MaterialType.SKYBOX || (manifest.shaderId === MaterialType.BASIC && !obj.frustumCulled)) return;
        }

        const cache = this._getPipeline(manifest, topology);
        rp.setPipeline(cache.pipeline);

        const uData = new Float32Array(80);
        uData.set(vpMatrix, 0);
        const modelMatrix = new Float32Array(obj.worldMatrix.data);
        
        if (manifest.shaderId === MaterialType.SPRITE) {
          const sx = Math.sqrt(modelMatrix[0]!**2 + modelMatrix[1]!**2 + modelMatrix[2]!**2);
          const sy = Math.sqrt(modelMatrix[4]!**2 + modelMatrix[5]!**2 + modelMatrix[6]!**2);
          const sz = Math.sqrt(modelMatrix[8]!**2 + modelMatrix[9]!**2 + modelMatrix[10]!**2);
          modelMatrix[0] = vpMatrix[0]! * sx; modelMatrix[1] = vpMatrix[4]! * sx; modelMatrix[2] = vpMatrix[8]! * sx;
          modelMatrix[4] = vpMatrix[1]! * sy; modelMatrix[5] = vpMatrix[5]! * sy; modelMatrix[6] = vpMatrix[9]! * sy;
          modelMatrix[8] = vpMatrix[2]! * sz; modelMatrix[9] = vpMatrix[6]! * sz; modelMatrix[10] = vpMatrix[10]! * sz;
        }

        uData.set(modelMatrix, 16);
        uData.set(obj.material.color.toArray(), 32);
        uData.set([aCol.r, aCol.g, aCol.b, 1.0], 40);
        uData.set([dCol.r, dCol.g, dCol.b, 1.0], 44);
        uData.set([dDir.x, dDir.y, dDir.z, 0.0], 48);
        uData.set([camPos.x, camPos.y, camPos.z, 0.0], 52);
        uData.set([1.0, 1.0], 58); // Default tRep to (1, 1)
        uData[61] = pLights.length; uData[62] = sLights.length; uData[63] = aLights.length;
// Map Material Properties from Manifest
const props = manifest.properties;
if (props["u_specColor"]) uData.set(props["u_specColor"].toArray(), 36);
if (props["u_shininess"] !== undefined) uData[60] = props["u_shininess"];
if (props["u_thresholds"]) uData.set(props["u_thresholds"], 64);
if (manifest.shaderId === MaterialType.TERRAIN) uData[68] = 1.0;

const diff = manifest.textures["u_diffuseMap"] as Texture;
if (diff) {
  uData.set([diff.offset.x, diff.offset.y], 56);
  uData.set([diff.repeat.x, diff.repeat.y], 58);
} else if (props["u_texRepeat"]) {
  uData.set(props["u_texRepeat"], 58);
}


        const bufs = this._getObjBuffers(obj);
        this._device!.queue.writeBuffer(bufs.ub, 0, uData);
        this._device!.queue.writeBuffer(bufs.pl, 0, plData);
        this._device!.queue.writeBuffer(bufs.sl, 0, slData);
        this._device!.queue.writeBuffer(bufs.al, 0, alData);

        const gCache = this._getGeoCache(obj.geometry);
        rp.setBindGroup(0, this._getObjBindGroup(obj, cache.bgLayouts[0]!));
        rp.setBindGroup(1, this._getTexBindGroup(manifest, cache.bgLayouts[1]!));
        rp.setVertexBuffer(0, gCache.vb);
        rp.setVertexBuffer(1, gCache.nb || gCache.vb);
        rp.setVertexBuffer(2, gCache.uvb || gCache.vb);

        if (topology === "line-list" && gCache.wib && gCache.format) {
          rp.setIndexBuffer(gCache.wib, gCache.format);
          rp.drawIndexed(gCache.wireframeIndexCount);
        } else if (gCache.ib && gCache.format) {
          rp.setIndexBuffer(gCache.ib, gCache.format);
          rp.drawIndexed(gCache.indexCount);
        } else {
          rp.draw(gCache.vertexCount);
        }
      }

      if (obj.children) obj.children.forEach(child => drawObject(child, pass));
    };

    for (const obj of scene.objects) drawObject(obj, 1);
    for (const obj of scene.objects) drawObject(obj, 2);

    rp.end();
    this._device.queue.submit([ce.finish()]);
  }

  public override destroy(): void {
    if (this._device) {
      this._device.destroy();
      this._device = null;
    }
    this._adapter = null;
  }

  /** @inheritdoc */
  public setSize(width: number, height: number): void {
    if (!this._device) {
      return;
    }
    const d: number = devicePixelRatio;
    this._context.canvas.width = width * d;
    this._context.canvas.height = height * d;

    if ("style" in this._context.canvas) {
      const style: CSSStyleDeclaration = (this._context.canvas as HTMLCanvasElement).style;
      style.width = `${width}px`;
      style.height = `${height}px`;
    }

    this._depthTexture = this._device.createTexture({
      size: [this._context.canvas.width, this._context.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }
}
