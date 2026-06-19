/// src/core/textures/CubeTexture.ts
import { AssetManager } from "../../loaders/index.js";
import { CubeLayout } from "../../enums/index.js";
/**
 * Represents a cube map texture.
 */
export class CubeTexture {
    /** The unique identifier of the texture. */
    uuid = crypto.randomUUID();
    /** The six images comprising the cube map. */
    images = [];
    /** Whether the texture is fully loaded. */
    isLoaded = false;
    /**
     * Creates a new CubeTexture.
     * @param urls Optional array of 6 URLs for the cube faces or a single URL for a tiled texture.
     */
    constructor(urls) {
        if (urls && 6 === urls.length) {
            this.loadFrom(urls);
        }
        else if (urls && 1 === urls.length) {
            const firstUrl = urls[0];
            this.loadFrom(firstUrl);
        }
    }
    /**
     * Loads the cube map from one or more URLs.
     * @param urls A single URL or an array of URLs.
     * @param layout Optional layout hint for single images (e.g. 6x1 strip, 3x2 grid, or crosses).
     */
    async loadFrom(urls, layout) {
        try {
            if (Array.isArray(urls) &&
                6 === urls.length &&
                (undefined === layout || CubeLayout.SIX_IMAGES === layout)) {
                this.images = await Promise.all(urls.map((url) => AssetManager.loadImage(url, undefined, false)));
                this.isLoaded = true;
                return;
            }
            const url = Array.isArray(urls) ? urls[0] : urls;
            const fullImage = await AssetManager.loadImage(url, undefined, false);
            const w = fullImage.width;
            const h = fullImage.height;
            // Clear existing images
            this.images = [];
            // Determine layout
            let effectiveLayout = layout;
            if (undefined === effectiveLayout) {
                if (w > h) {
                    if (Math.round(w / 6) === h) {
                        effectiveLayout = CubeLayout.STRIP_HORIZONTAL;
                    }
                    else if (Math.round(w / 3) === Math.round(h / 2)) {
                        effectiveLayout = CubeLayout.GRID_3X2;
                    }
                    else if (Math.round(w / 4) === Math.round(h / 3)) {
                        effectiveLayout = CubeLayout.CROSS_HORIZONTAL;
                    }
                }
                else {
                    if (Math.round(h / 6) === w) {
                        effectiveLayout = CubeLayout.STRIP_VERTICAL;
                    }
                    else if (Math.round(h / 4) === Math.round(w / 3)) {
                        effectiveLayout = CubeLayout.CROSS_VERTICAL;
                    }
                }
            }
            switch (effectiveLayout) {
                case CubeLayout.STRIP_HORIZONTAL: {
                    const faceSize = Math.round(w / 6);
                    for (let i = 0; 6 > i; i++) {
                        this.images.push(await createImageBitmap(fullImage, i * faceSize, 0, faceSize, faceSize));
                    }
                    break;
                }
                case CubeLayout.STRIP_VERTICAL: {
                    const faceSize = Math.round(h / 6);
                    for (let i = 0; 6 > i; i++) {
                        this.images.push(await createImageBitmap(fullImage, 0, i * faceSize, faceSize, faceSize));
                    }
                    break;
                }
                case CubeLayout.GRID_3X2: {
                    const gridSize = Math.round(w / 3);
                    for (let y = 0; 2 > y; y++) {
                        for (let x = 0; 3 > x; x++) {
                            this.images.push(await createImageBitmap(fullImage, x * gridSize, y * gridSize, gridSize, gridSize));
                        }
                    }
                    break;
                }
                case CubeLayout.CROSS_HORIZONTAL: {
                    const crossSize = Math.round(w / 4);
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
                    const crossSize = Math.round(h / 4);
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
                    for (let i = 0; 6 > i; i++) {
                        this.images.push(fullImage);
                    }
                    break;
            }
            this.isLoaded = true;
        }
        catch (e) {
            console.error(`Error loading CubeTexture: ${urls}`, e);
        }
    }
}
//# sourceMappingURL=CubeTexture.js.map