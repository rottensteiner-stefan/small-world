/// src/loaders/AssetManager.ts

export type ProgressCallback = (loaded: number, total: number) => void;

/**
 * Interface for tracking the progress of an individual asset.
 */
interface AssetProgress {
  loaded: number;
  total: number;
}

/**
 * Centralized manager for loading and caching assets (images, text, etc.).
 * Provides global progress tracking and loading state.
 */
export class AssetManager {
  private static _imageCache = new Map<string, Promise<ImageBitmap | HTMLImageElement>>();
  private static _textCache = new Map<string, Promise<string>>();

  private static _activeLoaders = new Map<string, AssetProgress>();
  private static _onLoadedPromise: Promise<void> | undefined = undefined;
  private static _resolveLoaded: (() => void) | undefined = undefined;

  private static _baseUrl: string = "";
  private static _headers: Record<string, string> = {};

  /**
   * Sets a base URL that will be prepended to all relative asset paths.
   * @param url The base URL (e.g. "https://cdn.example.com/assets/").
   */
  public static setBaseUrl(url: string): void {
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
  public static setHeader(key: string, value: string): void {
    this._headers[key] = value;
  }

  /**
   * Returns a promise that resolves when all currently active loading processes are finished.
   */
  public static async onLoaded(): Promise<void> {
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
  public static get isLoaded(): boolean {
    return 0 === this._activeLoaders.size;
  }

  /**
   * Returns the global loading progress (0.0 to 1.0).
   */
  public static getGlobalProgress(): number {
    if (0 === this._activeLoaders.size) return 1.0;

    let loaded = 0;
    let total = 0;

    for (const progress of this._activeLoaders.values()) {
      loaded += progress.loaded;
      total += progress.total;
    }

    return 0 < total ? loaded / total : 0;
  }

  private static async _fetchWithProgress(
    url: string,
    onProgress?: ProgressCallback,
  ): Promise<Blob> {
    // Resolve URL: Prepend baseUrl if url is relative and baseUrl is set
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

    // Register this loader for global tracking
    this._activeLoaders.set(url, { loaded: 0, total });

    const updateProgress = (loaded: number, total: number): void => {
      this._activeLoaders.set(url, { loaded, total });
      if (onProgress) onProgress(loaded, total);
    };

    if (!response.body) {
      const blob = await response.blob();
      updateProgress(blob.size, blob.size);
      this._checkCompletion(url);
      return blob;
    }

    const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();
    let loaded: number = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        loaded += value.length;
        chunks.push(value);
        updateProgress(loaded, total);
      }
    }

    this._checkCompletion(url);
    return new Blob(chunks as BlobPart[]);
  }

  private static _checkCompletion(url: string): void {
    this._activeLoaders.delete(url);
    if (0 === this._activeLoaders.size && this._resolveLoaded) {
      this._resolveLoaded();
      this._onLoadedPromise = undefined;
      this._resolveLoaded = undefined;
    }
  }

  public static async loadImage(
    url: string,
    onProgress?: ProgressCallback,
    flipY: boolean = false,
  ): Promise<ImageBitmap | HTMLImageElement> {
    const cacheKey: string = `${url}_${flipY}`;
    if (this._imageCache.has(cacheKey)) return this._imageCache.get(cacheKey)!;

    const loadPromise: Promise<ImageBitmap | HTMLImageElement> = this._fetchWithProgress(
      url,
      onProgress,
    )
      .then(async (blob: Blob): Promise<ImageBitmap> => {
        if (flipY) {
          return createImageBitmap(blob, {
            colorSpaceConversion: "none",
            imageOrientation: "flipY",
          });
        } else {
          // --- FEATURE DETECTION / FALLBACK ---
          try {
            // Moderner Standard (ab Chrome 146+)
            return await createImageBitmap(blob, {
              colorSpaceConversion: "none",
              imageOrientation: "from-image" as ImageOrientation,
            });
          } catch {
            // Fallback für Safari, Firefox und ältere Chrome-Versionen
            return await createImageBitmap(blob, {
              colorSpaceConversion: "none",
              imageOrientation: "none",
            });
          }
        }
      })
      .catch((e: unknown): Promise<HTMLImageElement> => {
        // If fetch fails, we still need to cleanup global tracking
        this._checkCompletion(url);
        console.error(e);
        return new Promise<HTMLImageElement>(
          (resolve: (value: HTMLImageElement) => void, reject: (reason: string) => void): void => {
            const img: HTMLImageElement = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = (): void => resolve(img);
            img.onerror = (): void => reject(`[AssetManager] Fallback fehlgeschlagen: ${url}`);
          },
        );
      });

    this._imageCache.set(cacheKey, loadPromise);
    return loadPromise;
  }

  public static async loadText(url: string, onProgress?: ProgressCallback): Promise<string> {
    if (this._textCache.has(url)) return this._textCache.get(url)!;

    const loadPromise: Promise<string> = this._fetchWithProgress(url, onProgress)
      .then((blob: Blob): Promise<string> => blob.text())
      .catch((e: unknown) => {
        this._checkCompletion(url);
        throw e;
      });
    this._textCache.set(url, loadPromise);
    return loadPromise;
  }
}
