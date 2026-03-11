export type ProgressCallback = (loaded: number, total: number) => void;

export class AssetManager {
  private static imageCache = new Map<string, Promise<ImageBitmap | HTMLImageElement>>();
  private static textCache = new Map<string, Promise<string>>();

  /**
   * Zentrale Methode, um Dateien mit Fortschrittsanzeige herunterzuladen.
   */
  private static async fetchWithProgress(
    url: string,
    onProgress?: ProgressCallback,
  ): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`[AssetManager] HTTP Fehler: ${response.status} bei ${url}`);

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // Wenn kein Fortschritt benötigt wird oder kein Body vorhanden ist, direkt als Blob zurückgeben
    if (!onProgress || !response.body) {
      return response.blob();
    }

    const reader = response.body.getReader();
    let loaded = 0;

    // FIX: Wir deklarieren das Array explizit als Array von BlobParts
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
    flipY: boolean = true, // <--- NEU: Optionaler Parameter (Standard ist true)
  ): Promise<ImageBitmap | HTMLImageElement> {
    // Cache-Key anpassen, damit wir beide Varianten sicher speichern können
    const cacheKey = `${url}_${flipY}`;
    if (this.imageCache.has(cacheKey)) return this.imageCache.get(cacheKey)!;

    const loadPromise = this.fetchWithProgress(url, onProgress)
      .then((blob) =>
        createImageBitmap(blob, {
          colorSpaceConversion: "none",
          imageOrientation: flipY ? "flipY" : "none", // <--- Hier wenden wir ihn an
        }),
      )
      .catch((err) => {
        console.error(err);
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
