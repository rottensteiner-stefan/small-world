import { Scene } from "../core/Scene.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { Color } from "../core/Color.js";
import { DirectionalLight } from "../core/DirectionalLight.js";
import { Vector3D } from "../math/Vector3D.js";

interface GeoCacheEntry {
  vb: GPUBuffer;
  nb?: GPUBuffer;
  ib?: GPUBuffer;
  format?: GPUIndexFormat;
  vertexCount: number;
  indexCount: number;
}
interface ObjCacheEntry {
  ub: GPUBuffer;
  bg: GPUBindGroup;
}

export class WebGPURenderer implements IRenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private pipelineLines!: GPURenderPipeline;
  private pipelineTriangles!: GPURenderPipeline;
  private bindGroupLayout!: GPUBindGroupLayout;
  private depthTexture!: GPUTexture;
  private canvas!: HTMLCanvasElement;
  private clearColor: number[] = [0.1, 0.1, 0.1, 1.0];
  private geoCache = new Map<any, GeoCacheEntry>();
  private objCache = new Map<any, ObjCacheEntry>();

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter!.requestDevice();
    this.context = canvas.getContext("webgpu")!;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format });

    const shader = this.device.createShaderModule({
      code: `
        struct Unifs {
          vp: mat4x4f,           // offset 0
          model: mat4x4f,        // offset 64
          color: vec4f,          // offset 128
          specColor: vec4f,      // offset 144
          lightColor: vec4f,     // offset 160
          lightDir: vec3f,       // offset 176
          shininess: f32,        // offset 188
          viewPos: vec3f,        // offset 192
          pad: f32               // offset 204
        }
        @group(0) @binding(0) var<uniform> u: Unifs;

        struct In {
          @location(0) pos: vec3f,
          @location(1) normal: vec3f
        }

        struct Out {
          @builtin(position) pos: vec4f,
          @location(0) worldPos: vec3f,
          @location(1) normal: vec3f
        }

        @vertex fn vs(i: In) -> Out {
            var o: Out;
            let wp = u.model * vec4f(i.pos, 1.0);
            o.worldPos = wp.xyz;
            o.pos = u.vp * wp;
            // Simple normal matrix
            o.normal = (u.model * vec4f(i.normal, 0.0)).xyz;
            return o;
        }

        @fragment fn fs(i: Out) -> @location(0) vec4f {
            if (u.shininess < -0.5) { return u.color; }

            let N = normalize(i.normal);
            let L = normalize(u.lightDir);
            let V = normalize(u.viewPos - i.worldPos);
            let R = reflect(-L, N);

            let ambient = u.color.rgb * 0.15;
            let diff = max(dot(N, L), 0.0);
            let diffuse = diff * u.color.rgb * u.lightColor.rgb;

            var specular = vec3f(0.0);
            if (u.shininess > 0.0 && diff > 0.0) {
                let spec = pow(max(dot(V, R), 0.0), u.shininess);
                specular = spec * u.specColor.rgb * u.lightColor.rgb;
            }

            return vec4f(ambient + diffuse + specular, u.color.a);
        }
      `,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    const pipelineConfig: any = {
      layout: pipelineLayout,
      vertex: {
        module: shader,
        entryPoint: "vs",
        buffers: [
          { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
          { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        ],
      },
      fragment: { module: shader, entryPoint: "fs", targets: [{ format: this.format }] },
      depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" },
    };

    this.pipelineTriangles = this.device.createRenderPipeline({
      ...pipelineConfig,
      primitive: { topology: "triangle-list", cullMode: "back" },
    });
    this.pipelineLines = this.device.createRenderPipeline({
      ...pipelineConfig,
      primitive: { topology: "line-list", cullMode: "none" },
    });
    this.createDepthTexture();
  }

  public setClearColor(color: Color): void {
    this.clearColor = color.toArray();
  }
  private createDepthTexture() {
    if (this.depthTexture) this.depthTexture.destroy();
    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }
  public setSize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.createDepthTexture();
  }

  private getGeoCache(geometry: any): GeoCacheEntry {
    let entry = this.geoCache.get(geometry);
    if (!entry) {
      const vb = this.device.createBuffer({
        size: geometry.vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(
        vb,
        0,
        geometry.vertices.buffer as ArrayBuffer,
        geometry.vertices.byteOffset,
        geometry.vertices.byteLength,
      );

      let nb: GPUBuffer | undefined;
      if (geometry.normals && geometry.normals.length > 0) {
        nb = this.device.createBuffer({
          size: geometry.normals.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(
          nb,
          0,
          geometry.normals.buffer as ArrayBuffer,
          geometry.normals.byteOffset,
          geometry.normals.byteLength,
        );
      }

      let ib: GPUBuffer | undefined;
      let format: GPUIndexFormat | undefined;
      let indexCount = 0;
      if (geometry.indices && geometry.indices.length > 0) {
        indexCount = geometry.indices.length;
        ib = this.device.createBuffer({
          size: geometry.indices.byteLength,
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(
          ib,
          0,
          geometry.indices.buffer as ArrayBuffer,
          geometry.indices.byteOffset,
          geometry.indices.byteLength,
        );
        format = geometry.indices instanceof Uint32Array ? "uint32" : "uint16";
      }
      entry = { vb, nb, ib, format, vertexCount: geometry.vertices.length / 3, indexCount };
      this.geoCache.set(geometry, entry);
    }
    return entry;
  }

  private getObjCache(obj: any): ObjCacheEntry {
    let entry = this.objCache.get(obj);
    if (!entry) {
      // 52 Floats = 208 Bytes (inkl. Padding nach WGSL Standard)
      const ub = this.device.createBuffer({
        size: 208,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const bg = this.device.createBindGroup({
        layout: this.bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: ub } }],
      });
      entry = { ub, bg };
      this.objCache.set(obj, entry);
    }
    return entry;
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

    // Licht-Daten aus der Szene holen
    let lDir = new Vector3D(0, 1, 0),
      lCol = new Color(1, 1, 1, 1);
    for (const obj of scene.objects) {
      if (obj instanceof DirectionalLight) {
        lDir = obj.direction.clone().scale(-1);
        const len = lDir.length();
        if (len > 0) lDir.scale(1 / len);
        lCol = new Color(
          obj.color.r * obj.intensity,
          obj.color.g * obj.intensity,
          obj.color.b * obj.intensity,
          1,
        );
        break;
      }
    }

    const uData = new Float32Array(52);
    uData.set(vpMatrix, 0);
    uData.set(lCol.toArray(), 40);
    uData.set([lDir.x, lDir.y, lDir.z], 44);
    uData.set([camPos.x, camPos.y, camPos.z], 48);

    const drawObject = (obj: any) => {
      if (obj.isVisible === false || !obj.material) return;

      if (obj.geometry && obj.worldMatrix) {
        rp.setPipeline(
          obj.material.type === "WireframeMaterial" ? this.pipelineLines : this.pipelineTriangles,
        );

        uData.set(obj.worldMatrix.data, 16);
        uData.set(obj.material.color.toArray(), 32);

        let shininess = -1.0;
        let specCol = [0, 0, 0, 0];
        if (obj.material.type === "LambertMaterial") shininess = 0.0;
        else if (obj.material.type === "PhongMaterial") {
          shininess = obj.material.shininess;
          specCol = obj.material.specularColor.toArray();
        }

        uData.set(specCol, 36);
        uData[47] = shininess;

        const oCache = this.getObjCache(obj);
        this.device.queue.writeBuffer(
          oCache.ub,
          0,
          uData.buffer as ArrayBuffer,
          uData.byteOffset,
          uData.byteLength,
        );

        const gCache = this.getGeoCache(obj.geometry);
        rp.setBindGroup(0, oCache.bg);
        rp.setVertexBuffer(0, gCache.vb);
        if (gCache.nb) rp.setVertexBuffer(1, gCache.nb);

        if (gCache.ib && gCache.format) {
          rp.setIndexBuffer(gCache.ib, gCache.format);
          rp.drawIndexed(gCache.indexCount);
        } else {
          rp.draw(gCache.vertexCount);
        }
      }
      if (obj.children) {
        for (const child of obj.children) drawObject(child);
      }
    };
    for (const obj of scene.objects || []) drawObject(obj);
    rp.end();
    this.device.queue.submit([ce.finish()]);
  }
}
