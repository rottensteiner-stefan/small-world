/// src/interfaces/Renderer.ts

import { Scene } from "../core/Scene.js";
import { Color } from "../core/colors/Color.js";
import { Vector3D } from "../math/Vector3D.js";
import { RendererType } from "../enums/RendererType.js";
import { EngineConfig } from "./EngineConfig.js";

/**
 * Interface for all renderer implementations.
 */
export interface Renderer {
  /** The type of the renderer. */
  readonly type: RendererType;

  /** The global post-processing volume/group. */
  postProcessing: import("../renderers/post/index.js").PostProcessingGroup;

  /**
   * Initializes the renderer.
   */
  initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineConfig,
  ): Promise<void>;

  /**
   * Renders a scene.
   */
  render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D, viewMatrix?: Float32Array): void;

  /**
   * Sets the size of the render viewport.
   */
  setSize(width: number, height: number): void;

  /**
   * Sets the clear color of the renderer.
   */
  setClearColor(color: Color): void;

  /**
   * Gets the clear color of the renderer.
   */
  readonly clearColor: Color;

  /**
   * Destroys the renderer and releases its resources.
   */
  destroy?(): void;

  /** WebGPU Device (only for WebGPU renderer) */
  readonly gpuDevice?: GPUDevice | undefined;
  /** WebGL Context (for WebGL1/2 renderers) */
  readonly webglContext?: WebGLRenderingContext | WebGL2RenderingContext | undefined;
}
