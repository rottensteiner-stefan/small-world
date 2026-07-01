import { Texture, TextureOptions } from './Texture.js';
/**
 * Configuration options for creating a RenderTarget.
 */
export interface RenderTargetOptions extends TextureOptions {
    /** The width of the render target in pixels. */
    width: number;
    /** The height of the render target in pixels. */
    height: number;
    /** Whether to include a depth/stencil buffer. Defaults to true. */
    depth?: boolean;
}
/**
 * A specialized texture that can be rendered to by a Renderer.
 */
export declare class RenderTarget extends Texture {
    /** The width of the render target in pixels. */
    width: number;
    /** The height of the render target in pixels. */
    height: number;
    /** Whether this render target includes a depth buffer. */
    depth: boolean;
    protected constructor(options: RenderTargetOptions);
    /**
     * Resizes the render target.
     * Note: The underlying renderer will recreate the GPU resources on the next frame.
     * @param width The new width.
     * @param height The new height.
     */
    resize(width: number, height: number): void;
    /**
     * Creates a new RenderTarget.
     * @param options Configuration options.
     * @returns A new RenderTarget instance.
     */
    static create(options: RenderTargetOptions): RenderTarget;
}
