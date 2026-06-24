/**
 * Types of renderers supported by the engine.
 */
export declare const RendererType: {
    /** Automatically select the best available renderer. */
    readonly BEST: "BEST";
    /** WebGPU renderer. */
    readonly WEB_GPU: "WEB_GPU";
    /** WebGL 2.0 renderer. */
    readonly WEB_GL2: "WEB_GL2";
    /** WebGL 1.0 renderer. */
    readonly WEB_GL1: "WEB_GL1";
    /** 2D Canvas fallback renderer. */
    readonly CANVAS: "CANVAS";
};
/** Type definition for RendererType. */
export type RendererType = (typeof RendererType)[keyof typeof RendererType];
