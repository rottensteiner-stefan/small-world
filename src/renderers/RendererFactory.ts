/// src/renderers/RendererFactory.ts
import { Renderer, EngineOptions } from "../interfaces/index.js";
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
   */
  public static async create(
    type: RendererType | string,
    canvas: HTMLCanvasElement,
    config?: EngineOptions,
  ): Promise<Renderer> {
    let actualType: RendererType | string = type;
    if (RendererType.BEST === actualType) {
      actualType = navigator.gpu ? RendererType.WEB_GPU : RendererType.WEB_GL2;
    }

    let renderer: Renderer;
    let fallbackToWebGL2 = false;

    switch (actualType) {
      case RendererType.WEB_GPU:
        if (undefined === navigator.gpu) {
          console.warn("[RendererFactory] WebGPU is not supported. Falling back to WebGL2.");
          renderer = new WebGL2Renderer();
          fallbackToWebGL2 = true;
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

    let attributes: Record<string, unknown> | undefined = undefined;
    if (config?.renderer) {
      const searchType = fallbackToWebGL2 ? RendererType.WEB_GL2 : actualType;
      const match = config.renderer.find((rc) => rc.type === searchType);
      if (match) {
        attributes = { ...match.attributes };
      }
    }

    if (config?.quality?.msaa !== undefined) {
      attributes = attributes || {};
      if (attributes["antialias"] === undefined) {
        attributes["antialias"] = config.quality.msaa > 0;
      }
    }

    try {
      await renderer.initialize(canvas, attributes, config);
    } catch (e) {
      console.error(`Fehler bei der Initialisierung von ${actualType}:`, e);
      throw e;
    }
    return renderer;
  }
}
