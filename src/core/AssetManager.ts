export class AssetManager {
  // Caches für verschiedene Dateitypen (speichert den Promise, damit gleichzeitige Anfragen nicht doppelt laden)
  private static imageCache = new Map<string, Promise<ImageBitmap | HTMLImageElement>>();
  private static jsonCache = new Map<string, Promise<any>>();
  private static textCache = new Map<string, Promise<string>>();

  /**
   * Lädt ein Bild und decodiert es optimal für die GPU.
   */
  public static async loadImage(url: string): Promise<ImageBitmap | HTMLImageElement> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    const loadPromise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`[AssetManager] Fehler beim Laden des Bildes: ${url}`);
        return response.blob();
      })
      .then((blob) => {
        // createImageBitmap ist extrem schnell für WebGL/WebGPU
        return createImageBitmap(blob, { colorSpaceConversion: "none", imageOrientation: "flipY" });
      })
      .catch((err) => {
        console.error(err);
        // Fallback für sehr alte Browser, falls createImageBitmap fehlschlägt
        return new Promise<HTMLImageElement>((resolve, reject) => {
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
  public static async loadJSON(url: string): Promise<any> {
    if (this.jsonCache.has(url)) return this.jsonCache.get(url)!;

    const loadPromise = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`[AssetManager] Fehler beim JSON-Laden: ${url}`);
      return res.json();
    });

    this.jsonCache.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Lädt reinen Text (z.B. für externe Shader-Dateien).
   */
  public static async loadText(url: string): Promise<string> {
    if (this.textCache.has(url)) return this.textCache.get(url)!;

    const loadPromise = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`[AssetManager] Fehler beim Text-Laden: ${url}`);
      return res.text();
    });

    this.textCache.set(url, loadPromise);
    return loadPromise;
  }

  // (Audio und Video können wir hier später nach genau demselben Muster einbauen)
}
