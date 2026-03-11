export class AssetManager {
    static imageCache = new Map();
    static textCache = new Map();
    /**
     * Zentrale Methode, um Dateien mit Fortschrittsanzeige herunterzuladen.
     */
    static async fetchWithProgress(url, onProgress) {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`[AssetManager] HTTP Fehler: ${response.status} bei ${url}`);
        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        // Wenn kein Fortschritt benötigt wird oder kein Body vorhanden ist, direkt als Blob zurückgeben
        if (!onProgress || !response.body) {
            return response.blob();
        }
        const reader = response.body.getReader();
        let loaded = 0;
        // FIX: Wir deklarieren das Array explizit als Array von BlobParts
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (value) {
                loaded += value.length;
                // FIX: Wir casten den Wert sicher zu einem Uint8Array, um TypeScript zufrieden zu stellen
                // @ts-ignore
                chunks.push(value);
                onProgress(loaded, total);
            }
        }
        return new Blob(chunks);
    }
    static async loadImage(url, onProgress, flipY = true // <--- NEU: Optionaler Parameter (Standard ist true)
    ) {
        // Cache-Key anpassen, damit wir beide Varianten sicher speichern können
        const cacheKey = `${url}_${flipY}`;
        if (this.imageCache.has(cacheKey))
            return this.imageCache.get(cacheKey);
        const loadPromise = this.fetchWithProgress(url, onProgress)
            .then((blob) => createImageBitmap(blob, {
            colorSpaceConversion: "none",
            imageOrientation: flipY ? "flipY" : "none" // <--- Hier wenden wir ihn an
        }))
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