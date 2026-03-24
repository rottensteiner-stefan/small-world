/// src/utils/HeightmapGenerator.ts
import { Noise } from "./Noise.js";

export class HeightmapGenerator {
  /**
   * Generiert eine Heightmap mit dem Diamond-Square-Algorithmus als ImageBitmap.
   * (Für Kompatibilität mit bestehenden Demos)
   */
  public static async generateDiamondSquare(
    detail: number = 8,
    roughness: number = 0.6,
  ): Promise<ImageBitmap> {
    const floatData = await this.generateDiamondSquareFloat(detail, roughness);
    const size = Math.sqrt(floatData.length);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(size, size);

    for (let i = 0; i < floatData.length; i++) {
      const color = Math.floor(floatData[i] * 255);
      const index = i * 4;
      imgData.data[index] = color; // R
      imgData.data[index + 1] = color; // G
      imgData.data[index + 2] = color; // B
      imgData.data[index + 3] = 255; // Alpha
    }

    ctx.putImageData(imgData, 0, 0);
    return await createImageBitmap(canvas);
  }

  /**
   * Generiert eine Heightmap als Float32Array mit Diamond-Square.
   */
  public static async generateDiamondSquareFloat(
    detail: number = 8,
    roughness: number = 0.6,
    seed?: string,
  ): Promise<Float32Array> {
    const size = Math.pow(2, detail) + 1;
    const max = size - 1;
    const map = new Float32Array(size * size);

    const rng = seed ? this.mulberry32(this.cyrb128(seed)) : () => Math.random();

    const set = (x: number, y: number, val: number) => {
      map[y * size + x] = val;
    };
    const get = (x: number, y: number) => {
      if (x < 0 || x >= size || y < 0 || y >= size) return -1;
      return map[y * size + x];
    };

    set(0, 0, 0.5);
    set(max, 0, 0.5);
    set(0, max, 0.5);
    set(max, max, 0.5);

    let stepSize = max;
    let randomScale = 1.0;

    while (stepSize > 1) {
      const halfStep = stepSize / 2;

      for (let y = 0; y < max; y += stepSize) {
        for (let x = 0; x < max; x += stepSize) {
          const a = get(x, y);
          const b = get(x + stepSize, y);
          const c = get(x, y + stepSize);
          const d = get(x + stepSize, y + stepSize);
          const avg = (a + b + c + d) / 4.0;
          const offset = (rng() - 0.5) * randomScale;
          set(x + halfStep, y + halfStep, avg + offset);
        }
      }

      for (let y = 0; y <= max; y += halfStep) {
        for (let x = y % stepSize === 0 ? halfStep : 0; x <= max; x += stepSize) {
          let sum = 0;
          let count = 0;
          const vals = [
            get(x, y - halfStep),
            get(x, y + halfStep),
            get(x - halfStep, y),
            get(x + halfStep, y),
          ];
          for (const v of vals) {
            if (v !== -1) {
              sum += v;
              count++;
            }
          }
          const avg = sum / count;
          const offset = (rng() - 0.5) * randomScale;
          set(x, y, avg + offset);
        }
      }
      randomScale *= roughness;
      stepSize = halfStep;
    }

    let minVal = Infinity,
      maxVal = -Infinity;
    for (let i = 0; i < map.length; i++) {
      if (map[i] < minVal) minVal = map[i];
      if (map[i] > maxVal) maxVal = map[i];
    }
    const range = maxVal - minVal;
    if (range > 0.000001) {
      for (let i = 0; i < map.length; i++) {
        map[i] = (map[i] - minVal) / range;
      }
    } else {
      map.fill(0.5);
    }
    return map;
  }

  /**
   * Generiert eine Heightmap mit Perlin Noise.
   * Perfekt für Infinite Terrain, da nahtlos.
   * @param detail Größe = 2^detail + 1
   * @param scale Skalierung des Noise (kleiner = mehr Zoom)
   * @param offsetX Verschiebung in X (für Chunks)
   * @param offsetY Verschiebung in Y (für Chunks)
   * @param octaves Anzahl der Noise-Schichten (mehr = detaillierter)
   * @param persistence Wie stark jede Oktave beiträgt (0-1)
   */
  public static async generatePerlinFloat(
    detail: number = 8,
    scale: number = 0.02,
    offsetX: number = 0,
    offsetY: number = 0,
    octaves: number = 4,
    persistence: number = 0.5,
  ): Promise<Float32Array> {
    const size = Math.pow(2, detail) + 1;
    const map = new Float32Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let amplitude = 1;
        let frequency = 1;
        let noiseValue = 0;
        let maxValue = 0; // Zur Normalisierung

        const worldX = (x + offsetX) * scale;
        const worldY = (y + offsetY) * scale;

        for (let i = 0; i < octaves; i++) {
          noiseValue += Noise.perlin2(worldX * frequency, worldY * frequency) * amplitude;
          maxValue += amplitude;
          amplitude *= persistence;
          frequency *= 2;
        }

        // Normalisieren auf 0..1 (Noise ist -1..1)
        map[y * size + x] = (noiseValue / maxValue + 1) * 0.5;
      }
    }

    return map;
  }

  /**
   * Generiert eine Heightmap mit Simplex Noise.
   * Oft schneller und visuell ansprechender als Perlin.
   */
  public static async generateSimplexFloat(
    detail: number = 8,
    scale: number = 0.02,
    offsetX: number = 0,
    offsetY: number = 0,
    octaves: number = 4,
    persistence: number = 0.5,
  ): Promise<Float32Array> {
    const size = Math.pow(2, detail) + 1;
    const map = new Float32Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let amplitude = 1;
        let frequency = 1;
        let noiseValue = 0;
        let maxValue = 0;

        const worldX = (x + offsetX) * scale;
        const worldY = (y + offsetY) * scale;

        for (let i = 0; i < octaves; i++) {
          noiseValue += Noise.simplex2(worldX * frequency, worldY * frequency) * amplitude;
          maxValue += amplitude;
          amplitude *= persistence;
          frequency *= 2;
        }

        // Normalisieren auf 0..1
        map[y * size + x] = (noiseValue / maxValue + 1) * 0.5;
      }
    }

    return map;
  }

  private static cyrb128(str: string): number {
    let h1 = 1779033703,
      h2 = 3144134277,
      h3 = 1013904242,
      h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    return h1 >>> 0;
  }

  private static mulberry32(a: number): () => number {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
