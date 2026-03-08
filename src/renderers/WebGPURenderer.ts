import { Scene } from "../core/Scene.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { Color } from "../core/Color.js";
export class WebGPURenderer implements IRenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private pipeline!: GPURenderPipeline;
  private depthTexture!: GPUTexture;
  private canvas!: HTMLCanvasElement;

  private clearColor: number[] = [0.1, 0.1, 0.1, 1.0];

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter!.requestDevice();
    this.context = canvas.getContext("webgpu")!;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format });

    const shader = this.device.createShaderModule({
      code: `
                struct Unifs { vp: mat4x4f, model: mat4x4f, color: vec4f }
                @group(0) @binding(0) var<uniform> u: Unifs;
                struct Out { @builtin(position) pos: vec4f, @location(0) col: vec4f }
                @vertex fn vs(@location(0) p: vec3f) -> Out {
                    var o: Out;
                    o.pos = u.vp * u.model * vec4f(p, 1.0);
                    o.col = u.color;
                    return o;
                }
                @fragment fn fs(i: Out) -> @location(0) vec4f { return i.col; }
            `,
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shader,
        entryPoint: "vs",
        buffers: [
          { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
        ],
      },
      fragment: { module: shader, entryPoint: "fs", targets: [{ format: this.format }] },
      // FIX 1: line-list statt triangle-list! (Und kein Culling für Linien)
      primitive: { topology: "line-list", cullMode: "none" },
      depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" },
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

  public render(scene: Scene, vpMatrix: Float32Array) {
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
    rp.setPipeline(this.pipeline);

    const drawObject = (obj: any) => {
      if (obj.geometry && obj.worldMatrix) {
        const uData = new Float32Array(36);
        uData.set(vpMatrix, 0);
        uData.set(obj.worldMatrix.data, 16);
        uData.set(obj.color.toArray(), 32);

        const ub = this.device.createBuffer({
          size: uData.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(
          ub,
          0,
          uData.buffer as ArrayBuffer,
          uData.byteOffset,
          uData.byteLength,
        );

        const vertices = obj.geometry.vertices;
        const vb = this.device.createBuffer({
          size: vertices.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(
          vb,
          0,
          vertices.buffer as ArrayBuffer,
          vertices.byteOffset,
          vertices.byteLength,
        );

        rp.setBindGroup(
          0,
          this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: ub } }],
          }),
        );
        rp.setVertexBuffer(0, vb);

        // FIX 2: Den Index-Buffer hochladen und binden!
        if (obj.geometry.indices && obj.geometry.indices.length > 0) {
          const indices = obj.geometry.indices;
          const ib = this.device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
          });
          this.device.queue.writeBuffer(
            ib,
            0,
            indices.buffer as ArrayBuffer,
            indices.byteOffset,
            indices.byteLength,
          );

          const format = indices instanceof Uint32Array ? "uint32" : "uint16";
          rp.setIndexBuffer(ib, format);
          rp.drawIndexed(indices.length);
        } else {
          rp.draw(vertices.length / 3);
        }
      }

      if (obj.children) {
        for (const child of obj.children) {
          drawObject(child);
        }
      }
    };

    for (const obj of scene.objects || []) {
      drawObject(obj);
    }

    rp.end();
    this.device.queue.submit([ce.finish()]);
  }
}
