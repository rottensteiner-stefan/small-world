import { ProjectionType, RendererType } from '../enums/index.js';
/**
 * Configuration for a single renderer backend.
 */
export interface EngineRendererConfig {
    /** The type of the renderer (e.g., WEB_GL2, WEB_GPU). */
    type: RendererType | string;
    /** Context attributes passed to getContext(). */
    attributes?: Record<string, unknown>;
}
/**
 * Tone mapping algorithms for HDR rendering.
 */
export declare const ToneMapping: {
    /** No tone mapping applied. */
    readonly NONE: "none";
    /** Reinhard tone mapping. */
    readonly REINHARD: "reinhard";
    /** ACES Filmic tone mapping. */
    readonly ACES: "aces";
};
/** Type definition for ToneMapping. */
export type ToneMapping = (typeof ToneMapping)[keyof typeof ToneMapping];
/**
 * Quality settings for the engine.
 */
export interface QualityConfig {
    /** Global toggle for mipmapping. Defaults to true. */
    mipmapping?: boolean;
    /** Maximum anisotropic filtering level (1, 4, 8, 16). Defaults to 4. */
    maxAnisotropy?: number;
    /** Antialiasing (MSAA) level (0, 2, 4, 8). Defaults to 4. */
    msaa?: number;
    /** Maximum shadow map resolution. Defaults to 1024. */
    maxShadowResolution?: number;
    /** Whether to enable HDR rendering. Defaults to false. */
    hdr?: boolean;
    /** The tone mapping algorithm to use. Defaults to NONE. */
    toneMapping?: ToneMapping;
    /** Global gamma factor for color correction. Defaults to 2.2. */
    gamma?: number;
    /** Global exposure factor for brightness control. Defaults to 1.0. */
    exposure?: number;
}
/**
 * Global engine configuration options.
 */
export interface EngineConfig {
    /** The ID of the canvas element in the DOM. Defaults to "SmallWorld". */
    canvasId?: string;
    /** Whether the engine should automatically resize the canvas to full screen. */
    fullscreen?: boolean;
    /** Fixed height in pixels (ignored if fullscreen is true). */
    height?: number;
    /** Fixed width in pixels (ignored if fullscreen is true). */
    width?: number;
    /** Default camera projection type. */
    projection?: ProjectionType;
    /** Primary renderer type to attempt initialization. */
    rendererType?: RendererType;
    /** Detailed renderer configurations. */
    renderer?: EngineRendererConfig[];
    /** Optional quality settings. */
    quality?: QualityConfig;
}
