import { TextureFilter, TextureWrap } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { Texture } from "./Texture.js";

/** Number of texels in a ramp LUT (256x1). */
export const RAMP_LUT_SIZE: number = 256;

/**
 * One colour stop of a ramp LUT.
 */
export interface RampStop {
  /** Position along the ramp, clamped to 0..1. */
  t: number;
  /** Stop colour as sRGB (0..1 per channel); alpha is ignored. */
  color: Color;
}

/**
 * Bakes colour stops into 256 RGBA8 sRGB texels (alpha is always 255). Stops are sorted by `t`,
 * `t` is clamped to 0..1, texels before the first / after the last stop take that stop's colour,
 * and equal `t` values produce a hard step. Pure function so it is testable without a canvas.
 * @param stops At least one colour stop.
 * @returns A new `Uint8ClampedArray` of length `RAMP_LUT_SIZE * 4`.
 */
export function bakeRamp(stops: readonly RampStop[]): Uint8ClampedArray {
  if (0 === stops.length) {
    throw new Error("[bakeRamp] At least one colour stop is required.");
  }

  const sorted = stops
    .map((s: RampStop) => ({ t: Math.min(1, Math.max(0, s.t)), color: s.color }))
    .sort((a, b) => a.t - b.t);

  const out = new Uint8ClampedArray(RAMP_LUT_SIZE * 4);
  let segment = 0;
  for (let i = 0; i < RAMP_LUT_SIZE; i++) {
    const t = i / (RAMP_LUT_SIZE - 1);
    while (segment < sorted.length - 1 && t >= sorted[segment + 1]!.t) {
      segment++;
    }
    const a = sorted[segment]!;
    const b = sorted[Math.min(segment + 1, sorted.length - 1)]!;
    // Before the first stop: segment 0 with t < a.t -> hold a.color. Past the last: a === b.
    const span = b.t - a.t;
    const k = 0 < span ? Math.min(1, Math.max(0, (t - a.t) / span)) : 0;
    const o = i * 4;
    out[o] = Math.round((a.color.r + (b.color.r - a.color.r) * k) * 255);
    out[o + 1] = Math.round((a.color.g + (b.color.g - a.color.g) * k) * 255);
    out[o + 2] = Math.round((a.color.b + (b.color.b - a.color.b) * k) * 255);
    out[o + 3] = 255;
  }
  return out;
}

/**
 * A 256x1 colour-ramp lookup texture (ADR 0026 route (a)): artist-authored gradient stops baked on the CPU
 * and sampled by the shader instead of hard-coded colour mixes. Assign `texture` to e.g.
 * `StylizedWaterMaterial.rampMap`. Stored as sRGB bytes; the shader linearises after sampling.
 * Filtering is always linear, wrapping always clamp (WebGPU shares one sampler per material anyway).
 */
export class RampLUT {
  public readonly texture: Texture;
  private readonly _canvas: HTMLCanvasElement;

  constructor(stops: readonly RampStop[]) {
    this._canvas = document.createElement("canvas");
    this._canvas.width = RAMP_LUT_SIZE;
    this._canvas.height = 1;
    this.texture = Texture.fromCanvas(this._canvas, {
      generateMipmaps: false,
      magFilter: TextureFilter.LINEAR,
      minFilter: TextureFilter.LINEAR,
      addressModeU: TextureWrap.CLAMP_TO_EDGE,
      addressModeV: TextureWrap.CLAMP_TO_EDGE,
    });
    this.setStops(stops);
  }

  /**
   * Re-bakes the ramp and flags the texture for GPU re-upload.
   * @param stops At least one colour stop.
   */
  public setStops(stops: readonly RampStop[]): void {
    const ctx = this._canvas.getContext("2d");
    if (null === ctx) {
      throw new Error("[RampLUT] 2D canvas context unavailable.");
    }
    const pixels = bakeRamp(stops);
    const image = ctx.createImageData(RAMP_LUT_SIZE, 1);
    image.data.set(pixels);
    ctx.putImageData(image, 0, 0);
    this.texture.needsUpdate = true;
  }
}
