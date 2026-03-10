import { IRenderer } from "../interfaces/IRenderer.js";
import { RendererType } from "../enums/RendererType.js";
import { WebGL1Renderer } from "./WebGL1Renderer.js";
import { WebGL2Renderer } from "./WebGL2Renderer.js";
import { WebGPURenderer } from "./WebGPURenderer.js";

export class RendererFactory {
  public static async create(
    type: RendererType | string,
    canvas: HTMLCanvasElement,
  ): Promise<IRenderer> {
    let actualType = type;
    if (actualType === RendererType.BEST)
      actualType = navigator.gpu ? RendererType.WEB_GPU : RendererType.WEB_GL2;
    let renderer: IRenderer;
    switch (actualType) {
      case RendererType.WEB_GPU:
        if (!navigator.gpu) {
          renderer = new WebGL2Renderer();
        } else {
          renderer = new WebGPURenderer(); // <--- 'as any' entfernt!
        }
        break;
      case RendererType.WEB_GL2:
        renderer = new WebGL2Renderer();
        break;
      case RendererType.WEB_GL1:
        renderer = new WebGL1Renderer();
        break;
      default:
        renderer = new WebGL2Renderer();
        break;
    }
    await renderer.initialize(canvas);
    return renderer;
  }
}
