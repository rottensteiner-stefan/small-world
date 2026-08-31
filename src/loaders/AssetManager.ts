export type ProgressCallback = (loaded: number, total: number) => void;

/**
 * Interface for tracking the progress of an individual asset.
 */
interface AssetProgress {
  loaded: number;
  total: number;
}

/**
 * Per-instance manager for loading and caching assets (images, text, etc.). Construct one per
 * engine instance (see `RendererContext.assetManager`) so its cache can be released with the
 * engine instead of living for the process's lifetime.
 */
export class AssetManager {
  private static _default: AssetManager | undefined;

  private _imageCache = new Map<string, Promise<ImageBitmap | HTMLImageElement>>();
  private _textCache = new Map<string, Promise<string>>();
  private _jsonCache = new Map<string, Promise<unknown>>();
  private _binaryCache = new Map<string, Promise<ArrayBuffer>>();

  private _activeLoaders = new Map<string, AssetProgress>();
  private _onLoadedPromise: Promise<void> | undefined = undefined;
  private _resolveLoaded: (() => void) | undefined = undefined;

  private _baseUrl: string = "";
  private _headers: Record<string, string> = {};

  /**
   * Sets a base URL that will be prepended to all relative asset paths.
   * @param url The base URL (e.g. "https://cdn.example.com/assets/").
   */
  public setBaseUrl(url: string): void {
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
  public setHeader(key: string, value: string): void {
    this._headers[key] = value;
  }

  /**
   * Returns a promise that resolves when all currently active loading processes are finished.
   */
  public async onLoaded(): Promise<void> {
    if (0 === this._activeLoaders.size) {
      return Promise.resolve();
    }
    if (!this._onLoadedPromise) {
      this._onLoadedPromise = new Promise<void>((resolve) => {
        this._resolveLoaded = resolve;
      });
    }
    return this._onLoadedPromise;
  }

  /**
   * Checks if all assets are currently loaded.
   */
  public get isLoaded(): boolean {
    return 0 === this._activeLoaders.size;
  }

  /**
   * Returns the global loading progress (0.0 to 1.0).
   */
  public getGlobalProgress(): number {
    if (0 === this._activeLoaders.size) return 1.0;

    let loaded = 0;
    let total = 0;

    for (const progress of this._activeLoaders.values()) {
      loaded += progress.loaded;
      total += progress.total;
    }

    return 0 < total ? loaded / total : 0;
  }

  /**
   * @param trackingKey Key under which this request's progress is tracked in `_activeLoaders`.
   *   Callers that cache by something other than the raw `url` (e.g. `loadImage`'s
   *   `${url}_${flipY}`) must pass that same key here -- otherwise two concurrent, distinctly
   *   cached requests for the same `url` (different flipY, or an image vs. a binary load of the
   *   same asset) would collide on one `_activeLoaders` entry: they'd overwrite each other's
   *   progress, and whichever finishes first would delete the entry via `_checkCompletion` while
   *   the other is still in flight, making `onLoaded()`/`isLoaded` report done too early.
   */
  private async _fetchWithProgress(
    url: string,
    trackingKey: string,
    onProgress?: ProgressCallback,
  ): Promise<Blob> {
    const isAbsolute =
      url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
    let finalUrl = url;

    if (!isAbsolute && this._baseUrl) {
      finalUrl = this._baseUrl + (url.startsWith("/") ? url.substring(1) : url);
    }

    const response: Response = await fetch(finalUrl, {
      headers: this._headers,
    });

    if (!response.ok) {
      throw new Error(`[AssetManager] HTTP error: ${response.status} at ${finalUrl}`);
    }

    const contentLength: string | undefined = response.headers.get("content-length") ?? undefined;
    const total: number = contentLength ? parseInt(contentLength, 10) : 0;

    this._activeLoaders.set(trackingKey, { loaded: 0, total });

    const updateProgress = (loaded: number, total: number): void => {
      this._activeLoaders.set(trackingKey, { loaded, total });
      if (onProgress) onProgress(loaded, total);
    };

    if (!response.body) {
      const blob = await response.blob();
      updateProgress(blob.size, blob.size);
      this._checkCompletion(trackingKey);
      return blob;
    }

    const reader = response.body.getReader();
    let loaded: number = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        loaded += value.length;
        chunks.push(value);
        updateProgress(loaded, total);
      }
    }

    this._checkCompletion(trackingKey);
    return new Blob(chunks as BlobPart[]);
  }

  private _checkCompletion(url: string): void {
    this._activeLoaders.delete(url);
    if (0 === this._activeLoaders.size && this._resolveLoaded) {
      this._resolveLoaded();
      this._onLoadedPromise = undefined;
      this._resolveLoaded = undefined;
    }
  }

  public async loadImage(
    url: string,
    onProgress?: ProgressCallback,
    flipY: boolean = false,
  ): Promise<ImageBitmap | HTMLImageElement> {
    const cacheKey: string = `${url}_${flipY}`;
    if (this._imageCache.has(cacheKey)) return this._imageCache.get(cacheKey)!;

    const loadPromise: Promise<ImageBitmap | HTMLImageElement> = this._fetchWithProgress(
      url,
      cacheKey,
      onProgress,
    )
      .then(async (blob: Blob): Promise<ImageBitmap> => {
        if (flipY) {
          return createImageBitmap(blob, {
            colorSpaceConversion: "none",
            imageOrientation: "flipY",
          });
        } else {
          try {
            return await createImageBitmap(blob, {
              colorSpaceConversion: "none",
              imageOrientation: "from-image" as ImageOrientation,
            });
          } catch {
            return await createImageBitmap(blob, {
              colorSpaceConversion: "none",
              imageOrientation: "none",
            });
          }
        }
      })
      .catch((e: unknown): Promise<HTMLImageElement> => {
        this._checkCompletion(cacheKey);
        console.error(e);
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img: HTMLImageElement = new Image();
          img.crossOrigin = "anonymous";
          img.src = url;
          img.onload = (): void => resolve(img);
          img.onerror = (): void => reject(`[AssetManager] Fallback failed: ${url}`);
        });
      });

    this._imageCache.set(cacheKey, loadPromise);
    return loadPromise;
  }

  public async loadText(url: string, onProgress?: ProgressCallback): Promise<string> {
    if (this._textCache.has(url)) return this._textCache.get(url)!;
    const trackingKey = `text:${url}`;
    const loadPromise = this._fetchWithProgress(url, trackingKey, onProgress)
      .then((blob: Blob) => blob.text())
      .catch((e: unknown) => {
        this._checkCompletion(trackingKey);
        throw e;
      });
    this._textCache.set(url, loadPromise);
    return loadPromise;
  }

  public async loadJson(url: string, onProgress?: ProgressCallback): Promise<unknown> {
    if (this._jsonCache.has(url)) return this._jsonCache.get(url)!;
    const trackingKey = `json:${url}`;
    const loadPromise = this._fetchWithProgress(url, trackingKey, onProgress)
      .then((blob: Blob) => blob.text())
      .then((text: string) => JSON.parse(text))
      .catch((e: unknown) => {
        this._checkCompletion(trackingKey);
        throw e;
      });
    this._jsonCache.set(url, loadPromise);
    return loadPromise;
  }

  public async loadBinary(url: string, onProgress?: ProgressCallback): Promise<ArrayBuffer> {
    if (this._binaryCache.has(url)) return this._binaryCache.get(url)!;
    const trackingKey = `binary:${url}`;
    const loadPromise = this._fetchWithProgress(url, trackingKey, onProgress)
      .then((blob: Blob) => blob.arrayBuffer())
      .catch((e: unknown) => {
        this._checkCompletion(trackingKey);
        throw e;
      });
    this._binaryCache.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Streams a binary resource chunk-by-chunk directly with chunk notifications
   * and builds a contiguous ArrayBuffer (DirectStorage Web streaming).
   * @param url The resource URL.
   * @param onChunk Optional callback invoked when each chunk is received.
   * @param onProgress Optional progress callback.
   */
  public async streamBinary(
    url: string,
    onChunk?: (chunk: Uint8Array, loaded: number, total: number) => void,
    onProgress?: ProgressCallback,
  ): Promise<ArrayBuffer> {
    if (this._binaryCache.has(url)) return this._binaryCache.get(url)!;

    const isAbsolute =
      url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
    let finalUrl = url;

    if (!isAbsolute && this._baseUrl) {
      finalUrl = this._baseUrl + (url.startsWith("/") ? url.substring(1) : url);
    }

    const response = await fetch(finalUrl, { headers: this._headers });
    if (!response.ok) {
      throw new Error(`[AssetManager] Stream error: ${response.status} at ${finalUrl}`);
    }

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // Namespaced separately from loadBinary's "binary:" key -- both cache into _binaryCache and
    // could plausibly be called concurrently for the same url, and sharing a tracking key would
    // reintroduce the premature-completion race _fetchWithProgress's trackingKey param avoids.
    const trackingKey = `stream:${url}`;
    this._activeLoaders.set(trackingKey, { loaded: 0, total });

    if (!response.body) {
      const buf = await response.arrayBuffer();
      if (onChunk) onChunk(new Uint8Array(buf), buf.byteLength, total || buf.byteLength);
      if (onProgress) onProgress(buf.byteLength, total || buf.byteLength);
      this._checkCompletion(trackingKey);
      return buf;
    }

    const reader = response.body.getReader();
    let loaded = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        loaded += value.length;
        chunks.push(value);
        this._activeLoaders.set(trackingKey, { loaded, total });
        if (onChunk) onChunk(value, loaded, total);
        if (onProgress) onProgress(loaded, total);
      }
    }

    this._checkCompletion(trackingKey);

    // Merge chunks into a single contiguous ArrayBuffer
    const finalBuffer = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      finalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const arrayBuf = finalBuffer.buffer;
    this._binaryCache.set(url, Promise.resolve(arrayBuf));
    return arrayBuf;
  }

  private static get _sharedDefault(): AssetManager {
    return (this._default ??= new AssetManager());
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static setBaseUrl(url: string): void {
    this._sharedDefault.setBaseUrl(url);
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static setHeader(key: string, value: string): void {
    this._sharedDefault.setHeader(key, value);
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static async onLoaded(): Promise<void> {
    return this._sharedDefault.onLoaded();
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static get isLoaded(): boolean {
    return this._sharedDefault.isLoaded;
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static getGlobalProgress(): number {
    return this._sharedDefault.getGlobalProgress();
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static async loadImage(
    url: string,
    onProgress?: ProgressCallback,
    flipY: boolean = false,
  ): Promise<ImageBitmap | HTMLImageElement> {
    return this._sharedDefault.loadImage(url, onProgress, flipY);
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static async loadText(url: string, onProgress?: ProgressCallback): Promise<string> {
    return this._sharedDefault.loadText(url, onProgress);
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static async loadJson(url: string, onProgress?: ProgressCallback): Promise<unknown> {
    return this._sharedDefault.loadJson(url, onProgress);
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static async loadBinary(url: string, onProgress?: ProgressCallback): Promise<ArrayBuffer> {
    return this._sharedDefault.loadBinary(url, onProgress);
  }

  /** @deprecated Use an instance via `RendererContext.assetManager` instead. Removal target: v1.0.0. */
  public static async streamBinary(
    url: string,
    onChunk?: (chunk: Uint8Array, loaded: number, total: number) => void,
    onProgress?: ProgressCallback,
  ): Promise<ArrayBuffer> {
    return this._sharedDefault.streamBinary(url, onChunk, onProgress);
  }
}
