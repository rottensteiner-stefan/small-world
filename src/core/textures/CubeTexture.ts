/// src/core/textures/CubeTexture.ts

import {AssetManager} from "../../loaders/index.js";
import {CubeLayout} from "../../enums/index.js";

/**
 * Represents a cube map texture.
 */
export class CubeTexture {
    /** The unique identifier of the texture. */
    public uuid: string = crypto.randomUUID();
    /** The six images comprising the cube map. */
    public images: (ImageBitmap | HTMLImageElement)[] = [];
    /** Whether the texture is fully loaded. */
    public isLoaded: boolean = false;

    /**
     * Creates a new CubeTexture.
     * @param urls Optional array of 6 URLs for the cube faces or a single URL for a tiled texture.
     */
    public constructor(urls?: string[]) {
        if (urls && 6 === urls.length) {
            this.loadFrom(urls);
        } else if (urls && 1 === urls.length) {
            const firstUrl: string = urls[0]!;
            this.loadFrom(firstUrl);
        }
    }

    /**
     * Loads the cube map from one or more URLs.
     * @param urls A single URL or an array of URLs.
     * @param layout Optional layout hint for single images (e.g. 6x1 strip, 3x2 grid, or crosses).
     */
    public async loadFrom(urls: string | string[], layout?: CubeLayout): Promise<void> {
        try {
            if (Array.isArray(urls) && 6 === urls.length && (undefined === layout || CubeLayout.SIX_IMAGES === layout)) {
                this.images = await Promise.all(urls.map((url: string) => AssetManager.loadImage(url, undefined, false)));
                this.isLoaded = true;
                return;
            }

            const url: string = Array.isArray(urls) ? urls[0]! : urls;
            const fullImage: ImageBitmap | HTMLImageElement = await AssetManager.loadImage(url, undefined, false);
            const w: number = fullImage.width;
            const h: number = fullImage.height;

            // Clear existing images
            this.images = [];

            // Determine layout
            let effectiveLayout: CubeLayout | undefined = layout;
            if (undefined === effectiveLayout) {
                if (w > h) {
                    if (w === 6 * h) {
                        effectiveLayout = CubeLayout.STRIP_HORIZONTAL;
                    } else if (w * 2 === 3 * h) {
                        effectiveLayout = CubeLayout.GRID_3X2;
                    } else if (w * 3 === 4 * h) {
                        effectiveLayout = CubeLayout.CROSS_HORIZONTAL;
                    }
                } else {
                    if (h === 6 * w) {
                        effectiveLayout = CubeLayout.STRIP_VERTICAL;
                    } else if (h * 3 === 4 * w) {
                        effectiveLayout = CubeLayout.CROSS_VERTICAL;
                    }
                }
            }

            switch (effectiveLayout) {
                case CubeLayout.STRIP_HORIZONTAL:
                    for (let i: number = 0; 6 > i; i++) {
                        this.images.push(await createImageBitmap(fullImage, i * h, 0, h, h));
                    }
                    break;
                case CubeLayout.STRIP_VERTICAL:
                    for (let i: number = 0; 6 > i; i++) {
                        this.images.push(await createImageBitmap(fullImage, 0, i * w, w, w));
                    }
                    break;
                case CubeLayout.GRID_3X2: {
                    const gridSize: number = w / 3;
                    for (let y: number = 0; 2 > y; y++) {
                        for (let x: number = 0; 3 > x; x++) {
                            this.images.push(await createImageBitmap(fullImage, x * gridSize, y * gridSize, gridSize, gridSize));
                        }
                    }
                    break;
                }
                case CubeLayout.CROSS_HORIZONTAL: {
                    const crossSize: number = w / 4;
                    // +X: (2, 1)
                    this.images.push(await createImageBitmap(fullImage, 2 * crossSize, crossSize, crossSize, crossSize));
                    // -X: (0, 1)
                    this.images.push(await createImageBitmap(fullImage, 0, crossSize, crossSize, crossSize));
                    // +Y: (1, 0)
                    this.images.push(await createImageBitmap(fullImage, crossSize, 0, crossSize, crossSize));
                    // -Y: (1, 2)
                    this.images.push(await createImageBitmap(fullImage, crossSize, 2 * crossSize, crossSize, crossSize));
                    // +Z: (1, 1)
                    this.images.push(await createImageBitmap(fullImage, crossSize, crossSize, crossSize, crossSize));
                    // -Z: (3, 1)
                    this.images.push(await createImageBitmap(fullImage, 3 * crossSize, crossSize, crossSize, crossSize));
                    break;
                }
                case CubeLayout.CROSS_VERTICAL: {
                    const crossSize: number = h / 4;
                    // +X: (2, 1)
                    this.images.push(await createImageBitmap(fullImage, 2 * crossSize, crossSize, crossSize, crossSize));
                    // -X: (0, 1)
                    this.images.push(await createImageBitmap(fullImage, 0, crossSize, crossSize, crossSize));
                    // +Y: (1, 0)
                    this.images.push(await createImageBitmap(fullImage, crossSize, 0, crossSize, crossSize));
                    // -Y: (1, 2)
                    this.images.push(await createImageBitmap(fullImage, crossSize, 2 * crossSize, crossSize, crossSize));
                    // +Z: (1, 1)
                    this.images.push(await createImageBitmap(fullImage, crossSize, crossSize, crossSize, crossSize));
                    // -Z: (1, 3)
                    this.images.push(await createImageBitmap(fullImage, crossSize, 3 * crossSize, crossSize, crossSize));
                    break;
                }
                default:
                    // Fallback: just use it 6 times
                    for (let i: number = 0; 6 > i; i++) {
                        this.images.push(fullImage);
                    }
                    break;
            }

            this.isLoaded = true;
        } catch (e: unknown) {
            console.error(`Error loading CubeTexture: ${urls}`, e);
        }
    }
}
