export interface SpriteFontVariant {
  map: Map<string, HTMLCanvasElement>;
  hex: string;
}

/**
 * Rasterizes each character in `chars` from a horizontal sprite-atlas image (one
 * `charWidth`x`charHeight` cell per character, left to right) into a small per-character
 * canvas -- colored foreground plus a 1px black drop shadow -- once per `variants` color,
 * storing the result into that variant's own map. Resolves once the atlas has loaded and
 * every character has been rasterized into every variant.
 */
export function generateSpriteFontChars(
  atlasUrl: string,
  chars: string[],
  charWidth: number,
  charHeight: number,
  variants: SpriteFontVariant[],
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = atlasUrl;
    img.onload = (): void => {
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        if (!char || char === " ") continue;

        for (const variant of variants) {
          const canvas = document.createElement("canvas");
          canvas.width = charWidth + 1;
          canvas.height = charHeight + 1;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          const fgCanvas = document.createElement("canvas");
          fgCanvas.width = charWidth;
          fgCanvas.height = charHeight;
          const fgCtx = fgCanvas.getContext("2d");
          if (!fgCtx) continue;
          fgCtx.drawImage(
            img,
            i * charWidth,
            0,
            charWidth,
            charHeight,
            0,
            0,
            charWidth,
            charHeight,
          );
          fgCtx.globalCompositeOperation = "source-in";
          fgCtx.fillStyle = variant.hex;
          fgCtx.fillRect(0, 0, charWidth, charHeight);

          const shCanvas = document.createElement("canvas");
          shCanvas.width = charWidth;
          shCanvas.height = charHeight;
          const shCtx = shCanvas.getContext("2d");
          if (!shCtx) continue;
          shCtx.drawImage(
            img,
            i * charWidth,
            0,
            charWidth,
            charHeight,
            0,
            0,
            charWidth,
            charHeight,
          );
          shCtx.globalCompositeOperation = "source-in";
          shCtx.fillStyle = "#000000";
          shCtx.fillRect(0, 0, charWidth, charHeight);

          ctx.drawImage(shCanvas, 1, 1);
          ctx.drawImage(fgCanvas, 0, 0);

          variant.map.set(char, canvas);
        }
      }
      resolve();
    };
  });
}

export interface FaceSliceOptions {
  atlasUrl: string;
  /** How many faces are stacked vertically in the atlas. */
  faceCount: number;
  /** Height, in atlas pixels, of a single face once its top edge is found. */
  faceHeight: number;
  /** Hard cap on a face's cropped width, to avoid bleeding into the neighboring face. */
  maxFaceWidth: number;
  outputWidth: number;
  outputHeight: number;
  /** Fraction of the atlas width to scan for opaque pixels. Defaults to 1/8. */
  scanWidthFraction?: number;
  /** Luminance above which an near-white background pixel is matted to transparent. Defaults to 240. */
  whiteThreshold?: number;
}

/**
 * Slices a vertically-stacked sprite sheet of faces -- with irregular padding between rows
 * and a near-white background matte -- into `faceCount` individually cropped and downscaled
 * canvases, by matting out the background then alpha-scanning each face's bounding box.
 */
export function sliceFaceSprites(options: FaceSliceOptions): Promise<HTMLCanvasElement[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = options.atlasUrl;
    img.onload = (): void => {
      const faces: HTMLCanvasElement[] = [];
      const offCanvas = document.createElement("canvas");
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(faces);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;
      const whiteThreshold = options.whiteThreshold ?? 240;
      for (let i = 0; i < data.length; i += 4) {
        if (
          data[i]! > whiteThreshold &&
          data[i + 1]! > whiteThreshold &&
          data[i + 2]! > whiteThreshold
        ) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      const scanWidth = Math.floor(offCanvas.width * (options.scanWidthFraction ?? 1 / 8));
      let currentY = 0;

      for (let r = 0; r < options.faceCount; r++) {
        let minY = offCanvas.height;
        let foundTop = false;

        for (let y = currentY; y < offCanvas.height; y++) {
          for (let x = 0; x < scanWidth; x++) {
            const alpha = data[(y * offCanvas.width + x) * 4 + 3];
            if (alpha! > 0) {
              minY = y;
              foundTop = true;
              break;
            }
          }
          if (foundTop) break;
        }

        if (!foundTop) {
          console.warn(`[SpriteAtlas] Could not find face pixels in row ${r}`);
          continue;
        }

        let minX = scanWidth;
        let maxX = 0;
        const faceScanH = Math.min(options.faceHeight, offCanvas.height - minY);

        for (let y = minY; y < minY + faceScanH; y++) {
          for (let x = 0; x < scanWidth; x++) {
            const alpha = data[(y * offCanvas.width + x) * 4 + 3];
            if (alpha! > 0) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
        }

        let faceW = maxX - minX + 1;
        if (faceW > options.maxFaceWidth) faceW = options.maxFaceWidth;
        const faceH = options.faceHeight;

        const faceCanvas = document.createElement("canvas");
        faceCanvas.width = faceW;
        faceCanvas.height = faceH;
        const faceCtx = faceCanvas.getContext("2d");
        if (faceCtx) {
          faceCtx.drawImage(offCanvas, minX, minY, faceW, faceH, 0, 0, faceW, faceH);

          const scaledCanvas = document.createElement("canvas");
          scaledCanvas.width = options.outputWidth;
          scaledCanvas.height = options.outputHeight;
          const scaledCtx = scaledCanvas.getContext("2d");
          if (scaledCtx) {
            scaledCtx.imageSmoothingEnabled = false;
            scaledCtx.drawImage(
              faceCanvas,
              0,
              0,
              faceW,
              faceH,
              0,
              0,
              options.outputWidth,
              options.outputHeight,
            );
            faces.push(scaledCanvas);
          }
        }

        currentY = minY + faceH;
      }

      resolve(faces);
    };
    img.onerror = (): void => reject(new Error(`Failed to load face atlas: ${options.atlasUrl}`));
  });
}
