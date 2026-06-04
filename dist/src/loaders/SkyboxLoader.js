/// src/loaders/SkyboxLoader.ts
import { AssetManager } from "./AssetManager.js";
import { CubeTexture } from "../core/index.js";
import { EventType } from "../enums/index.js";
import { AbstractLoader } from "./AbstractLoader.js";
/**
 * Loader for cube map skybox textures from a single cross-layout image.
 */
export class SkyboxLoader extends AbstractLoader {
    /**
     * Creates a new SkyboxLoader.
     * @param options Optional configuration options.
     */
    constructor(options = {}) {
        super(options);
    }
    /** @inheritdoc */
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });
        try {
            const sourceImage = await AssetManager.loadImage(fullUrl, (loaded, total) => this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total }), false);
            const tileSize = sourceImage.width / 4;
            const canvas = document.createElement("canvas");
            canvas.width = tileSize;
            canvas.height = tileSize;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            const faces = [
                { col: 2, row: 1 }, // 0: +x
                { col: 0, row: 1 }, // 1: -x
                { col: 1, row: 0 }, // 2: +y
                { col: 1, row: 2 }, // 3: -y
                { col: 1, row: 1 }, // 4: +z
                { col: 3, row: 1 }, // 5: -z
            ];
            const images = [];
            for (const face of faces) {
                ctx.clearRect(0, 0, tileSize, tileSize);
                ctx.drawImage(sourceImage, face.col * tileSize, face.row * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);
                const faceBitmap = await createImageBitmap(canvas);
                images.push(faceBitmap);
            }
            const cubeTexture = new CubeTexture();
            cubeTexture.images = images;
            cubeTexture.isLoaded = true;
            this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: cubeTexture });
            return cubeTexture;
        }
        catch (error) {
            this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
            throw error;
        }
    }
}
//# sourceMappingURL=SkyboxLoader.js.map