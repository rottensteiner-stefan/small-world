import { Color } from "../core/colors/Color.js";
import { CubeTexture } from "../core/textures/CubeTexture.js";
import { DirectionalLight } from "../core/lights/DirectionalLight.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { Light } from "../core/lights/Light.js";
import { LightType } from "../enums/LightType.js";
import { Object3D } from "../core/Object3D.js";
import { PhongMaterial } from "../core/materials/PhongMaterial.js";
import { LambertMaterial } from "../core/materials/LambertMaterial.js";
import { WireframeMaterial } from "../core/materials/WireframeMaterial.js";
import { PointLight } from "../core/lights/PointLight.js";
import { Scene } from "../core/Scene.js";
import { SkyboxMaterial } from "../core/materials/SkyboxMaterial.js";
import { SpotLight } from "../core/lights/SpotLight.js";
import { Texture } from "../core/textures/Texture.js";
import { Vector3D } from "../math/Vector3D.js";
import { RendererType } from "../enums/RendererType.js";

export class WebGPURenderer implements IRenderer {
  public readonly type = RendererType.WEB_GPU;
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private pipelineTriangles!: GPURenderPipeline;
  private pipelineLines!: GPURenderPipeline;
  private pipelineSkybox!: GPURenderPipeline;

  // --- NEU: Wir speichern die BindGroupLayouts explizit ab ---
  private objBGL!: GPUBindGroupLayout;
  private texBGL!: GPUBindGroupLayout;
  private skyTexBGL!: GPUBindGroupLayout;

  private defaultTexBindGroup!: GPUBindGroup;
  private defaultCubeTexBindGroup!: GPUBindGroup;
  private sampler!: GPUSampler;

  private geoCache = new Map<IGeometryData, { vb: GPUBuffer; nb: GPUBuffer | null; uvb: GPUBuffer | null; ib: GPUBuffer | null; indexCount: number; vertexCount: number; format: GPUIndexFormat | null }>();
  private objCache = new Map<Object3D, { ub: GPUBuffer; plb: GPUBuffer; slb: GPUBuffer; bg: GPUBindGroup }>();
  private texCache = new Map<Texture, GPUBindGroup>();
  private texCubeCache = new Map<CubeTexture, GPUBindGroup>();

  private clearColor = { r: 0, g: 0, b: 0, a: 1 };
  private depthTexture!: GPUTexture;

  public async initialize(canvas: HTMLCanvasElement) {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter!.requestDevice();
    this.context = canvas.getContext("webgpu")!;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format, alphaMode: "premultiplied" });

    this.sampler = this.device.createSampler({ magFilter: "linear", minFilter: "linear" });

    const sm = this.device.createShaderModule({
      code: `
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          struct PL { pos: vec4f, col: vec4f }
          @group(0) @binding(1) var<storage> pLights: array<PL>;
          struct SL { pos: vec4f, dir: vec4f, col: vec4f, params: vec4f }
          @group(0) @binding(2) var<storage> sLights: array<SL>;
          @group(1) @binding(0) var t: texture_2d<f32>;
          @group(1) @binding(1) var s: sampler;
          struct Out { @builtin(position) p: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f }
          @vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f) -> Out {
            var o: Out; let worldP = u.model * vec4f(p, 1.0); o.p = u.vp * worldP; o.wp = worldP.xyz;
            o.n = (u.model * vec4f(n, 0.0)).xyz; o.uv = (uv * u.tRep) + u.tOff; return o;
          }
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            let texCol = textureSample(t, s, i.uv);
            if (u.shininess < -0.5) { return u.color * texCol; }
            let N = normalize(i.n); let V = normalize(u.cam.xyz - i.wp); var fL = u.amb.xyz; var spec = vec3f(0.0);
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
            return vec4f((fL * u.color.rgb * texCol.rgb) + (spec * u.specCol.rgb), u.color.a * texCol.a);
          }
        `
    });

    const skySm = this.device.createShaderModule({
      code: `
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          @group(1) @binding(0) var t: texture_cube<f32>; @group(1) @binding(1) var s: sampler;
          struct Out { @builtin(position) p: vec4f, @location(0) uvw: vec3f }
          @vertex fn vs(@location(0) p: vec3f) -> Out {
            var o: Out; o.uvw = p; o.p = u.vp * u.model * vec4f(p, 1.0); return o;
          }
          @fragment fn fs(i: Out) -> @location(0) vec4f { return textureSample(t, s, i.uvw); }
        `
    });

    // --- FIX: Erstelle die BindGroupLayouts manuell ---
    this.objBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } }
      ]
    });

    this.texBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } }
      ]
    });

    this.skyTexBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } }
      ]
    });

    const layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.objBGL, this.texBGL]
    });

    const skyLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.objBGL, this.skyTexBGL]
    });

    const common: any = {
      vertex: { module: sm, buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }, { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] }, { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] }] },
      fragment: { module: sm, targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list", cullMode: "back" },
      depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" },
      layout
    };

    this.pipelineTriangles = this.device.createRenderPipeline(common);
    common.primitive.topology = "line-list";
    this.pipelineLines = this.device.createRenderPipeline(common);

    this.pipelineSkybox = this.device.createRenderPipeline({
      vertex: { module: skySm, buffers: [common.vertex.buffers[0]] },
      fragment: { module: skySm, targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { depthWriteEnabled: false, depthCompare: "less", format: "depth24plus" },
      layout: skyLayout
    });

    const whiteTex = this.device.createTexture({ size: [1, 1], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.device.queue.writeTexture({ texture: whiteTex }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]);

    // --- FIX: Nutze die gespeicherten Layout-Variablen ---
    this.defaultTexBindGroup = this.device.createBindGroup({ layout: this.texBGL, entries: [{ binding: 0, resource: whiteTex.createView() }, { binding: 1, resource: this.sampler }] });

    const whiteCube = this.device.createTexture({ size: [1, 1, 6], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    for(let i=0; i<6; i++) this.device.queue.writeTexture({ texture: whiteCube, origin: [0, 0, i] }, new Uint8Array([50, 50, 100, 255]), { bytesPerRow: 4 }, [1, 1]);
    this.defaultCubeTexBindGroup = this.device.createBindGroup({ layout: this.skyTexBGL, entries: [{ binding: 0, resource: whiteCube.createView({ dimension: "cube" }) }, { binding: 1, resource: this.sampler }] });

    this.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  // ... (setClearColor und setSize bleiben gleich) ...
  public setClearColor(color: Color) { this.clearColor = { r: color.r, g: color.g, b: color.b, a: color.a }; }
  public setSize(width: number, height: number) {
    if (!this.device) return;
    const d = devicePixelRatio;
    this.context.canvas.width = width * d; this.context.canvas.height = height * d;
    this.depthTexture = this.device.createTexture({ size: [this.context.canvas.width, this.context.canvas.height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
  }

  private getGeoCache(geo: IGeometryData) {
    let c = this.geoCache.get(geo);
    if (!c) {
      const createBuf = (data: Float32Array | Uint16Array | Uint32Array, usage: number) => {
        const b = this.device!.createBuffer({ size: (data.byteLength + 3) & ~3, usage, mappedAtCreation: true });
        if (data instanceof Float32Array) new Float32Array(b.getMappedRange()).set(data);
        else if (data instanceof Uint16Array) new Uint16Array(b.getMappedRange()).set(data);
        else new Uint32Array(b.getMappedRange()).set(data);
        b.unmap(); return b;
      };
      c = {
        // --- FIX: geo.positions zu geo.vertices geändert (laut deinem Interface) ---
        vb: createBuf(geo.vertices, GPUBufferUsage.VERTEX),
        nb: geo.normals ? createBuf(geo.normals, GPUBufferUsage.VERTEX) : null,
        uvb: geo.uvs ? createBuf(geo.uvs, GPUBufferUsage.VERTEX) : null,
        ib: geo.indices ? createBuf(geo.indices, GPUBufferUsage.INDEX) : null,
        indexCount: geo.indices ? geo.indices.length : 0,
        vertexCount: geo.vertices.length / 3,
        format: geo.indices ? (geo.indices instanceof Uint16Array ? "uint16" : "uint32") : null
      };
      this.geoCache.set(geo, c);
    }
    return c;
  }

  private getObjCache(obj: Object3D) {
    let c = this.objCache.get(obj);
    if (!c) {
      const ub = this.device!.createBuffer({ size: 1024, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const plb = this.device!.createBuffer({ size: 512, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      const slb = this.device!.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

      const bg = this.device!.createBindGroup({
        layout: this.objBGL, // Nutzt die Instanz-Variable
        entries: [{ binding: 0, resource: { buffer: ub } }, { binding: 1, resource: { buffer: plb } }, { binding: 2, resource: { buffer: slb } }]
      });
      c = { ub, plb, slb, bg }; this.objCache.set(obj, c);
    }
    return c;
  }

  // ... (getGPUTextureBindGroup und getGPUCubeTextureBindGroup nutzen jetzt this.texBGL / this.skyTexBGL) ...
  private getGPUTextureBindGroup(tex: Texture) {
    if (!tex.isLoaded || !tex.image) return this.defaultTexBindGroup;
    let bg = this.texCache.get(tex);
    if (!bg) {
      const t = this.device!.createTexture({ size: [tex.image.width, tex.image.height], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      this.device!.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [tex.image.width, tex.image.height]);
      bg = this.device!.createBindGroup({ layout: this.texBGL, entries: [{ binding: 0, resource: t.createView() }, { binding: 1, resource: this.sampler }] });
      this.texCache.set(tex, bg);
    }
    return bg;
  }

  private getGPUCubeTextureBindGroup(tex: CubeTexture) {
    if (!tex.isLoaded || tex.images.length !== 6) return this.defaultCubeTexBindGroup;
    let bg = this.texCubeCache.get(tex);
    if (!bg) {
      const img = tex.images[0] as ImageBitmap;
      const t = this.device!.createTexture({ size: [img.width, img.height, 6], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      for(let i=0; i<6; i++) this.device!.queue.copyExternalImageToTexture({ source: tex.images[i] as ImageBitmap }, { texture: t, origin: [0, 0, i] }, [img.width, img.height]);
      bg = this.device!.createBindGroup({ layout: this.skyTexBGL, entries: [{ binding: 0, resource: t.createView({ dimension: "cube" }) }, { binding: 1, resource: this.sampler }] });
      this.texCubeCache.set(tex, bg);
    }
    return bg;
  }

  public render(scene: Scene, vpMatrix: Float32Array, camPos: Vector3D = new Vector3D()) {
    if (!this.device) return;
    const ce = this.device.createCommandEncoder();
    const rp = ce.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: this.clearColor,
        loadOp: "clear",
        storeOp: "store"
      }],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store"
        // stencilLoadOp und stencilStoreOp KOMPLETT ENTFERNEN
      },
    });

    // ... (Licht-Berechnung bleibt gleich) ...
    let aCol = new Color(0, 0, 0), dDir = new Vector3D(0, 1, 0), dCol = new Color(0, 0, 0);
    const pLights: PointLight[] = [], sLights: SpotLight[] = [];
    const extractLights = (node: Object3D | Light) => {
      if ("lightType" in node) {
        const light = node as Light;
        switch (light.lightType) {
          case LightType.AMBIENT: aCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity); break;
          case LightType.DIRECTIONAL: const dLight = light as DirectionalLight; dDir = dLight.direction.clone().scale(-1).normalize(); dCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity); break;
          case LightType.POINT: if (pLights.length < 4) pLights.push(light as PointLight); break;
          case LightType.SPOT: if (sLights.length < 4) sLights.push(light as SpotLight); break;
        }
      }
      if (node.children) node.children.forEach(extractLights);
    };
    for (const obj of scene.objects) extractLights(obj);

    const uData = new Float32Array(160);
    uData.set(vpMatrix, 0);
    uData.set([aCol.r, aCol.g, aCol.b, 1.0], 40);
    uData.set([dCol.r, dCol.g, dCol.b, 1.0], 44);
    uData.set([dDir.x, dDir.y, dDir.z, 0.0], 48);
    uData.set([camPos.x, camPos.y, camPos.z, 0.0], 52);
    uData[61] = pLights.length;
    uData[62] = sLights.length;

    const plData = new Float32Array(32);
    for (let i = 0; i < pLights.length; i++) {
      const pl = pLights[i];
      plData.set([pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14], 0.0], i * 8);
      plData.set([pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity, 0.0], i * 8 + 4);
    }
    const slData = new Float32Array(64);
    for (let i = 0; i < sLights.length; i++) {
      const sl = sLights[i], offset = i * 16;
      slData.set([sl.worldMatrix.data[12], sl.worldMatrix.data[13], sl.worldMatrix.data[14], 0.0], offset);
      const dir = sl.direction.clone().normalize();
      slData.set([dir.x, dir.y, dir.z, 0.0], offset + 4);
      slData.set([sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity, 0.0], offset + 8);
      slData.set([Math.cos(sl.angle), Math.cos(sl.angle * (1.0 - sl.penumbra)), sl.distance, sl.decay], offset + 12);
    }

    const drawObject = (obj: Object3D) => {
      if (obj.isVisible === false) return;
      if (obj.geometry && obj.material) {
        const matType = (obj.material.constructor as any).type;
        const isSkybox = matType === SkyboxMaterial.type;
        if (isSkybox) rp.setPipeline(this.pipelineSkybox);
        else rp.setPipeline(matType === WireframeMaterial.type ? this.pipelineLines : this.pipelineTriangles);

        uData.set(obj.worldMatrix.data, 16);
        uData.set(obj.material.color.toArray(), 32);

        let shininess = -1.0; let specCol = [0, 0, 0, 0], texBindGroup = this.defaultTexBindGroup, tOffset = [0, 0], tRepeat = [1, 1];

        if (isSkybox) {
          const mat = obj.material as SkyboxMaterial;
          texBindGroup = mat.cubeMap ? this.getGPUCubeTextureBindGroup(mat.cubeMap) : this.defaultCubeTexBindGroup;
        } else if (matType === LambertMaterial.type) {
          shininess = 0.0;
        } else if (matType === PhongMaterial.type) {
          const mat = obj.material as PhongMaterial;
          shininess = mat.shininess || 32; specCol = mat.specularColor ? mat.specularColor.toArray() : [0, 0, 0, 0];
          if (mat.diffuseMap) { texBindGroup = this.getGPUTextureBindGroup(mat.diffuseMap); tOffset = [mat.diffuseMap.offset.x, mat.diffuseMap.offset.y]; tRepeat = [mat.diffuseMap.repeat.x, mat.diffuseMap.repeat.y]; }
        }

        uData.set(specCol, 36); uData.set(tOffset, 56); uData.set(tRepeat, 58); uData[60] = shininess;

        const oCache = this.getObjCache(obj);
        this.device!.queue.writeBuffer(oCache.ub, 0, uData);
        this.device!.queue.writeBuffer(oCache.plb, 0, plData);
        this.device!.queue.writeBuffer(oCache.slb, 0, slData);

        const gCache = this.getGeoCache(obj.geometry);
        rp.setBindGroup(0, oCache.bg);
        rp.setBindGroup(1, texBindGroup);
        rp.setVertexBuffer(0, gCache.vb);
        rp.setVertexBuffer(1, gCache.nb ? gCache.nb : gCache.vb);
        rp.setVertexBuffer(2, gCache.uvb ? gCache.uvb : gCache.vb);

        if (gCache.ib && gCache.format) { rp.setIndexBuffer(gCache.ib, gCache.format); rp.drawIndexed(gCache.indexCount); }
        else rp.draw(gCache.vertexCount);
      }
      if (obj.children) for (const child of obj.children) drawObject(child);
    };

    for (const obj of scene.objects || []) drawObject(obj);
    rp.end();
    this.device.queue.submit([ce.finish()]);
  }
}