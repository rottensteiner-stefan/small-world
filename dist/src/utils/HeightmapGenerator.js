/// src/utils/HeightmapGenerator.ts
import { Noise } from "./Noise.js";
/**
 * Utility class for heightmap generation using various algorithms.
 */
export class HeightmapGenerator {
    /**
     * Generates a heightmap using the Diamond-Square algorithm as an ImageBitmap.
     * @param detail Size = 2^detail + 1.
     * @param roughness The roughness factor.
     * @returns A promise resolving to an ImageBitmap.
     */
    static async generateDiamondSquare(detail = 8, roughness = 0.6) {
        const floatData = await this.generateDiamondSquareFloat(detail, roughness);
        const size = Math.sqrt(floatData.length);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(size, size);
        for (let i = 0; i < floatData.length; i++) {
            const color = Math.floor((floatData[i] ?? 0) * 255);
            const index = i * 4;
            imgData.data[index] = color;
            imgData.data[index + 1] = color;
            imgData.data[index + 2] = color;
            imgData.data[index + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return await createImageBitmap(canvas);
    }
    /**
     * Generates a heightmap as a Float32Array using the Diamond-Square algorithm.
     * @param detail Size = 2^detail + 1.
     * @param roughness The roughness factor.
     * @param seed Optional seed for random generation.
     * @returns A promise resolving to a Float32Array.
     */
    static async generateDiamondSquareFloat(detail = 8, roughness = 0.6, seed) {
        const size = Math.pow(2, detail) + 1;
        const max = size - 1;
        const map = new Float32Array(size * size);
        const rng = seed
            ? this._mulberry32(this._cyrb128(seed))
            : () => Math.random();
        const set = (x, y, val) => {
            map[y * size + x] = val;
        };
        const get = (x, y) => {
            if (0 > x || size <= x || 0 > y || size <= y) {
                return -1;
            }
            return map[y * size + x] ?? -1;
        };
        set(0, 0, 0.5);
        set(max, 0, 0.5);
        set(0, max, 0.5);
        set(max, max, 0.5);
        let stepSize = max;
        let randomScale = 1.0;
        while (1 < stepSize) {
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
                for (let x = 0 === y % stepSize ? halfStep : 0; x <= max; x += stepSize) {
                    let sum = 0;
                    let count = 0;
                    const vals = [
                        get(x, y - halfStep),
                        get(x, y + halfStep),
                        get(x - halfStep, y),
                        get(x + halfStep, y),
                    ];
                    for (let i = 0; i < vals.length; i++) {
                        const v = vals[i];
                        if (-1 !== v) {
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
        let minVal = Infinity;
        let maxVal = -Infinity;
        for (let i = 0; i < map.length; i++) {
            const val = map[i] ?? 0;
            if (val < minVal) {
                minVal = val;
            }
            if (val > maxVal) {
                maxVal = val;
            }
        }
        const range = maxVal - minVal;
        if (0.000001 < range) {
            for (let i = 0; i < map.length; i++) {
                map[i] = ((map[i] ?? 0) - minVal) / range;
            }
        }
        else {
            map.fill(0.5);
        }
        return map;
    }
    /**
     * Generates a heightmap using Perlin noise.
     * @param detail Size = 2^detail + 1.
     * @param scale Noise scale.
     * @param offsetX X offset.
     * @param offsetY Y offset.
     * @param octaves Number of octaves.
     * @param persistence Persistence factor.
     * @returns A promise resolving to a Float32Array.
     */
    static async generatePerlinFloat(detail = 8, scale = 0.02, offsetX = 0, offsetY = 0, octaves = 4, persistence = 0.5) {
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
                    noiseValue += Noise.perlin2(worldX * frequency, worldY * frequency) * amplitude;
                    maxValue += amplitude;
                    amplitude *= persistence;
                    frequency *= 2;
                }
                map[y * size + x] = (noiseValue / maxValue + 1) * 0.5;
            }
        }
        return map;
    }
    /**
     * Generates a heightmap using Simplex noise.
     * @param detail Size = 2^detail + 1.
     * @param scale Noise scale.
     * @param offsetX X offset.
     * @param offsetY Y offset.
     * @param octaves Number of octaves.
     * @param persistence Persistence factor.
     * @returns A promise resolving to a Float32Array.
     */
    static async generateSimplexFloat(detail = 8, scale = 0.02, offsetX = 0, offsetY = 0, octaves = 4, persistence = 0.5) {
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
                map[y * size + x] = (noiseValue / maxValue + 1) * 0.5;
            }
        }
        return map;
    }
    static _cyrb128(str) {
        let h1 = 1779033703;
        let h2 = 3144134277;
        let h3 = 1013904242;
        let h4 = 2773480762;
        for (let i = 0; i < str.length; i++) {
            const k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        return h1 >>> 0;
    }
    static _mulberry32(a) {
        return function () {
            let t = (a += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
}
//# sourceMappingURL=HeightmapGenerator.js.map