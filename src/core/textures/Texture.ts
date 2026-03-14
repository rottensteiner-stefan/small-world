/// src/core/textures/Texture.ts
import { TextureFilter } from "../../enums/TextureFilter.js";
import { TextureWrap } from "../../enums/TextureWrap.js";

export class Texture {
  public image: HTMLImageElement | ImageBitmap | null = null;
  public isLoaded: boolean = false;

  public magFilter: TextureFilter = TextureFilter.LINEAR;
  public minFilter: TextureFilter = TextureFilter.LINEAR;
  public addressModeU: TextureWrap = TextureWrap.REPEAT;
  public addressModeV: TextureWrap = TextureWrap.REPEAT;

  public offset = { x: 0, y: 0 };
  public repeat = { x: 1, y: 1 };

  /**
   * Privater Konstruktor zwingt zur Nutzung der statischen Factory-Methoden,
   * was den Code für den Nutzer der Engine viel eindeutiger macht.
   */
  protected constructor(image?: HTMLImageElement | ImageBitmap) {
    if (image) {
      this.image = image;
      this.isLoaded = true;
    }
  }

  // --- STATISCHE FACTORY METHODEN ---

  /**
   * Erstellt eine Textur aus einem bereits im RAM existierenden Bild oder Bitmap.
   * Perfekt für prozedural generierte Texturen!
   */
  public static fromImage(image: HTMLImageElement | ImageBitmap): Texture {
    return new Texture(image);
  }

  /**
   * Erstellt eine leere Textur (z.B. als Platzhalter, bis echte Daten reinkommen).
   */
  public static empty(): Texture {
    return new Texture();
  }

  /**
   * Lädt ein Bild direkt von einer URL und gibt die fertige Textur zurück.
   * Macht externe TextureLoader überflüssig!
   */
  public static async fromUrl(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Wichtig, falls du Bilder von anderen Domains lädst

      img.onload = () => {
        resolve(new Texture(img));
      };

      img.onerror = () => {
        console.warn(`TextureLoader: Konnte Bild nicht laden: ${url}`);
        reject(new Error(`Fehler beim Laden der Textur: ${url}`));
      };

      img.src = url;
    });
  }
}
