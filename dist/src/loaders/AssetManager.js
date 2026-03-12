export class AssetManager {
    static imageCache = new Map();
    static textCache = new Map();
    static async fetchWithProgress(url, onProgress) {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`[AssetManager] HTTP Fehler: ${response.status} bei ${url}`);
        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        if (!onProgress || !response.body) {
            return response.blob();
        }
        const reader = response.body.getReader();
        let loaded = 0;
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (value) {
                loaded += value.length;
                // @ts-expect-error Until we know exactly how to fix it
                chunks.push(value);
                onProgress(loaded, total);
            }
        }
        return new Blob(chunks);
    }
    static async loadImage(url, onProgress, flipY = true) {
        const cacheKey = `${url}_${flipY}`;
        if (this.imageCache.has(cacheKey))
            return this.imageCache.get(cacheKey);
        const loadPromise = this.fetchWithProgress(url, onProgress)
            .then(async (blob) => {
            if (flipY) {
                return createImageBitmap(blob, {
                    colorSpaceConversion: "none",
                    imageOrientation: "flipY",
                });
            }
            else {
                // --- FEATURE DETECTION / FALLBACK ---
                try {
                    // Moderner Standard (ab Chrome 146+)
                    // 'as any' verhindert TypeScript-Meldungen, falls deine TS-Version 'from-image' noch nicht kennt
                    return await createImageBitmap(blob, {
                        colorSpaceConversion: "none",
                        imageOrientation: "from-image",
                    });
                }
                catch (e) {
                    // Fallback für Safari, Firefox und ältere Chrome-Versionen
                    return await createImageBitmap(blob, {
                        colorSpaceConversion: "none",
                        imageOrientation: "none",
                    });
                }
            }
        })
            .catch((err) => {
            console.error(err);
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => reject(`[AssetManager] Fallback fehlgeschlagen: ${url}`);
                img.src = url;
            });
        });
        this.imageCache.set(cacheKey, loadPromise);
        return loadPromise;
    }
    static async loadText(url, onProgress) {
        if (this.textCache.has(url))
            return this.textCache.get(url);
        const loadPromise = this.fetchWithProgress(url, onProgress).then((blob) => blob.text());
        this.textCache.set(url, loadPromise);
        return loadPromise;
    }
}
//# sourceMappingURL=AssetManager.js.map