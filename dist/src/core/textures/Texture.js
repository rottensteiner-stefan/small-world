/// src/core/textures/Texture.ts
import { TextureFilter, TextureWrap } from "../../enums/index.js";
import { AssetManager } from "../../loaders/AssetManager.js";
/**
 * Represents a 2D texture.
 */
export class Texture {
    /** The underlying image or bitmap data. */
    image = undefined;
    /** Whether the texture is fully loaded and ready for use. */
    isLoaded = false;
    /** The magnification filter. */
    magFilter = TextureFilter.LINEAR;
    /** The minification filter. */
    minFilter = TextureFilter.LINEAR;
    /** The wrapping mode for the U coordinate. */
    addressModeU = TextureWrap.REPEAT;
    /** The wrapping mode for the V coordinate. */
    addressModeV = TextureWrap.REPEAT;
    /** Whether mipmaps should be generated for this texture. */
    generateMipmaps = true;
    /** Desired anisotropic filtering level for this texture. */
    anisotropy = 1;
    /** The UV offset. */
    offset = { x: 0, y: 0 };
    /** The UV repeat factors. */
    repeat = { x: 1, y: 1 };
    /**
     * Protected constructor. Use static factory methods to create instances.
     * @param image Optional initial image data.
     * @param options Optional configuration options.
     */
    constructor(image, options = {}) {
        if (image) {
            this.image = image;
            this.isLoaded = true;
        }
        const { magFilter = TextureFilter.LINEAR, minFilter = TextureFilter.LINEAR, addressModeU = TextureWrap.REPEAT, addressModeV = TextureWrap.REPEAT, generateMipmaps = true, anisotropy = 1, } = options;
        this.magFilter = magFilter;
        this.minFilter = minFilter;
        this.addressModeU = addressModeU;
        this.addressModeV = addressModeV;
        this.generateMipmaps = generateMipmaps;
        this.anisotropy = anisotropy;
    }
    /**
     * Flips the texture horizontally by modifying the UV offset and repeat.
     * @returns This texture instance for chaining.
     */
    flipX() {
        this.repeat.x *= -1;
        this.offset.x = this.repeat.x < 0 ? 1 : 0;
        return this;
    }
    /**
     * Flips the texture vertically by modifying the UV offset and repeat.
     * @returns This texture instance for chaining.
     */
    flipY() {
        this.repeat.y *= -1;
        this.offset.y = this.repeat.y < 0 ? 1 : 0;
        return this;
    }
    /**
     * Creates a texture from an existing image or bitmap.
     * @param image The image or bitmap data.
     * @param options Optional configuration options.
     * @returns A new Texture instance.
     */
    static fromImage(image, options) {
        return new Texture(image, options);
    }
    /**
     * Creates an empty texture placeholder.
     * @param options Optional configuration options.
     * @returns A new empty Texture instance.
     */
    static empty(options) {
        return new Texture(undefined, options);
    }
    /**
     * Loads a texture from a URL.
     * @param url The URL of the image.
     * @param options Optional configuration options.
     * @returns A promise that resolves to a new Texture instance.
     */
    static async fromUrl(url, options) {
        const image = await AssetManager.loadImage(url, undefined, options?.flipY);
        return new Texture(image, options);
    }
}
//# sourceMappingURL=Texture.js.map