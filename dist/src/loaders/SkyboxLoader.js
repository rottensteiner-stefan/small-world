import { AssetManager } from "./AssetManager.js";
import { CubeTexture } from "../core/textures/CubeTexture.js";
import { EventType } from "../enums/EventType.js";
import { Loader } from "./Loader.js";
export class SkyboxLoader extends Loader {
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent("loadStart", { url: fullUrl });
        try {
            // 1. Laden über den AssetManager:
            // Wir übergeben den Progress-Callback und setzen flipY auf FALSE (3. Parameter)
            const sourceImage = await AssetManager.loadImage(fullUrl, (loaded, total) => this.dispatchEvent(EventType.PROGRESS, { url: fullUrl, loaded, total }), false);
            // 2. Das Bild zerschneiden
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
                ctx.drawImage(sourceImage, // Type-Cast für TypeScript
                face.col * tileSize, face.row * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);
                const faceBitmap = await createImageBitmap(canvas);
                images.push(faceBitmap);
            }
            // 3. CubeTexture zusammenbauen
            const cubeTexture = new CubeTexture();
            cubeTexture.images = images;
            cubeTexture.isLoaded = true;
            this.dispatchEvent(EventType.LOAD_END, { url: fullUrl, data: cubeTexture });
            return cubeTexture;
        }
        catch (error) {
            this.dispatchEvent(EventType.ERROR, { url: fullUrl, error });
            throw error;
        }
    }
}
//# sourceMappingURL=SkyboxLoader.js.map