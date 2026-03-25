/// src/loaders/AssetManager.ts

export type ProgressCallback = (loaded: number, total: number) => void;

export class AssetManager {
  private static _imageCache = new Map<string, Promise<ImageBitmap | HTMLImageElement>>();
  private static _textCache = new Map<string, Promise<string>>();

  private static async _fetchWithProgress(
    url: string,
    onProgress?: ProgressCallback,
  ): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`[AssetManager] HTTP Fehler: ${response.status} bei ${url}`);

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!onProgress || !response.body) {
      return response.blob();
    }

    const reader = response.body.getReader();
    let loaded = 0;
    const chunks: BlobPart[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        loaded += value.length;
        chunks.push(value as Uint8Array);
        onProgress(loaded, total);
      }
    }

    return new Blob(chunks);
  }

  public static async loadImage(
    url: string,
    onProgress?: ProgressCallback,
    flipY: boolean = true,
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
          } catch (e: unknown) {
            console.error(e);
            // Fallback für Safari, Firefox und ältere Chrome-Versionen
            return await createImageBitmap(blob, {
              colorSpaceConversion: "none",
              imageOrientation: "none",
            });
          }
        }
      })
      .catch((e: unknown): Promise<HTMLImageElement> => {
        console.error(e);
        return new Promise<HTMLImageElement>(
          (resolve: (value: HTMLImageElement) => void, reject: (reason: string) => void): void => {
            const img: HTMLImageElement = new Image();
            img.crossOrigin = "anonymous";
            img.onload = (): void => resolve(img);
            img.onerror = (): void => reject(`[AssetManager] Fallback fehlgeschlagen: ${url}`);
            img.src = url;
          },
        );
      });

    this._imageCache.set(cacheKey, loadPromise);
    return loadPromise;
  }

  public static async loadText(url: string, onProgress?: ProgressCallback): Promise<string> {
    if (this._textCache.has(url)) return this._textCache.get(url)!;

    const loadPromise: Promise<string> = this._fetchWithProgress(url, onProgress).then(
      (blob: Blob): Promise<string> => blob.text(),
    );
    this._textCache.set(url, loadPromise);
    return loadPromise;
  }
}
