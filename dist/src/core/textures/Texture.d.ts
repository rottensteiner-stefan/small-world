import { TextureFilter } from '../../enums/TextureFilter.js';
import { TextureWrap } from '../../enums/TextureWrap.js';
export declare class Texture {
    image: HTMLImageElement | ImageBitmap | null;
    isLoaded: boolean;
    magFilter: TextureFilter;
    minFilter: TextureFilter;
    addressModeU: TextureWrap;
    addressModeV: TextureWrap;
    offset: {
        x: number;
        y: number;
    };
    repeat: {
        x: number;
        y: number;
    };
    /**
     * Privater Konstruktor zwingt zur Nutzung der statischen Factory-Methoden,
     * was den Code für den Nutzer der Engine viel eindeutiger macht.
     */
    protected constructor(image?: HTMLImageElement | ImageBitmap);
    /**
     * Erstellt eine Textur aus einem bereits im RAM existierenden Bild oder Bitmap.
     * Perfekt für prozedural generierte Texturen!
     */
    static fromImage(image: HTMLImageElement | ImageBitmap): Texture;
    /**
     * Erstellt eine leere Textur (z.B. als Platzhalter, bis echte Daten reinkommen).
     */
    static empty(): Texture;
    /**
     * Lädt ein Bild direkt von einer URL und gibt die fertige Textur zurück.
     * Macht externe TextureLoader überflüssig!
     */
    static fromUrl(url: string): Promise<Texture>;
}
