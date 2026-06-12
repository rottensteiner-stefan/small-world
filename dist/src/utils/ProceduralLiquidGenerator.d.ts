import { Texture } from '../core/textures/Texture.js';
/**
 * A utility class for generating procedural liquid textures and masks using HTML5 Canvas.
 *
 * Credits & Inspiration:
 * - Puddle Mask generation is based on the "Particle/Cluster Method" combined with the
 *   "2D Metaball Canvas Trick" (Gaussian Blur + Alpha Thresholding), a standard technique
 *   in HTML5 Game Development for creating organic blob shapes (e.g., as taught in Khan
 *   Academy particle tutorials and various HTML5 gamedev forums).
 * - Iridescent Noise generation uses layered sine waves and distance functions to simulate
 *   thin-film interference color gradients.
 */
export declare class ProceduralLiquidGenerator {
    /**
     * Generates a procedural, organic puddle mask (black and white).
     * @param size The width and height of the generated texture (e.g., 512).
     * @param blobCount The number of peripheral droplets to scatter.
     * @returns A Texture object containing the generated alpha mask.
     */
    static generatePuddleMask(size?: number, blobCount?: number): Texture;
    /**
     * Generates a seamless procedural iridescent oil texture.
     * Uses Simplex-like noise but returns a mostly dark texture with rainbow highlights.
     * @param size The resolution of the texture.
     * @returns A Texture instance.
     */
    static generateIridescentTexture(size?: number): Texture;
    /**
     * Helper function to convert HSL color to RGB.
     * @param h Hue (0-360)
     * @param s Saturation (0-1)
     * @param l Lightness (0-1)
     * @returns RGB object with values 0-255
     */
    static hslToRgb(h: number, s: number, l: number): {
        r: number;
        g: number;
        b: number;
    };
}
