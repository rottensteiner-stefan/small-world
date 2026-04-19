/// src/renderers/WebGPURenderer.ts

import {
  Color,
  CubeTexture,
  PhongMaterial,
  RenderManifest,
  ShaderRegistry,
  TerrainMaterial,
  Texture,
} from "../core/index.js";
import { GeometryDataInterface, LightDataInterface } from "../interfaces/index.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { MathPool, Vector3D } from "../math/index.js";
import {
  BlendingMode,
  MaterialType,
  RendererType,
} from "../enums/index.js";
import { EngineConfig } from "../interfaces/EngineConfig.js";

import { AbstractRenderer } from "./AbstractRenderer.js";

interface WebGPUGeoCache {
  vb: GPUBuffer;
  nb: GPUBuffer | undefined;
  uvb: GPUBuffer | undefined;
  tb: GPUBuffer | undefined;
  ib: GPUBuffer | undefined;
  wib: GPUBuffer | undefined;
  indexCount: number;
  wireframeIndexCount: number;
  vertexCount: number;
  format: GPUIndexFormat | undefined;
}

interface WebGPUPipelineCache {
  pipeline: GPURenderPipeline;
  layout: GPUPipelineLayout;
  bgLayouts: GPUBindGroupLayout[];
}

/**
 * Modern WebGPU implementation with memory management and robust attribute handling.
 */
export class WebGPURenderer extends AbstractRenderer {
  public override readonly type: RendererType = RendererType.WEB_GPU;
  private _adapter: GPUAdapter | undefined = undefined;
  private _device: GPUDevice | undefined = undefined;
  private _context!: GPUCanvasContext;
  private _format!: GPUTextureFormat;

  private _pipelines: Map<string, WebGPUPipelineCache> = new Map();
  private _shaderModules: Map<string, GPUShaderModule> = new Map();

  private _whiteTexView!: GPUTextureView;
  private _flatNormalTexView!: GPUTextureView;
  private _defaultCubeTexView!: GPUTextureView;
  private _defaultSampler!: GPUSampler;

  private _dummyNormalBuffer!: GPUBuffer;
  private _dummyUvBuffer!: GPUBuffer;
  private _dummyTangentBuffer!: GPUBuffer;
  private _dummyBufferSize: number = 0; // Initialize to 0 to force creation!

  private _geoCache: Map<GeometryDataInterface, WebGPUGeoCache> = new Map();
  private _textureViewCache: Map<Texture, GPUTextureView> = new Map();
  private _cubeTextureViewCache: Map<CubeTexture, GPUTextureView> = new Map();

  private _depthTexture!: GPUTexture;

  private _globalUniformBuffer!: GPUBuffer;
  private _pointLightBuffer!: GPUBuffer;
  private _spotLightBuffer!: GPUBuffer;
  private _areaLightBuffer!: GPUBuffer;
  private _globalBindGroup!: GPUBindGroup;
  private _globalBGL!: GPUBindGroupLayout;

  private _objectUniformBuffers: Map<string, { buffer: GPUBuffer, lastFrame: number }> = new Map();
  private _frameCount: number = 0;

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineConfig,
  ): Promise<void> {
    this._adapter = (await navigator.gpu.requestAdapter(attributes)) ?? undefined;
    if (!this._adapter) throw new Error("[WebGPURenderer] No adapter found.");
    this._device = await this._adapter.requestDevice();

    if (config?.quality) {
      this._quality = { ...this._quality, ...config.quality };
    }

    this._context = canvas.getContext("webgpu") as GPUCanvasContext;
    this._format = navigator.gpu.getPreferredCanvasFormat();
    this._context.configure({ device: this._device, format: this._format, alphaMode: "premultiplied" });

    this._initDefaultResources();
    this._initGlobalBuffers();
    this.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  private _initDefaultResources(): void {
    const create1x1 = (col: number[]): GPUTextureView => {
      const t = this._device!.createTexture({ size: [1, 1], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      this._device!.queue.writeTexture({ texture: t }, new Uint8Array(col), { bytesPerRow: 4 }, [1, 1]);
      return t.createView();
    };
    this._whiteTexView = create1x1([255, 255, 255, 255]);
    this._flatNormalTexView = create1x1([128, 128, 255, 255]);

    const whiteCube = this._device!.createTexture({ size: [1, 1, 6], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    for (let i = 0; i < 6; i++) {
        this._device!.queue.writeTexture({ texture: whiteCube, origin: [0, 0, i] }, new Uint8Array([50, 50, 100, 255]), { bytesPerRow: 4 }, [1, 1]);
    }
    this._defaultCubeTexView = whiteCube.createView({ dimension: "cube" });
    this._defaultSampler = this._device!.createSampler({ magFilter: "linear", minFilter: "linear" });

    this._ensureDummyBufferSize(1000);
  }

  private _ensureDummyBufferSize(vertexCount: number): void {
      if (this._dummyBufferSize >= vertexCount * 3 && this._dummyNormalBuffer) return;
      
      const newSize = Math.max(this._dummyBufferSize * 2, vertexCount * 3, 3000);
      if(this._dummyNormalBuffer) this._dummyNormalBuffer.destroy();
      if(this._dummyUvBuffer) this._dummyUvBuffer.destroy();
      if(this._dummyTangentBuffer) this._dummyTangentBuffer.destroy();

      const normalData = new Float32Array(newSize).fill(0);
      for(let i=0; i<newSize; i+=3) normalData[i+1] = 1.0; 
      this._dummyNormalBuffer = this._device!.createBuffer({ size: normalData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      this._device!.queue.writeBuffer(this._dummyNormalBuffer, 0, normalData);

      const uvData = new Float32Array(newSize).fill(0);
      this._dummyUvBuffer = this._device!.createBuffer({ size: uvData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      this._device!.queue.writeBuffer(this._dummyUvBuffer, 0, uvData);

      const tangentData = new Float32Array(newSize).fill(0);
      for(let i=0; i<newSize; i+=3) tangentData[i] = 1.0; 
      this._dummyTangentBuffer = this._device!.createBuffer({ size: tangentData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      this._device!.queue.writeBuffer(this._dummyTangentBuffer, 0, tangentData);

      this._dummyBufferSize = newSize;
  }

  private _initGlobalBuffers(): void {
    this._globalUniformBuffer = this._device!.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this._pointLightBuffer = this._device!.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this._spotLightBuffer = this._device!.createBuffer({ size: 2048, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this._areaLightBuffer = this._device!.createBuffer({ size: 4096, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

    this._globalBGL = this._device!.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      ]
    });

    this._globalBindGroup = this._device!.createBindGroup({
      layout: this._globalBGL,
      entries: [
        { binding: 0, resource: { buffer: this._globalUniformBuffer } },
        { binding: 1, resource: { buffer: this._pointLightBuffer } },
        { binding: 2, resource: { buffer: this._spotLightBuffer } },
        { binding: 3, resource: { buffer: this._areaLightBuffer } },
      ]
    });
  }

  private _getPipeline(manifest: RenderManifest, topology: GPUPrimitiveTopology): WebGPUPipelineCache {
    const shaderId = manifest.shaderId;
    const state = manifest.state || {};
    const key = `${shaderId}_${topology}_${state.culling}_${state.blending}`;
    let cache = this._pipelines.get(key);

    if (!cache) {
      const sm = this._getShaderModule(shaderId);
      const objEntries: GPUBindGroupLayoutEntry[] = [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      ];

      if (shaderId === MaterialType.SKYBOX) {
          objEntries.push({ binding: 9, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } });
      } else {
          for(let i=2; i<=8; i++) objEntries.push({ binding: i, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } });
      }
      
      const objBGL = this._device!.createBindGroupLayout({ entries: objEntries });
      const pipelineLayout = this._device!.createPipelineLayout({ bindGroupLayouts: [this._globalBGL, objBGL] });

      const vertexBuffers: GPUVertexBufferLayout[] = [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 3, offset: 0, format: "float32x3" }] },
      ];

      const targets: GPUColorTargetState[] = [{ format: this._format }];
      if (state.blending === BlendingMode.ALPHA) {
        targets[0]!.blend = {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        };
      }

      const pipeline = this._device!.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module: sm, entryPoint: "vs", buffers: vertexBuffers },
        fragment: { module: sm, entryPoint: "fs", targets },
        primitive: { topology, cullMode: state.culling || "back" },
        depthStencil: { depthWriteEnabled: state.depthWrite !== false, depthCompare: "less-equal", format: "depth24plus" },
      });

      cache = { pipeline, layout: pipelineLayout, bgLayouts: [this._globalBGL, objBGL] };
      this._pipelines.set(key, cache);
    }
    return cache;
  }

  private _getShaderModule(shaderId: string): GPUShaderModule {
    let sm = this._shaderModules.get(shaderId);
    if (!sm) {
      const def = ShaderRegistry.instance.get(shaderId);
      const code = ShaderRegistry.instance.assemble(def!.sources.wgsl!, "wgsl");
      sm = this._device!.createShaderModule({ code });
      this._shaderModules.set(shaderId, sm);
    }
    return sm;
  }

  private _getGeoCache(geo: GeometryDataInterface): WebGPUGeoCache {
    let c = this._geoCache.get(geo);
    if (!c) {
      const createBuf = (data: any, usage: number): GPUBuffer => {
        const b = this._device!.createBuffer({ size: (data.byteLength + 3) & ~3, usage, mappedAtCreation: true });
        if (data instanceof Float32Array) new Float32Array(b.getMappedRange()).set(data);
        else if (data instanceof Uint16Array) new Uint16Array(b.getMappedRange()).set(data);
        else new Uint32Array(b.getMappedRange()).set(data);
        b.unmap();
        return b;
      };
      c = {
        vb: createBuf(geo.vertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
        nb: geo.normals?.length ? createBuf(geo.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) : undefined,
        uvb: geo.uvs?.length ? createBuf(geo.uvs, GPUBufferUsage.VERTEX) : undefined,
        tb: geo.tangents?.length ? createBuf(geo.tangents, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) : undefined,
        ib: geo.indices?.length ? createBuf(geo.indices, GPUBufferUsage.INDEX) : undefined,
        wib: geo.wireframeIndices?.length ? createBuf(geo.wireframeIndices, GPUBufferUsage.INDEX) : undefined,
        indexCount: geo.indices?.length || 0,
        wireframeIndexCount: geo.wireframeIndices?.length || 0,
        vertexCount: geo.vertices.length / 3,
        format: (geo.indices instanceof Uint32Array || geo.wireframeIndices instanceof Uint32Array) ? "uint32" : "uint16",
      };
      this._geoCache.set(geo, c);
    }
    return c;
  }

  /** @inheritdoc */
  public render(scene: Scene, vpMatrix: Float32Array, camPos: Vector3D = new Vector3D()): void {
    if (!this._device) return;
    this._frameCount++;

    const lights = this.extractLights(scene);
    this._updateGlobalBuffers(vpMatrix, camPos, lights);

    const ce = this._device.createCommandEncoder();
    const rp = ce.beginRenderPass({
      colorAttachments: [{ view: this._context.getCurrentTexture().createView(), clearValue: this._clearColor, loadOp: "clear", storeOp: "store" }],
      depthStencilAttachment: { view: this._depthTexture.createView(), depthClearValue: 1.0, depthLoadOp: "clear", depthStoreOp: "store" },
    });

    const sortedGroups = scene.getVisibleObjectsSorted();

    const skyboxGroup = sortedGroups.get(MaterialType.SKYBOX);
    if (skyboxGroup) {
        this._renderGroup(rp, MaterialType.SKYBOX, skyboxGroup);
        sortedGroups.delete(MaterialType.SKYBOX);
    }

    for (const [shaderId, materialGroups] of sortedGroups.entries()) {
      this._renderGroup(rp, shaderId, materialGroups);
    }

    rp.end();
    this._device.queue.submit([ce.finish()]);

    if (this._frameCount % 100 === 0) this._pruneObjectBuffers();
  }

  private _pruneObjectBuffers(): void {
      for (const [uuid, data] of this._objectUniformBuffers.entries()) {
          if (this._frameCount - data.lastFrame > 100) {
              data.buffer.destroy();
              this._objectUniformBuffers.delete(uuid);
          }
      }
  }

  private _renderGroup(rp: GPURenderPassEncoder, shaderId: string, materialGroups: Map<string, Object3D[]>): void {
    const groupIterator = materialGroups.values();
    const firstGroup = groupIterator.next().value;
    if (!firstGroup || firstGroup.length === 0) return;

    const firstObj = firstGroup[0];
    if (!firstObj || !firstObj.material) return;

    const topology: GPUPrimitiveTopology = shaderId === MaterialType.WIREFRAME ? "line-list" : "triangle-list";
    const cache = this._getPipeline(firstObj.material.getRenderManifest(), topology);

    rp.setPipeline(cache.pipeline);
    rp.setBindGroup(0, this._globalBindGroup);

    for (const objects of materialGroups.values()) {
      const mat = objects[0]?.material;
      if (!mat) continue;
      const manifest = mat.getRenderManifest();
      
      for (const obj of objects) {
        if (!obj.geometry) continue;

        const uBuffer = this._getObjUniformBuffer(obj);
        this._updateObjUniformBuffer(uBuffer, obj, manifest);

        const texBindGroup = this._getTexBindGroup(uBuffer, manifest, cache.bgLayouts[1]!);
        rp.setBindGroup(1, texBindGroup);

        const gCache = this._getGeoCache(obj.geometry);
        this._ensureDummyBufferSize(gCache.vertexCount);

        rp.setVertexBuffer(0, gCache.vb);
        rp.setVertexBuffer(1, gCache.nb || this._dummyNormalBuffer);
        rp.setVertexBuffer(2, gCache.uvb || this._dummyUvBuffer);
        rp.setVertexBuffer(3, gCache.tb || this._dummyTangentBuffer);

        if (topology === "line-list" && gCache.wib) {
          rp.setIndexBuffer(gCache.wib, gCache.format!);
          rp.drawIndexed(gCache.wireframeIndexCount);
        } else if (gCache.ib) {
          rp.setIndexBuffer(gCache.ib, gCache.format!);
          rp.drawIndexed(gCache.indexCount);
        } else {
          rp.draw(gCache.vertexCount);
        }
      }
    }
  }

  private _getObjUniformBuffer(obj: Object3D): GPUBuffer {
    let data = this._objectUniformBuffers.get(obj.uuid);
    if (!data) {
      const buffer = this._device!.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      data = { buffer, lastFrame: this._frameCount };
      this._objectUniformBuffers.set(obj.uuid, data);
    }
    data.lastFrame = this._frameCount;
    return data.buffer;
  }

  private _updateObjUniformBuffer(b: GPUBuffer, o: Object3D, m: RenderManifest): void {
    const data = new Float32Array(64);
    data.set(o.worldMatrix.data, 0);
    data.set(o.material!.color.toFloat32Array(), 16);
    
    let specColor = new Color(1, 1, 1, 1);
    if (o.material instanceof PhongMaterial) specColor = o.material.specularColor;
    data.set(specColor.toFloat32Array(), 20);

    const props = m.properties;
    const diff = m.textures["u_diffuseMap"] as Texture;
    data.set([diff?.offset.x || 0, diff?.offset.y || 0, diff?.repeat.x || 1, diff?.repeat.y || 1], 24);
    
    let shininess = 32.0;
    if (o.material instanceof PhongMaterial || o.material instanceof TerrainMaterial) shininess = (o.material as any).shininess;
    
    const metallic = typeof props["u_metallic"] === "number" ? props["u_metallic"] : 0.0;
    const roughness = typeof props["u_roughness"] === "number" ? props["u_roughness"] : 0.5;
    const ao = typeof props["u_ao"] === "number" ? props["u_ao"] : 1.0;

    data.set([shininess, m.shaderId === MaterialType.TERRAIN ? 1.0 : 0.0, metallic, roughness], 28);
    data.set([ao, 0, 0, 0], 32); 
    if (o.material instanceof TerrainMaterial) data.set(o.material.thresholds, 36);

    this._device!.queue.writeBuffer(b, 0, data);
  }

  private _getTexBindGroup(objBuffer: GPUBuffer, m: RenderManifest, layout: GPUBindGroupLayout): GPUBindGroup {
    const texs = m.textures;
    const entries: GPUBindGroupEntry[] = [
        { binding: 0, resource: { buffer: objBuffer } },
        { binding: 1, resource: this._defaultSampler },
    ];

    if (m.shaderId === MaterialType.SKYBOX) {
        entries.push({ binding: 9, resource: this._getGPUCubeTextureView(texs["u_skybox"] as CubeTexture) });
    } else {
        entries.push({ binding: 2, resource: this._getTextureView(texs["u_diffuseMap"] as Texture) });
        entries.push({ binding: 3, resource: this._getNormalTextureView(texs["u_normalMap"] as Texture) });
        entries.push({ binding: 4, resource: this._getTextureView(texs["u_specularMap"] as Texture) });
        entries.push({ binding: 5, resource: this._getTextureView(texs["u_sandMap"] as Texture) });
        entries.push({ binding: 6, resource: this._getTextureView(texs["u_grassMap"] as Texture) });
        entries.push({ binding: 7, resource: this._getTextureView(texs["u_rockMap"] as Texture) });
        entries.push({ binding: 8, resource: this._getTextureView(texs["u_snowMap"] as Texture) });
    }

    return this._device!.createBindGroup({ layout, entries });
  }

  private _getTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this._whiteTexView;
    let v = this._textureViewCache.get(tex);
    if (!v) {
        const t = this._device!.createTexture({ 
          size: [tex.image.width, tex.image.height], 
          format: "rgba8unorm", 
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT 
        });
        this._device!.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [tex.image.width, tex.image.height]);
        v = t.createView();
        this._textureViewCache.set(tex, v);
    }
    return v;
  }

  private _getNormalTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this._flatNormalTexView;
    return this._getTextureView(tex);
  }

  private _getGPUCubeTextureView(tex: CubeTexture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || tex.images.length !== 6) return this._defaultCubeTexView;
    let v = this._cubeTextureViewCache.get(tex);
    if (!v) {
        const img = tex.images[0]!;
        const t = this._device!.createTexture({ 
          size: [img.width, img.height, 6], 
          format: "rgba8unorm", 
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT 
        });
        for(let i=0; i<6; i++) {
          this._device!.queue.copyExternalImageToTexture({ source: tex.images[i]! }, { texture: t, origin: [0,0,i] }, [img.width, img.height]);
        }
        v = t.createView({ dimension: "cube" });
        this._cubeTextureViewCache.set(tex, v);
    }
    return v;
  }

  private _updateGlobalBuffers(vp: Float32Array, camPos: Vector3D, lights: LightDataInterface): void {
    const gData = new Float32Array(64);
    gData.set(vp, 0);
    gData.set([camPos.x, camPos.y, camPos.z, 1], 16);
    
    gData.set([lights.aCol.r * lights.aIntensity, lights.aCol.g * lights.aIntensity, lights.aCol.b * lights.aIntensity, 1], 20);
    gData.set([lights.dCol.r * lights.dIntensity, lights.dCol.g * lights.dIntensity, lights.dCol.b * lights.dIntensity, 1], 24);
    
    gData.set([lights.dDir.x, lights.dDir.y, lights.dDir.z, 0], 28);
    gData.set([lights.pLights.length, lights.sLights.length, lights.aLights.length, 0], 32);
    this._device!.queue.writeBuffer(this._globalUniformBuffer, 0, gData);

    const plData = new Float32Array(Math.max(lights.pLights.length * 8, 8));
    for(let i=0; i<lights.pLights.length; i++) {
        const l = lights.pLights[i]!;
        const d = l.worldMatrix.data;
        plData.set([d[12] as number, d[13] as number, d[14] as number, 1], i*8);
        plData.set([l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, 1], i*8+4);
    }
    this._device!.queue.writeBuffer(this._pointLightBuffer, 0, plData);

    const slData = new Float32Array(Math.max(lights.sLights.length * 16, 16));
    for(let i=0; i<lights.sLights.length; i++) {
        const l = lights.sLights[i]!;
        const d = l.worldMatrix.data;
        slData.set([d[12] as number, d[13] as number, d[14] as number, 1], i*16);
        const dir = MathPool.acquireVector().copyFrom(l.direction).normalize();
        slData.set([dir.x, dir.y, dir.z, 0], i*16+4);
        slData.set([l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, 1], i*16+8);
        slData.set([Math.cos(l.angle), Math.cos(l.angle * (1.0 - l.penumbra)), l.distance, l.decay], i*16+12);
        MathPool.releaseVector(dir);
    }
    this._device!.queue.writeBuffer(this._spotLightBuffer, 0, slData);

    const alData = new Float32Array(Math.max(lights.aLights.length * 24, 24));
    for(let i=0; i<lights.aLights.length; i++) {
        const l = lights.aLights[i]!;
        const m = l.worldMatrix.data;
        const off = i*24;
        alData.set([m[12] as number, m[13] as number, m[14] as number, 1], off);
        alData.set([l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, 1], off+4);
        alData.set([m[0] as number, m[1] as number, m[2] as number, 0], off+8);
        alData.set([m[4] as number, m[5] as number, m[6] as number, 0], off+12);
        alData.set([m[8] as number, m[9] as number, m[10] as number, 0], off+16);
        alData.set([l.width/2, l.height/2, 0, 0], off+20);
    }
    this._device!.queue.writeBuffer(this._areaLightBuffer, 0, alData);
  }

  public override setSize(width: number, height: number): void {
    if (!this._device) return;
    const d = devicePixelRatio;
    this._context.canvas.width = width * d;
    this._context.canvas.height = height * d;
    this._depthTexture = this._device.createTexture({ size: [this._context.canvas.width, this._context.canvas.height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
  }
}
