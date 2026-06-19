/// src/loaders/AssetManager.ts
/**
 * Centralized manager for loading and caching assets (images, text, etc.).
 * Provides global progress tracking and loading state.
 */
export class AssetManager {
    static _imageCache = new Map();
    static _textCache = new Map();
    static _jsonCache = new Map();
    static _binaryCache = new Map();
    static _activeLoaders = new Map();
    static _onLoadedPromise = undefined;
    static _resolveLoaded = undefined;
    static _baseUrl = "";
    static _headers = {};
    /**
     * Sets a base URL that will be prepended to all relative asset paths.
     * @param url The base URL (e.g. "https://cdn.example.com/assets/").
     */
    static setBaseUrl(url) {
        this._baseUrl = url;
        if (this._baseUrl && !this._baseUrl.endsWith("/")) {
            this._baseUrl += "/";
        }
    }
    /**
     * Sets a custom header to be sent with every asset request.
     * @param key The header name (e.g. "Authorization").
     * @param value The header value.
     */
    static setHeader(key, value) {
        this._headers[key] = value;
    }
    /**
     * Returns a promise that resolves when all currently active loading processes are finished.
     */
    static async onLoaded() {
        if (0 === this._activeLoaders.size) {
            return Promise.resolve();
        }
        if (!this._onLoadedPromise) {
            this._onLoadedPromise = new Promise((resolve) => {
                this._resolveLoaded = resolve;
            });
        }
        return this._onLoadedPromise;
    }
    /**
     * Checks if all assets are currently loaded.
     */
    static get isLoaded() {
        return 0 === this._activeLoaders.size;
    }
    /**
     * Returns the global loading progress (0.0 to 1.0).
     */
    static getGlobalProgress() {
        if (0 === this._activeLoaders.size)
            return 1.0;
        let loaded = 0;
        let total = 0;
        for (const progress of this._activeLoaders.values()) {
            loaded += progress.loaded;
            total += progress.total;
        }
        return 0 < total ? loaded / total : 0;
    }
    static async _fetchWithProgress(url, onProgress) {
        const isAbsolute = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
        let finalUrl = url;
        if (!isAbsolute && this._baseUrl) {
            finalUrl = this._baseUrl + (url.startsWith("/") ? url.substring(1) : url);
        }
        const response = await fetch(finalUrl, {
            headers: this._headers,
        });
        if (!response.ok) {
            throw new Error(`[AssetManager] HTTP error: ${response.status} at ${finalUrl}`);
        }
        const contentLength = response.headers.get("content-length") ?? undefined;
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        this._activeLoaders.set(url, { loaded: 0, total });
        const updateProgress = (loaded, total) => {
            this._activeLoaders.set(url, { loaded, total });
            if (onProgress)
                onProgress(loaded, total);
        };
        if (!response.body) {
            const blob = await response.blob();
            updateProgress(blob.size, blob.size);
            this._checkCompletion(url);
            return blob;
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
                chunks.push(value);
                updateProgress(loaded, total);
            }
        }
        this._checkCompletion(url);
        return new Blob(chunks);
    }
    static _checkCompletion(url) {
        this._activeLoaders.delete(url);
        if (0 === this._activeLoaders.size && this._resolveLoaded) {
            this._resolveLoaded();
            this._onLoadedPromise = undefined;
            this._resolveLoaded = undefined;
        }
    }
    static async loadImage(url, onProgress, flipY = false) {
        const cacheKey = `${url}_${flipY}`;
        if (this._imageCache.has(cacheKey))
            return this._imageCache.get(cacheKey);
        const loadPromise = this._fetchWithProgress(url, onProgress)
            .then(async (blob) => {
            if (flipY) {
                return createImageBitmap(blob, {
                    colorSpaceConversion: "none",
                    imageOrientation: "flipY",
                });
            }
            else {
                try {
                    return await createImageBitmap(blob, {
                        colorSpaceConversion: "none",
                        imageOrientation: "from-image",
                    });
                }
                catch {
                    return await createImageBitmap(blob, {
                        colorSpaceConversion: "none",
                        imageOrientation: "none",
                    });
                }
            }
        })
            .catch((e) => {
            this._checkCompletion(url);
            console.error(e);
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = url;
                img.onload = () => resolve(img);
                img.onerror = () => reject(`[AssetManager] Fallback fehlgeschlagen: ${url}`);
            });
        });
        this._imageCache.set(cacheKey, loadPromise);
        return loadPromise;
    }
    static async loadText(url, onProgress) {
        if (this._textCache.has(url))
            return this._textCache.get(url);
        const loadPromise = this._fetchWithProgress(url, onProgress)
            .then((blob) => blob.text())
            .catch((e) => {
            this._checkCompletion(url);
            throw e;
        });
        this._textCache.set(url, loadPromise);
        return loadPromise;
    }
    static async loadJson(url, onProgress) {
        if (this._jsonCache.has(url))
            return this._jsonCache.get(url);
        const loadPromise = this._fetchWithProgress(url, onProgress)
            .then((blob) => blob.text())
            .then((text) => JSON.parse(text))
            .catch((e) => {
            this._checkCompletion(url);
            throw e;
        });
        this._jsonCache.set(url, loadPromise);
        return loadPromise;
    }
    static async loadBinary(url, onProgress) {
        if (this._binaryCache.has(url))
            return this._binaryCache.get(url);
        const loadPromise = this._fetchWithProgress(url, onProgress)
            .then((blob) => blob.arrayBuffer())
            .catch((e) => {
            this._checkCompletion(url);
            throw e;
        });
        this._binaryCache.set(url, loadPromise);
        return loadPromise;
    }
}
//# sourceMappingURL=AssetManager.js.map