/// src/utils/HeightmapGenerator.ts

export class HeightmapGenerator {
  /**
   * Generiert eine Heightmap mit dem Diamond-Square-Algorithmus.
   * @param detail Bestimmt die Größe (Größe = 2^detail + 1). z.B. detail 8 = 257x257 Pixel.
   * @param roughness Wie zerklüftet ist das Terrain? (0.0 = flach, 1.0 = extremes Chaos, ~0.6 ist gut für Hügel)
   * @returns Ein ImageBitmap, das direkt in die Terrain-Geometrie gepumpt werden kann.
   */
  public static async generateDiamondSquare(
    detail: number = 8,
    roughness: number = 0.6,
  ): Promise<ImageBitmap> {
    const size = Math.pow(2, detail) + 1;
    const max = size - 1;
    const map = new Float32Array(size * size);

    // Hilfsfunktionen für das 1D-Array
    const set = (x: number, y: number, val: number) => {
      map[y * size + x] = val;
    };
    const get = (x: number, y: number) => {
      if (x < 0 || x >= size || y < 0 || y >= size) return -1;
      return map[y * size + x];
    };

    // 1. Ecken initialisieren (Wir starten auf halber Höhe)
    set(0, 0, 0.5);
    set(max, 0, 0.5);
    set(0, max, 0.5);
    set(max, max, 0.5);

    let stepSize = max;
    let randomScale = 1.0;

    // 2. Der Diamond-Square Loop
    while (stepSize > 1) {
      const halfStep = stepSize / 2;

      // Diamond Step
      for (let y = 0; y < max; y += stepSize) {
        for (let x = 0; x < max; x += stepSize) {
          const a = get(x, y);
          const b = get(x + stepSize, y);
          const c = get(x, y + stepSize);
          const d = get(x + stepSize, y + stepSize);
          const avg = (a + b + c + d) / 4.0;
          const offset = (Math.random() - 0.5) * randomScale;
          set(x + halfStep, y + halfStep, avg + offset);
        }
      }

      // Square Step
      for (let y = 0; y <= max; y += halfStep) {
        for (let x = y % stepSize === 0 ? halfStep : 0; x <= max; x += stepSize) {
          let sum = 0;
          let count = 0;

          const vals = [
            get(x, y - halfStep), // Top
            get(x, y + halfStep), // Bottom
            get(x - halfStep, y), // Left
            get(x + halfStep, y), // Right
          ];

          for (const v of vals) {
            if (v !== -1) {
              sum += v;
              count++;
            }
          }

          const avg = sum / count;
          const offset = (Math.random() - 0.5) * randomScale;
          set(x, y, avg + offset);
        }
      }

      // Zufälligkeit pro Durchlauf verringern (sorgt für weiche Hügel)
      randomScale *= roughness;
      stepSize = halfStep;
    }

    // 3. Normalisieren (Werte strikt zwischen 0.0 und 1.0 klemmen)
    let minVal = Infinity,
      maxVal = -Infinity;
    for (let i = 0; i < map.length; i++) {
      if (map[i] < minVal) minVal = map[i];
      if (map[i] > maxVal) maxVal = map[i];
    }
    for (let i = 0; i < map.length; i++) {
      map[i] = (map[i] - minVal) / (maxVal - minVal);
    }

    // 4. In ein Canvas zeichnen und als ImageBitmap exportieren
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(size, size);

    for (let i = 0; i < map.length; i++) {
      // Wir wandeln unseren 0.0-1.0 Wert in einen Graustufen-Pixel (0-255) um
      const color = Math.floor(map[i] * 255);
      const index = i * 4;
      imgData.data[index] = color; // R
      imgData.data[index + 1] = color; // G
      imgData.data[index + 2] = color; // B
      imgData.data[index + 3] = 255; // Alpha
    }

    ctx.putImageData(imgData, 0, 0);
    return await createImageBitmap(canvas);
  }
}
