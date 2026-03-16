/// src/loaders/AssetManager.ts

export type ProgressCallback = (loaded: number, total: number) => void;

export class AssetManager {
  private static imageCache = new Map<string, Promise<ImageBitmap | HTMLImageElement>>();
  private static textCache = new Map<string, Promise<string>>();

  private static async fetchWithProgress(
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
        // @ts-expect-error Until we know exactly how to fix it
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
    const cacheKey = `${url}_${flipY}`;
    if (this.imageCache.has(cacheKey)) return this.imageCache.get(cacheKey)!;

    const loadPromise = this.fetchWithProgress(url, onProgress)
      .then(async (blob) => {
        if (flipY) {
          return createImageBitmap(blob, {
            colorSpaceConversion: "none",
            imageOrientation: "flipY",
          });
        } else {
          // --- FEATURE DETECTION / FALLBACK ---
          try {
            // Moderner Standard (ab Chrome 146+)
            // 'as any' verhindert TypeScript-Meldungen, falls deine TS-Version 'from-image' noch nicht kennt
            return await createImageBitmap(blob, {
              colorSpaceConversion: "none",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              imageOrientation: "from-image" as any,
            });
          } catch (e) {
            console.error(e);
            // Fallback für Safari, Firefox und ältere Chrome-Versionen
            return await createImageBitmap(blob, {
              colorSpaceConversion: "none",
              imageOrientation: "none",
            });
          }
        }
      })
      .catch((e) => {
        console.error(e);
        return new Promise<HTMLImageElement>((resolve, reject) => {
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

  public static async loadText(url: string, onProgress?: ProgressCallback): Promise<string> {
    if (this.textCache.has(url)) return this.textCache.get(url)!;

    const loadPromise = this.fetchWithProgress(url, onProgress).then((blob) => blob.text());
    this.textCache.set(url, loadPromise);
    return loadPromise;
  }
}
