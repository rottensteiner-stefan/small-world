import { Scene } from '../core/Scene.js';
import { AreaLight, Color, PointLight, SpotLight } from '../core/index.js';
import { Vector3D } from '../math/Vector3D.js';
import { RendererType } from '../enums/index.js';
import { EngineConfig } from './EngineConfig.js';
/**
 * Interface representing the data for all lights in a scene.
 */
export interface LightDataInterface {
    /** Ambient light color. */
    aCol: Color;
    /** Ambient light intensity. */
    aIntensity: number;
    /** Directional light direction. */
    dDir: Vector3D;
    /** Directional light color. */
    dCol: Color;
    /** Directional light intensity. */
    dIntensity: number;
    /** List of point lights. */
    pLights: PointLight[];
    /** List of spot lights. */
    sLights: SpotLight[];
    /** List of area lights. */
    aLights: AreaLight[];
}
/**
 * Interface for all renderer implementations.
 */
export interface Renderer {
    /** The type of the renderer. */
    readonly type: RendererType;
    /**
     * Initializes the renderer.
     * @param canvas The canvas element to render to.
     * @param attributes Optional context attributes.
     * @param config Optional engine configuration.
     */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineConfig): Promise<void>;
    /**
     * Renders a scene.
     * @param scene The scene to render.
     * @param vpMatrix The view-projection matrix.
     * @param camPos The camera position.
     * @param viewMatrix Optional view matrix for billboarding.
     */
    render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D, viewMatrix?: Float32Array): void;
    /**
     * Sets the size of the render viewport.
     * @param width The width in pixels.
     * @param height The height in pixels.
     */
    setSize(width: number, height: number): void;
    /**
     * Sets the clear color of the renderer.
     * @param color The clear color.
     */
    setClearColor(color: Color): void;
    /**
     * Destroys the renderer and releases its resources.
     */
    destroy?(): void;
}
