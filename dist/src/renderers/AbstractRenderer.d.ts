import { Color } from '../core/colors/index.js';
import { Renderer, LightDataInterface, EngineOptions, QualityConfig } from '../interfaces/index.js';
import { RendererType } from '../enums/index.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
import { PostProcessingGroup } from './post/PostProcessingGroup.js';
/**
 * Base class for all renderer implementations.
 *
 * Backends are expected to implement defensive rendering strategies to prevent "silent failures":
 * 1. Validate that all uniforms defined in a material's layout are actually present in the compiled shader.
 * 2. Log warnings or errors if expected data structures (e.g., WebGPU uniform blocks) are missing or misaligned.
 * 3. Provide fallback values or behaviors if specific features (like rounded rects) are not supported by the hardware.
 */
export declare abstract class AbstractRenderer implements Renderer {
    /** @inheritdoc */
    abstract readonly type: RendererType;
    /** The clear color of the renderer. */
    protected _clearColor: Color;
    /** Global quality settings. */
    protected _quality: QualityConfig;
    /** The global post processing volume/group. */
    postProcessing: PostProcessingGroup;
    /** Cached light data to avoid GC pressure. */
    protected _lightData: LightDataInterface;
    /** @inheritdoc */
    abstract initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineOptions): Promise<void>;
    /** @inheritdoc */
    abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    /** @inheritdoc */
    abstract setSize(width: number, height: number): void;
    /** @inheritdoc */
    abstract setRenderTarget(target: import('../core/textures/index.js').RenderTarget | import('../core/textures/index.js').RenderTargetCube | null, activeCubeFace?: number): void;
    destroy(): void;
    /** @inheritdoc */
    setClearColor(color: Color): void;
    /** @inheritdoc */
    get clearColor(): Color;
    /** @inheritdoc */
    get quality(): QualityConfig;
    /**
     * Extracts all lights from the scene for rendering.
     * @param scene The scene to extract lights from.
     * @returns An object containing all extracted light data.
     */
    extractLights(scene: Scene): LightDataInterface;
    /**
     * Recursively traverses the scene to find lights.
     * @param node The current node to traverse.
     * @private
     */
    private _traverseLights;
}
