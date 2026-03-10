import { CubeTexture } from "./textures/CubeTexture";

export class SkyboxLoader {
  /**
   * Lädt ein einzelnes Bild im "Horizontal Cross" Format und zerlegt es in 6 CubeMap-Seiten.
   * Layout-Erwartung:
   * [+y]
   * [-x] [+z] [+x] [-z]
   * [-y]
   */
  public static async loadFromCross(url: string): Promise<CubeTexture> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`[SkyboxLoader] Bild nicht gefunden: ${url}`);

    const blob = await response.blob();
    // Wir laden das Bild OHNE Y-Flip, damit wir es sauber auf dem Canvas zerschneiden können.
    const sourceImage = await createImageBitmap(blob, { colorSpaceConversion: "none" });

    // Bei einem 4x3 Kreuz ist eine Kachel genau 1/4 der Gesamtbreite groß.
    const tileSize = sourceImage.width / 4;

    const canvas = document.createElement("canvas");
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    // WebGL / WebGPU verlangen die Bilder exakt in dieser Reihenfolge:
    // 0: +x (Rechts), 1: -x (Links), 2: +y (Oben), 3: -y (Unten), 4: +z (Vorne), 5: -z (Hinten)
    const faces = [
      { col: 2, row: 1 }, // 0: +x
      { col: 0, row: 1 }, // 1: -x
      { col: 1, row: 0 }, // 2: +y
      { col: 1, row: 2 }, // 3: -y
      { col: 1, row: 1 }, // 4: +z
      { col: 3, row: 1 }, // 5: -z
    ];

    const images: ImageBitmap[] = [];

    for (const face of faces) {
      ctx.clearRect(0, 0, tileSize, tileSize);

      // ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      ctx.drawImage(
        sourceImage,
        face.col * tileSize,
        face.row * tileSize,
        tileSize,
        tileSize,
        0,
        0,
        tileSize,
        tileSize,
      );

      // Aus dem Canvas-Ausschnitt direkt ein optimales Bitmap für die GPU gießen
      const faceBitmap = await createImageBitmap(canvas);
      images.push(faceBitmap);
    }

    // Leere CubeTexture erstellen und unsere zerschnittenen Bilder hineinschmuggeln
    const cubeTexture = new CubeTexture();
    cubeTexture.images = images;
    cubeTexture.isLoaded = true;

    return cubeTexture;
  }
}
