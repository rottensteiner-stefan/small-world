import { Color } from '../core/index.js';
import { Renderer, LightDataInterface } from '../interfaces/index.js';
import { RendererType } from '../enums/index.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/Vector3D.js';
import { EngineConfig, QualityConfig } from '../interfaces/EngineConfig.js';
/**
 * Base class for all renderer implementations.
 */
export declare abstract class AbstractRenderer implements Renderer {
    /** @inheritdoc */
    abstract readonly type: RendererType;
    /** The clear color of the renderer. */
    protected _clearColor: Color;
    /** Global quality settings. */
    protected _quality: QualityConfig;
    /** Cached light data to avoid GC pressure. */
    protected _lightData: LightDataInterface;
    /** @inheritdoc */
    abstract initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineConfig): Promise<void>;
    /** @inheritdoc */
    abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    /** @inheritdoc */
    abstract setSize(width: number, height: number): void;
    destroy(): void;
    /** @inheritdoc */
    setClearColor(color: Color): void;
    /**
     * Extracts all lights from the scene for rendering.
     * @param scene The scene to extract lights from.
     * @returns An object containing all extracted light data.
     */
    protected extractLights(scene: Scene): LightDataInterface;
    /**
     * Recursively traverses the scene to find lights.
     * @param node The current node to traverse.
     * @private
     */
    private _traverseLights;
}
