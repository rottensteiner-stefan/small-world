/// src/renderers/RendererFactory.ts
import { Renderer } from "../interfaces/index.js";
import { RendererType } from "../enums/index.js";
import { WebGL1Renderer } from "./WebGL1Renderer.js";
import { WebGL2Renderer } from "./WebGL2Renderer.js";
import { WebGPURenderer } from "./WebGPURenderer.js";

/**
 * Factory for creating renderer instances.
 */
export class RendererFactory {
  /**
   * Creates a new renderer instance based on the given type.
   * @param type The type of renderer to create.
   * @param canvas The canvas element to initialize the renderer with.
   * @returns A promise that resolves to the created renderer instance.
   */
  public static async create(
    type: RendererType | string,
    canvas: HTMLCanvasElement,
  ): Promise<Renderer> {
    let actualType: RendererType | string = type;
    if (RendererType.BEST === actualType) {
      actualType = navigator.gpu ? RendererType.WEB_GPU : RendererType.WEB_GL2;
    }

    let renderer: Renderer;
    switch (actualType) {
      case RendererType.WEB_GPU:
        if (undefined === navigator.gpu) {
          renderer = new WebGL2Renderer();
        } else {
          renderer = new WebGPURenderer();
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
