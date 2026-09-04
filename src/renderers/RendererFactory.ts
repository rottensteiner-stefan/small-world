import {
  Renderer,
  EngineOptions,
  RendererContext,
  createDefaultRendererContext,
} from "../interfaces/index.js";
import { RendererType } from "../enums/index.js";
import { WebGL1Renderer } from "./WebGL1/index.js";
import { WebGL2Renderer } from "./WebGL2/index.js";
import { WebGPURenderer } from "./WebGPU/index.js";
import { DeviceFeature } from "../core/DeviceCaps.js";

/**
 * Factory for creating renderer instances.
 */
export class RendererFactory {
  /**
   * Looks up this backend's configured context attributes, if any.
   * `config.renderer` is keyed by a fixed set of backend names, but `type` here can be an
   * arbitrary string (see `RendererType | string` below), so the lookup goes through an
   * index-signature cast rather than the named-key type.
   */
  private static _getBackendAttributes(
    config: EngineOptions | undefined,
    type: RendererType | string,
  ): Record<string, unknown> | undefined {
    const renderer = config?.renderer as
      Record<string, { attributes?: Record<string, unknown> } | undefined> | undefined;
    const backend = renderer?.[type];
    return backend?.attributes ? { ...backend.attributes } : undefined;
  }

  /**
   * Creates a new renderer instance based on the given type.
   */
  public static async create(
    type: RendererType | string,
    canvas: HTMLCanvasElement,
    config?: EngineOptions,
    context: RendererContext = createDefaultRendererContext(),
  ): Promise<Renderer> {
    context.deviceCaps.init();

    let actualType: RendererType | string = type;
    if (RendererType.BEST === actualType) {
      actualType = context.deviceCaps.hasFeature(DeviceFeature.WEBGPU)
        ? RendererType.WEB_GPU
        : RendererType.WEB_GL2;
    }

    let renderer: Renderer;
    let fallbackToWebGL2 = false;

    switch (actualType) {
      case RendererType.WEB_GPU:
        if (!context.deviceCaps.hasFeature(DeviceFeature.WEBGPU)) {
          console.warn("[RendererFactory] WebGPU is not supported. Falling back to WebGL2.");
          renderer = new WebGL2Renderer(context);
          fallbackToWebGL2 = true;
        } else {
          renderer = new WebGPURenderer(context);
        }
        break;
      case RendererType.WEB_GL2:
        if (!context.deviceCaps.hasFeature(DeviceFeature.WEBGL2)) {
          console.warn("[RendererFactory] WebGL2 is not supported. Falling back to WebGL1.");
          renderer = new WebGL1Renderer(context);
        } else {
          renderer = new WebGL2Renderer(context);
        }
        break;
      case RendererType.WEB_GL1:
        if (!context.deviceCaps.hasFeature(DeviceFeature.WEBGL1)) {
          throw new Error("[RendererFactory] No WebGL1 support detected. Cannot run engine.");
        }
        renderer = new WebGL1Renderer(context);
        break;
      default:
        renderer = new WebGL2Renderer(context);
        break;
    }

    const searchType = fallbackToWebGL2 ? RendererType.WEB_GL2 : actualType;
    let attributes = RendererFactory._getBackendAttributes(config, searchType);

    if (config?.quality?.msaa !== undefined) {
      attributes = attributes || {};
      if (attributes["antialias"] === undefined) {
        attributes["antialias"] = config.quality.msaa > 0;
      }
    }

    try {
      await renderer.initialize(canvas, attributes, config);
    } catch (e) {
      if (actualType === RendererType.WEB_GPU && !fallbackToWebGL2) {
        console.warn(`[RendererFactory] WebGPU initialization failed. Falling back to WebGL2.`);
        renderer = new WebGL2Renderer(context);

        // Re-evaluate attributes for WebGL2
        let fallbackAttributes = RendererFactory._getBackendAttributes(
          config,
          RendererType.WEB_GL2,
        );
        if (config?.quality?.msaa !== undefined) {
          fallbackAttributes = fallbackAttributes || {};
          if (fallbackAttributes["antialias"] === undefined) {
            fallbackAttributes["antialias"] = config.quality.msaa > 0;
          }
        }

        // Initialize WebGL2 instead
        await renderer.initialize(canvas, fallbackAttributes, config);
      } else if (
        actualType === RendererType.WEB_GL2 &&
        context.deviceCaps.hasFeature(DeviceFeature.WEBGL1)
      ) {
        console.warn(`[RendererFactory] WebGL2 initialization failed. Falling back to WebGL1.`);
        renderer = new WebGL1Renderer(context);

        // Re-evaluate attributes for WebGL1
        let fallbackAttributes = RendererFactory._getBackendAttributes(
          config,
          RendererType.WEB_GL1,
        );
        if (config?.quality?.msaa !== undefined) {
          fallbackAttributes = fallbackAttributes || {};
          if (fallbackAttributes["antialias"] === undefined) {
            fallbackAttributes["antialias"] = config.quality.msaa > 0;
          }
        }

        // Initialize WebGL1 instead
        await renderer.initialize(canvas, fallbackAttributes, config);
      } else {
        console.error(`Error initializing ${actualType}:`, e);
        throw e;
      }
    }
    return renderer;
  }
}
