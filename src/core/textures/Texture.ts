/// src/core/textures/Texture.ts

import {TextureFilter, TextureWrap} from "../../enums/index.js";

/**
 * Represents a 2D texture.
 */
export class Texture {
    /** The underlying image or bitmap data. */
    public image: HTMLImageElement | ImageBitmap | null = null;
    /** Whether the texture is fully loaded and ready for use. */
    public isLoaded: boolean = false;

    /** The magnification filter. */
    public magFilter: TextureFilter = TextureFilter.LINEAR;
    /** The minification filter. */
    public minFilter: TextureFilter = TextureFilter.LINEAR;
    /** The wrapping mode for the U coordinate. */
    public addressModeU: TextureWrap = TextureWrap.REPEAT;
    /** The wrapping mode for the V coordinate. */
    public addressModeV: TextureWrap = TextureWrap.REPEAT;

    /** The UV offset. */
    public offset: { x: number; y: number } = {x: 0, y: 0};
    /** The UV repeat factors. */
    public repeat: { x: number; y: number } = {x: 1, y: 1};

    /**
     * Protected constructor. Use static factory methods to create instances.
     * @param image Optional initial image data.
     */
    protected constructor(image?: HTMLImageElement | ImageBitmap) {
        if (image) {
            this.image = image;
            this.isLoaded = true;
        }
    }

    /**
     * Creates a texture from an existing image or bitmap.
     * @param image The image or bitmap data.
     * @returns A new Texture instance.
     */
    public static fromImage(image: HTMLImageElement | ImageBitmap): Texture {
        return new Texture(image);
    }

    /**
     * Creates an empty texture placeholder.
     * @returns A new empty Texture instance.
     */
    public static empty(): Texture {
        return new Texture();
    }

    /**
     * Loads a texture from a URL.
     * @param url The URL of the image.
     * @returns A promise that resolves to a new Texture instance.
     */
    public static async fromUrl(url: string): Promise<Texture> {
        return new Promise(
            (
                resolve: (value: Texture | PromiseLike<Texture>) => void,
                reject: (reason?: unknown) => void,
            ) => {
                const img: HTMLImageElement = new Image();
                img.crossOrigin = "anonymous";

                img.onload = (): void => {
                    resolve(new Texture(img));
                };

                img.onerror = (): void => {
                    console.warn(`TextureLoader: Konnte Bild nicht laden: ${url}`);
                    reject(new Error(`Fehler beim Laden der Textur: ${url}`));
                };

                img.src = url;
            },
        );
    }
}
