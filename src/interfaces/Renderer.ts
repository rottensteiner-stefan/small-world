import { EngineOptions } from "./EngineOptions.js";
import { Scene } from "../core/index.js";
import { Color } from "../core/colors/index.js";
import { Vector3D } from "../math/index.js";
import { RendererType } from "../enums/index.js";

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
    config?: EngineOptions,
  ): Promise<void>;

  /**
   * Renders a scene.
   */
  render(
    scene: Scene,
    vpMatrix: Float32Array,
    camPos?: Vector3D,
    viewMatrix?: Float32Array,
    near?: number,
    far?: number,
    /** The camera's raw projection matrix, used by HBAO to reconstruct view-space position from depth. */
    projMatrix?: Float32Array,
  ): void;

  /**
   * Sets the size of the render viewport.
   */
  setSize(width: number, height: number): void;

  /**
   * Sets the active render target for off-screen rendering.
   * If null, the renderer targets the screen/post-processing buffer.
   * @param target The target to render into.
   * @param activeCubeFace Optional. Which face (0-5) of the RenderTargetCube to render into.
   */
  setRenderTarget(
    target:
      | import("../core/textures/index.js").RenderTarget
      | import("../core/textures/index.js").RenderTargetCube
      | null,
    activeCubeFace?: number,
  ): void;

  /**
   * Sets the clear color of the renderer.
   */
  setClearColor(color: Color): void;

  /**
   * Gets the clear color of the renderer.
   */
  readonly clearColor: Color;

  /**
   * Gets the global quality settings of the renderer.
   */
  readonly quality: import("./index.js").QualityConfig;

  /**
   * Destroys the renderer and releases its resources.
   */
  destroy?(): void;

  /** WebGPU Device (only for WebGPU renderer) */
  readonly gpuDevice?: GPUDevice | undefined;
  /** WebGL Context (for WebGL1/2 renderers) */
  readonly webglContext?: WebGLRenderingContext | WebGL2RenderingContext | undefined;
}
