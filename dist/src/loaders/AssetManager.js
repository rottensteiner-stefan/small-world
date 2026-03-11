export class AssetManager {
    // Caches für verschiedene Dateitypen (speichert den Promise, damit gleichzeitige Anfragen nicht doppelt laden)
    static imageCache = new Map();
    static jsonCache = new Map();
    static textCache = new Map();
    /**
     * Lädt ein Bild und decodiert es optimal für die GPU.
     */
    static async loadImage(url) {
        if (this.imageCache.has(url)) {
            return this.imageCache.get(url);
        }
        const loadPromise = fetch(url)
            .then((response) => {
            if (!response.ok)
                throw new Error(`[AssetManager] Fehler beim Laden des Bildes: ${url}`);
            return response.blob();
        })
            .then((blob) => {
            // createImageBitmap ist extrem schnell für WebGL/WebGPU
            return createImageBitmap(blob, { colorSpaceConversion: "none", imageOrientation: "flipY" });
        })
            .catch((err) => {
            console.error(err);
            // Fallback für sehr alte Browser, falls createImageBitmap fehlschlägt
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => reject(`[AssetManager] Fallback-Laden fehlgeschlagen: ${url}`);
                img.src = url;
            });
        });
        this.imageCache.set(url, loadPromise);
        return loadPromise;
    }
    /**
     * Lädt eine JSON-Datei (z.B. für Level-Daten oder Configs).
     */
    static async loadJSON(url) {
        if (this.jsonCache.has(url))
            return this.jsonCache.get(url);
        const loadPromise = fetch(url).then((res) => {
            if (!res.ok)
                throw new Error(`[AssetManager] Fehler beim JSON-Laden: ${url}`);
            return res.json();
        });
        this.jsonCache.set(url, loadPromise);
        return loadPromise;
    }
    /**
     * Lädt reinen Text (z.B. für externe Shader-Dateien).
     */
    static async loadText(url) {
        if (this.textCache.has(url))
            return this.textCache.get(url);
        const loadPromise = fetch(url).then((res) => {
            if (!res.ok)
                throw new Error(`[AssetManager] Fehler beim Text-Laden: ${url}`);
            return res.text();
        });
        this.textCache.set(url, loadPromise);
        return loadPromise;
    }
}
//# sourceMappingURL=AssetManager.js.map