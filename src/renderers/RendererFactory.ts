import { RendererType } from "../interfaces/RendererTypes.js";
import { WebGL2Renderer } from "./WebGL2Renderer.js";
import { WebGPURenderer } from "./WebGPURenderer.js";
export class RendererFactory {
  private static reg = new Map<string, any>();
  public static init() {
    this.reg.set(RendererType.WEBGL2, WebGL2Renderer);
    this.reg.set(RendererType.WEBGPU, WebGPURenderer);
  }
  public static create(type: string) {
    const t =
      type === "BEST" ? ("gpu" in navigator ? RendererType.WEBGPU : RendererType.WEBGL2) : type;
    return new (this.reg.get(t))();
  }
}
