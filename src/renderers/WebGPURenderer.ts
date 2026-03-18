import { CubeTexture } from "../core/textures/CubeTexture.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { Object3D } from "../core/Object3D.js";
import { PhongMaterial } from "../core/materials/PhongMaterial.js";
import { TerrainMaterial } from "../core/materials/TerrainMaterial.js";
import { Scene } from "../core/Scene.js";
import { Texture } from "../core/textures/Texture.js";
import { Vector3D } from "../math/Vector3D.js";
import { RendererType } from "../enums/RendererType.js";
import { MaterialType } from "../enums/MaterialType.js";
import { AbstractRenderer } from "./AbstractRenderer.js";
import { AreaLight } from "../core/lights/AreaLight.js";

interface WebGPUGeoCache {
  vb: GPUBuffer;
  nb: GPUBuffer | null;
  uvb: GPUBuffer | null;
  ib: GPUBuffer | null;
  indexCount: number;
  vertexCount: number;
  format: GPUIndexFormat | null;
}

interface WebGPUObjCache {
  ub: GPUBuffer;
  plb: GPUBuffer;
  slb: GPUBuffer;
  alb: GPUBuffer;
  bg: GPUBindGroup;
}

export class WebGPURenderer extends AbstractRenderer {
  public readonly type = RendererType.WEB_GPU;
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private pipelineTriangles!: GPURenderPipeline;
  private pipelineLines!: GPURenderPipeline;
  private pipelineSkybox!: GPURenderPipeline;

  private objBGL!: GPUBindGroupLayout;
  private texBGL!: GPUBindGroupLayout;
  private skyTexBGL!: GPUBindGroupLayout;

  private defaultTexBindGroup!: GPUBindGroup;
  private defaultCubeTexBindGroup!: GPUBindGroup;
  private sampler!: GPUSampler;
  private whiteTexView!: GPUTextureView;

  private geoCache = new Map<IGeometryData, WebGPUGeoCache>();
  private objCache = new Map<Object3D, WebGPUObjCache>();
  private textureViewCache = new Map<Texture, GPUTextureView>();
  private texCache = new Map<Texture, GPUBindGroup>();
  private terrainTexCache = new Map<TerrainMaterial, GPUBindGroup>();
  private texCubeCache = new Map<CubeTexture, GPUBindGroup>();
  private samplerCache = new Map<string, GPUSampler>();

  private depthTexture!: GPUTexture;

  public async initialize(canvas: HTMLCanvasElement) {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter!.requestDevice();
    this.context = canvas.getContext("webgpu")!;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    });

    this.sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });

    const sm = this.device.createShaderModule({
      code: `
          struct U { 
            vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, 
            dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, 
            numPL: f32, numSL: f32, numAL: f32, 
            thresholds: vec4f, isTerrain: f32, pad1: f32, pad2: f32, pad3: f32 
          }
          @group(0) @binding(0) var<uniform> u: U;
          
          struct PL { pos: vec4f, col: vec4f }
          @group(0) @binding(1) var<storage> pLights: array<PL>;
          
          struct SL { pos: vec4f, dir: vec4f, col: vec4f, params: vec4f }
          @group(0) @binding(2) var<storage> sLights: array<SL>;
          
          struct AL { pos: vec4f, col: vec4f, right: vec4f, up: vec4f, normal: vec4f, size: vec4f }
          @group(0) @binding(3) var<storage> aLights: array<AL>;

          @group(1) @binding(0) var tDiff: texture_2d<f32>;
          @group(1) @binding(1) var s: sampler;
          @group(1) @binding(2) var tSand: texture_2d<f32>;
          @group(1) @binding(3) var tGrass: texture_2d<f32>;
          @group(1) @binding(4) var tRock: texture_2d<f32>;
          @group(1) @binding(5) var tSnow: texture_2d<f32>;
          
          struct Out { @builtin(position) p: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f }
          
          @vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f) -> Out {
            var o: Out; let worldP = u.model * vec4f(p, 1.0); o.p = u.vp * worldP; o.wp = worldP.xyz;
            o.n = (u.model * vec4f(n, 0.0)).xyz; o.uv = (uv * u.tRep) + u.tOff; return o;
          }
          
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            var texCol: vec4f;
            let N = normalize(i.n); 

            if (u.isTerrain > 0.5) {
                let sand = textureSample(tSand, s, i.uv);
                let grass = textureSample(tGrass, s, i.uv);
                let rock = textureSample(tRock, s, i.uv);
                let snow = textureSample(tSnow, s, i.uv);

                let h = i.wp.y;
                let b1 = smoothstep(u.thresholds.x - u.thresholds.w, u.thresholds.x + u.thresholds.w, h);
                let b2 = smoothstep(u.thresholds.y - u.thresholds.w, u.thresholds.y + u.thresholds.w, h);
                let b3 = smoothstep(u.thresholds.z - u.thresholds.w, u.thresholds.z + u.thresholds.w, h);

                texCol = mix(sand, grass, b1);
                texCol = mix(texCol, rock, b2);
                texCol = mix(texCol, snow, b3);

                let slope = 1.0 - N.y;
                let slopeBlend = smoothstep(0.25, 0.45, slope);
                texCol = mix(texCol, rock, slopeBlend);
            } else {
                texCol = textureSample(tDiff, s, i.uv);
            }

            if (u.shininess < -0.5) { return u.color * texCol; }
            
            let V = normalize(u.cam.xyz - i.wp); var fL = u.amb.xyz; var spec = vec3f(0.0);
            
            let L_dir = normalize(u.dDir.xyz); let diff_dir = max(dot(N, L_dir), 0.0); fL += diff_dir * u.dCol.xyz;
            if (u.shininess > 0.0 && diff_dir > 0.0) { spec += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u.shininess) * u.dCol.xyz; }
            
            for(var j=0u; j<u32(u.numPL); j++) {
              let lVec = pLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d;
              let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * pLights[j].col.xyz * atten;
              if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * pLights[j].col.xyz * atten; }
            }
            
            for(var j=0u; j<u32(u.numSL); j++) {
              let lVec = sLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d; let S = normalize(sLights[j].dir.xyz); let theta = dot(-L, S);
              if(theta > sLights[j].params.x) {
                let sEff = smoothstep(sLights[j].params.x, sLights[j].params.y, theta);
                let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * sLights[j].col.xyz * atten * sEff;
                if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * sLights[j].col.xyz * atten * sEff; }
              }
            }

            for(var j=0u; j<u32(u.numAL); j++) {
              let L_center = aLights[j].pos.xyz; let L_normal = normalize(aLights[j].normal.xyz); let dirFromLight = i.wp - L_center;
              if(dot(dirFromLight, L_normal) >= 0.0) {
                let L_right = normalize(aLights[j].right.xyz); let L_up = normalize(aLights[j].up.xyz); let size = aLights[j].size.xy;
                let projX = clamp(dot(dirFromLight, L_right), -size.x, size.x); let projY = clamp(dot(dirFromLight, L_up), -size.y, size.y);
                let closestPoint = L_center + L_right * projX + L_up * projY;
                let lightVec = closestPoint - i.wp; let dist = length(lightVec); let L_al = lightVec / (dist + 0.0001);
                let atten = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); let diff_al = max(dot(N, L_al), 0.0);
                fL += diff_al * aLights[j].col.xyz * atten;
                if (u.shininess > 0.0 && diff_al > 0.0) { spec += pow(max(dot(V, reflect(-L_al, N)), 0.0), u.shininess) * aLights[j].col.xyz * atten; }
              }
            }

            return vec4f((fL * u.color.rgb * texCol.rgb) + (spec * u.specCol.rgb), u.color.a * texCol.a);
          }
        `,
    });

    const skySm = this.device.createShaderModule({
      code: `
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32, numAL: f32, thresholds: vec4f, isTerrain: f32, pad1: f32, pad2: f32, pad3: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          @group(1) @binding(0) var t: texture_cube<f32>; @group(1) @binding(1) var s: sampler;
          struct Out { @builtin(position) p: vec4f, @location(0) uvw: vec3f }
          @vertex fn vs(@location(0) p: vec3f) -> Out { var o: Out; o.uvw = p; o.p = u.vp * u.model * vec4f(p, 1.0); return o; }
          @fragment fn fs(i: Out) -> @location(0) vec4f { return textureSample(t, s, i.uvw); }
        `,
    });

    this.objBGL = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      ],
    });

    this.texBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });

    this.skyTexBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      ],
    });

    const layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.objBGL, this.texBGL],
    });
    const skyLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.objBGL, this.skyTexBGL],
    });

    // NEU: Die Puffer explizit in ein Array auslagern!
    const vertexBuffers: GPUVertexBufferLayout[] = [
      { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
      { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
      { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
    ];

    const common: GPURenderPipelineDescriptor = {
      vertex: {
        module: sm,
        buffers: vertexBuffers,
      },
      fragment: { module: sm, targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list", cullMode: "back" },
      depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" },
      layout,
    };

    this.pipelineTriangles = this.device.createRenderPipeline(common);

    this.pipelineLines = this.device.createRenderPipeline({
      ...common,
      primitive: { topology: "line-list", cullMode: "back" },
    });

    this.pipelineSkybox = this.device.createRenderPipeline({
      // Hier nutzen wir nun direkt unser sicheres Array!
      vertex: { module: skySm, buffers: [vertexBuffers[0]] },
      fragment: { module: skySm, targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { depthWriteEnabled: false, depthCompare: "less", format: "depth24plus" },
      layout: skyLayout,
    });

    const whiteTex = this.device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      { texture: whiteTex },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      [1, 1],
    );
    this.whiteTexView = whiteTex.createView();

    this.defaultTexBindGroup = this.device.createBindGroup({
      layout: this.texBGL,
      entries: [
        { binding: 0, resource: this.whiteTexView },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.whiteTexView },
        { binding: 3, resource: this.whiteTexView },
        { binding: 4, resource: this.whiteTexView },
        { binding: 5, resource: this.whiteTexView },
      ],
    });

    const whiteCube = this.device.createTexture({
      size: [1, 1, 6],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    for (let i = 0; i < 6; i++)
      this.device.queue.writeTexture(
        { texture: whiteCube, origin: [0, 0, i] },
        new Uint8Array([50, 50, 100, 255]),
        { bytesPerRow: 4 },
        [1, 1],
      );
    this.defaultCubeTexBindGroup = this.device.createBindGroup({
      layout: this.skyTexBGL,
      entries: [
        { binding: 0, resource: whiteCube.createView({ dimension: "cube" }) },
        { binding: 1, resource: this.sampler },
      ],
    });

    this.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  private getTextureView(tex: Texture | null): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this.whiteTexView;
    let view = this.textureViewCache.get(tex);
    if (!view) {
      const t = this.device!.createTexture({
        size: [tex.image.width, tex.image.height],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.device!.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [
        tex.image.width,
        tex.image.height,
      ]);
      view = t.createView();
      this.textureViewCache.set(tex, view);
    }
    return view;
  }

  private getSampler(tex: Texture): GPUSampler {
    const key = `${tex.addressModeU}_${tex.addressModeV}_${tex.magFilter}_${tex.minFilter}`;
    if (!this.samplerCache.has(key)) {
      this.samplerCache.set(
        key,
        this.device!.createSampler({
          addressModeU: tex.addressModeU,
          addressModeV: tex.addressModeV,
          magFilter: tex.magFilter,
          minFilter: tex.minFilter,
          mipmapFilter: "linear",
        }),
      );
    }
    return this.samplerCache.get(key)!;
  }

  private getGeoCache(geo: IGeometryData): WebGPUGeoCache {
    let c = this.geoCache.get(geo);
    if (!c) {
      const createBuf = (data: Float32Array | Uint16Array | Uint32Array, usage: number) => {
        const b = this.device!.createBuffer({
          size: (data.byteLength + 3) & ~3,
          usage,
          mappedAtCreation: true,
        });
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
        indexCount: geo.indices ? geo.indices.length : 0,
        vertexCount: geo.vertices.length / 3,
        format: geo.indices ? (geo.indices instanceof Uint16Array ? "uint16" : "uint32") : null,
      };
      this.geoCache.set(geo, c);
    }
    return c;
  }

  private getObjCache(obj: Object3D): WebGPUObjCache {
    let c = this.objCache.get(obj);
    if (!c) {
      const ub = this.device!.createBuffer({
        size: 512,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const plb = this.device!.createBuffer({
        size: 512,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      const slb = this.device!.createBuffer({
        size: 1024,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      const alb = this.device!.createBuffer({
        size: 1024,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      const bg = this.device!.createBindGroup({
        layout: this.objBGL,
        entries: [
          { binding: 0, resource: { buffer: ub } },
          { binding: 1, resource: { buffer: plb } },
          { binding: 2, resource: { buffer: slb } },
          { binding: 3, resource: { buffer: alb } },
        ],
      });
      c = { ub, plb, slb, alb, bg };
      this.objCache.set(obj, c);
    }
    return c;
  }

  private getGPUTextureBindGroup(tex: Texture) {
    if (!tex.isLoaded || !tex.image) return this.defaultTexBindGroup;
    let bg = this.texCache.get(tex);
    if (!bg) {
      bg = this.device!.createBindGroup({
        layout: this.texBGL,
        entries: [
          { binding: 0, resource: this.getTextureView(tex) },
          { binding: 1, resource: this.getSampler(tex) },
          { binding: 2, resource: this.whiteTexView },
          { binding: 3, resource: this.whiteTexView },
          { binding: 4, resource: this.whiteTexView },
          { binding: 5, resource: this.whiteTexView },
        ],
      });
      this.texCache.set(tex, bg);
    }
    return bg;
  }

  private getGPUTerrainBindGroup(mat: TerrainMaterial) {
    let bg = this.terrainTexCache.get(mat);
    if (!bg) {
      bg = this.device!.createBindGroup({
        layout: this.texBGL,
        entries: [
          { binding: 0, resource: this.whiteTexView },
          { binding: 1, resource: this.sampler },
          { binding: 2, resource: this.getTextureView(mat.sandMap) },
          { binding: 3, resource: this.getTextureView(mat.grassMap) },
          { binding: 4, resource: this.getTextureView(mat.rockMap) },
          { binding: 5, resource: this.getTextureView(mat.snowMap) },
        ],
      });
      this.terrainTexCache.set(mat, bg);
    }
    return bg;
  }

  public render(scene: Scene, vpMatrix: Float32Array, camPos: Vector3D = new Vector3D()) {
    if (!this.device) return;
    const ce = this.device.createCommandEncoder();
    const rp = ce.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: this.clearColor,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    const { aCol, dDir, dCol, pLights, sLights, aLights } = this.extractLights(scene);

    const uData = new Float32Array(80);
    uData.set(vpMatrix, 0);
    uData.set([aCol.r, aCol.g, aCol.b, 1.0], 40);
    uData.set([dCol.r, dCol.g, dCol.b, 1.0], 44);
    uData.set([dDir.x, dDir.y, dDir.z, 0.0], 48);
    uData.set([camPos.x, camPos.y, camPos.z, 0.0], 52);
    uData[61] = pLights.length;
    uData[62] = sLights.length;
    uData[63] = aLights.length;

    const plData = new Float32Array(32);
    for (let i = 0; i < pLights.length; i++) {
      const pl = pLights[i];
      plData.set(
        [pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14], 0.0],
        i * 8,
      );
      plData.set(
        [pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity, 0.0],
        i * 8 + 4,
      );
    }

    const slData = new Float32Array(64);
    for (let i = 0; i < sLights.length; i++) {
      const sl = sLights[i],
        offset = i * 16;
      slData.set(
        [sl.worldMatrix.data[12], sl.worldMatrix.data[13], sl.worldMatrix.data[14], 0.0],
        offset,
      );
      const dir = sl.direction.clone().normalize();
      slData.set([dir.x, dir.y, dir.z, 0.0], offset + 4);
      slData.set(
        [sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity, 0.0],
        offset + 8,
      );
      slData.set(
        [Math.cos(sl.angle), Math.cos(sl.angle * (1.0 - sl.penumbra)), sl.distance, sl.decay],
        offset + 12,
      );
    }

    const alData = new Float32Array(96);
    for (let i = 0; i < aLights.length; i++) {
      const al = aLights[i] as AreaLight;
      const mat = al.worldMatrix.data,
        offset = i * 24;
      alData.set([mat[12], mat[13], mat[14], 0.0], offset);
      alData.set(
        [al.color.r * al.intensity, al.color.g * al.intensity, al.color.b * al.intensity, 0.0],
        offset + 4,
      );
      alData.set([mat[0], mat[1], mat[2], 0.0], offset + 8);
      alData.set([mat[4], mat[5], mat[6], 0.0], offset + 12);
      alData.set([mat[8], mat[9], mat[10], 0.0], offset + 16);
      alData.set([al.width / 2.0, al.height / 2.0, 0.0, 0.0], offset + 20);
    }

    const drawObject = (obj: Object3D) => {
      // 1. Abbruch NUR, wenn das Objekt (und damit seine Kinder) explizit unsichtbar geschaltet wurde
      if (!obj.isVisible) return;

      // 2. Nur zeichnen, wenn auch wirklich Geometrie und Material da sind
      if (obj.geometry && obj.material) {
        const mat = obj.material;
        let texBindGroup: GPUBindGroup = this.defaultTexBindGroup;
        let shininess = -1.0,
          specCol = [0, 0, 0, 0],
          tOffset = [0, 0],
          tRepeat = [1, 1];
        let isTerrain = 0.0,
          thresholds = [0, 0, 0, 0];

        if (mat.type === MaterialType.SKYBOX) {
          rp.setPipeline(this.pipelineSkybox);
        } else {
          rp.setPipeline(
            mat.type === MaterialType.WIREFRAME ? this.pipelineLines : this.pipelineTriangles,
          );

          if (mat.type === MaterialType.LAMBERT) {
            shininess = 0.0;
          } else if (mat.type === MaterialType.PHONG) {
            const pMat = mat as PhongMaterial;
            shininess = pMat.shininess || 32;
            specCol = pMat.specularColor ? pMat.specularColor.toArray() : [0, 0, 0, 0];
            if (pMat.diffuseMap) {
              texBindGroup = this.getGPUTextureBindGroup(pMat.diffuseMap);
              tOffset = [pMat.diffuseMap.offset.x, pMat.diffuseMap.offset.y];
              tRepeat = [pMat.diffuseMap.repeat.x, pMat.diffuseMap.repeat.y];
            }
          } else if (mat.type === MaterialType.TERRAIN) {
            isTerrain = 1.0;
            const tMat = mat as TerrainMaterial;
            shininess = tMat.shininess;
            tRepeat = tMat.texRepeat;
            thresholds = tMat.thresholds;
            texBindGroup = this.getGPUTerrainBindGroup(tMat);
          }
        }

        uData.set(obj.worldMatrix.data, 16);
        uData.set(mat.color.toArray(), 32);
        uData.set(specCol, 36);
        uData.set(tOffset, 56);
        uData.set(tRepeat, 58);
        uData[60] = shininess;
        uData.set(thresholds, 64);
        uData[68] = isTerrain;

        const oCache = this.getObjCache(obj);
        this.device!.queue.writeBuffer(oCache.ub, 0, uData);
        this.device!.queue.writeBuffer(oCache.plb, 0, plData);
        this.device!.queue.writeBuffer(oCache.slb, 0, slData);
        this.device!.queue.writeBuffer(oCache.alb, 0, alData);

        const gCache = this.getGeoCache(obj.geometry);
        rp.setBindGroup(0, oCache.bg);
        rp.setBindGroup(1, texBindGroup);
        rp.setVertexBuffer(0, gCache.vb);
        rp.setVertexBuffer(1, gCache.nb ? gCache.nb : gCache.vb);
        rp.setVertexBuffer(2, gCache.uvb ? gCache.uvb : gCache.vb);

        if (gCache.ib && gCache.format) {
          rp.setIndexBuffer(gCache.ib, gCache.format);
          rp.drawIndexed(gCache.indexCount);
        } else {
          rp.draw(gCache.vertexCount);
        }
      }

      // 3. WICHTIG: IMMER die Kinder durchlaufen, auch wenn der Parent nur ein leerer Container ist!
      if (obj.children) {
        for (const child of obj.children) {
          drawObject(child);
        }
      }
    };

    for (const obj of scene.objects || []) drawObject(obj);
    rp.end();
    this.device.queue.submit([ce.finish()]);
  }

  public setSize(width: number, height: number) {
    if (!this.device) return;
    const d = devicePixelRatio;
    this.context.canvas.width = width * d;
    this.context.canvas.height = height * d;

    if ("style" in this.context.canvas) {
      this.context.canvas.style.width = `${width}px`;
      this.context.canvas.style.height = `${height}px`;
    }

    this.depthTexture = this.device.createTexture({
      size: [this.context.canvas.width, this.context.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }
}
