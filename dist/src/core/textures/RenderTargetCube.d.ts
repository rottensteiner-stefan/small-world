import { CubeTexture } from './CubeTexture.js';
import { RenderTargetOptions } from './RenderTarget.js';
/**
 * A specialized cube texture that can be rendered to by a Renderer.
 * Represents an environment probe map with 6 faces.
 */
export declare class RenderTargetCube extends CubeTexture {
    /** The width of each face in pixels. */
    width: number;
    /** The height of each face in pixels. */
    height: number;
    /** Whether this render target includes a depth buffer. */
    depth: boolean;
    /** Whether mipmaps should be generated. */
    generateMipmaps: boolean;
    protected constructor(options: RenderTargetOptions);
    /**
     * Resizes the render target cube.
     * @param width The new width.
     * @param height The new height.
     */
    resize(width: number, height: number): void;
    /**
     * Creates a new RenderTargetCube.
     * @param options Configuration options.
     * @returns A new RenderTargetCube instance.
     */
    static create(options: RenderTargetOptions): RenderTargetCube;
}
