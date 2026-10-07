import { OpenWaterMaterial } from "./OpenWaterMaterial.js";

/**
 * The three packed wave lanes of an OpenWater material. Exactly the fields that are
 * transmitted to the GPU as `u_extraParams`, `u_liquidParams` and `u_thresholds`.
 * `speed` is transmitted as `u_reflectivity`. S1 contract: the probe must read these
 * SAME fields and never re-derive or hand-copy constants, otherwise the
 * "same-field" proof (G2 constants-equality manifest) breaks.
 */
export interface OpenWaterWaveLanes {
  wave1: readonly [number, number, number, number];
  wave2: readonly [number, number, number, number];
  wave3: readonly [number, number, number, number];
  speed: number;
}

export interface OpenWaterSurfaceProbeOptions {
  /** World-space rest height of the water plane. Defaults to 0. */
  restHeight?: number;
  /**
   * When true, every intermediate of the mirror is rounded to float32 via Math.fround,
   * emulating the GPU's IEEE-754 f32 arithmetic. Defaults to true.
   */
  f32Precision?: boolean;
}

const PI_2 = 6.28318530718;
const GRAVITY = 9.81;
const MIN_K = 0.001;
const MIN_WAVELENGTH = 0.001;

/**
 * CPU-side mirror of the Gerstner wave sum exactly as the OpenWater vertex shader
 * evaluates it (`OpenWater.vert.glsl` lines 85-107 combined with the shared
 * `liquid_gerstner_wave.glsl` chunk). Reproduces the per-op sequence and, by default,
 * rounds every intermediate to float32 so the computed surface height matches what the
 * GPU would produce.
 *
 * S1 purpose: replace the flat `fv.bounds.max.y` probe in `BuoyancySolver` (line 76)
 * with a query of the actual wave surface ("the body rides the real surface").
 */
export class OpenWaterSurfaceProbe {
  private readonly _wave1: [number, number, number, number];
  private readonly _wave2: [number, number, number, number];
  private readonly _wave3: [number, number, number, number];
  private readonly _speed: number;
  private readonly _restHeight: number;
  private readonly _f32: boolean;

  constructor(lanes: OpenWaterWaveLanes, options: OpenWaterSurfaceProbeOptions = {}) {
    this._wave1 = lanes.wave1.slice() as [number, number, number, number];
    this._wave2 = lanes.wave2.slice() as [number, number, number, number];
    this._wave3 = lanes.wave3.slice() as [number, number, number, number];
    this._speed = lanes.speed;
    this._restHeight = options.restHeight ?? 0.0;
    this._f32 = options.f32Precision ?? true;
  }

  public static fromMaterial(
    material: OpenWaterMaterial,
    options: OpenWaterSurfaceProbeOptions = {},
  ): OpenWaterSurfaceProbe {
    return new OpenWaterSurfaceProbe(
      {
        wave1: material.wave1,
        wave2: material.wave2,
        wave3: material.wave3,
        speed: material.speed,
      },
      options,
    );
  }

  /**
   * Defensive copy of the wave lanes bound to this probe. Used by the constants-equality
   * manifest to prove the probe reads the same fields the material packs for the GPU
   * (u_extraParams/u_liquidParams/u_thresholds/u_reflectivity) -- the "same field" proof.
   */
  public getWaveLanes(): OpenWaterWaveLanes {
    return {
      wave1: this._wave1.slice() as [number, number, number, number],
      wave2: this._wave2.slice() as [number, number, number, number],
      wave3: this._wave3.slice() as [number, number, number, number],
      speed: this._speed,
    };
  }

  public get restHeight(): number {
    return this._restHeight;
  }

  /** World-space surface height at the horizontal position (x, z) and engine time. */
  public heightAt(x: number, z: number, time: number): number {
    const r = (v: number): number => (this._f32 ? Math.fround(v) : v);
    // The shader accumulates `displacement += gerstnerWave(...)` six times; every `+` is an
    // f32 add on the GPU, so each intermediate sum is rounded when f32Precision is enabled.
    let sum = 0.0;
    sum = r(
      sum + OpenWaterSurfaceProbe.waveHeight(this._wave1, x, z, this._speed, time, this._f32),
    );
    sum = r(
      sum + OpenWaterSurfaceProbe.waveHeight(this._wave2, x, z, this._speed, time, this._f32),
    );
    sum = r(
      sum + OpenWaterSurfaceProbe.waveHeight(this._wave3, x, z, this._speed, time, this._f32),
    );
    sum = r(sum + OpenWaterSurfaceProbe.waveHeight(this._w4(), x, z, this._speed, time, this._f32));
    sum = r(sum + OpenWaterSurfaceProbe.waveHeight(this._w5(), x, z, this._speed, time, this._f32));
    sum = r(sum + OpenWaterSurfaceProbe.waveHeight(this._w6(), x, z, this._speed, time, this._f32));
    return this._round(this._restHeight + sum);
  }

  /**
   * Surface height above the WORLD point (x, z). The shader displaces vertices horizontally as
   * well (Gerstner), so the vertex that ends up above (x, z) started at a different rest
   * position. This solves `rest + horizontalDisplacement(rest) = target` with Newton's method
   * (analytic 2x2 Jacobian, quadratic convergence; a plain fixed-point iteration does not
   * converge once the summed steepness of all six waves exceeds 1) and returns the height at
   * the resulting rest position. Use this for buoyancy; `heightAt` is the height of the vertex
   * at a given REST position. Valid for surfaces that do not fold over themselves: where the
   * Jacobian is singular the last estimate is kept, and on very steep lane sets (summed steepness
   * far above 1) several vertices can lie above one point, so the result may belong to any of
   * them. Checked against the real vertex shader by `scripts/probe-gpu-parity.mjs`.
   */
  public surfaceHeightAt(x: number, z: number, time: number, iterations: number = 4): number {
    let restX = x;
    let restZ = z;
    for (let i = 0; i < iterations; i++) {
      const g = this._horizontalDisplacement(restX, restZ, time);
      const residualX = restX + g.dx - x;
      const residualZ = restZ + g.dz - z;
      const det = g.jxx * g.jzz - g.jxz * g.jxz;
      if (Math.abs(det) < 1e-6) {
        break;
      }
      restX = this._round(restX - (g.jzz * residualX - g.jxz * residualZ) / det);
      restZ = this._round(restZ - (g.jxx * residualZ - g.jxz * residualX) / det);
    }
    return this.heightAt(restX, restZ, time);
  }

  /**
   * Summed horizontal Gerstner displacement `(dir.x, dir.y) * a * cos(phase)` of all six waves
   * and its Jacobian with respect to the rest position (`jxx`, `jxz`, `jzz` are the entries of
   * `I + d(displacement)/d(rest)`).
   */
  private _horizontalDisplacement(
    x: number,
    z: number,
    time: number,
  ): { dx: number; dz: number; jxx: number; jxz: number; jzz: number } {
    const waves = [this._wave1, this._wave2, this._wave3, this._w4(), this._w5(), this._w6()];
    let dx = 0.0;
    let dz = 0.0;
    let jxx = 1.0;
    let jxz = 0.0;
    let jzz = 1.0;
    for (const wave of waves) {
      const t = OpenWaterSurfaceProbe._terms(wave, x, z, this._speed, time, this._f32);
      dx = this._round(dx + t.nx * t.a * t.cosf);
      dz = this._round(dz + t.ny * t.a * t.cosf);
      const slope = t.a * t.k * t.sinf;
      jxx -= slope * t.nx * t.nx;
      jxz -= slope * t.nx * t.ny;
      jzz -= slope * t.ny * t.ny;
    }
    return { dx, dz, jxx, jxz, jzz };
  }

  /**
   * Vertical displacement contribution of a single wave lane, mirroring the
   * `gerstnerWave` chunk (chunks/liquid_gerstner_wave.glsl). The world position (x, z) is
   * the REST position -- the shader evaluates Gerstner at the undisplaced vertex.
   */
  public static waveHeight(
    wave: readonly [number, number, number, number],
    x: number,
    z: number,
    speed: number,
    time: number,
    f32Precision: boolean = true,
  ): number {
    const t = OpenWaterSurfaceProbe._terms(wave, x, z, speed, time, f32Precision);
    return f32Precision ? Math.fround(t.a * t.sinf) : t.a * t.sinf;
  }

  /**
   * The shared per-wave terms of the `gerstnerWave` chunk: normalized direction, amplitude `a`,
   * `sin`/`cos` of the phase. Exact op order of the shader, rounded to f32 when requested.
   */
  private static _terms(
    wave: readonly [number, number, number, number],
    x: number,
    z: number,
    speed: number,
    time: number,
    f32Precision: boolean,
  ): { nx: number; ny: number; a: number; k: number; sinf: number; cosf: number } {
    const f = (v: number): number => (f32Precision ? Math.fround(v) : v);

    const dirX = f(wave[0]);
    const dirY = f(wave[1]);
    const steepness = f(wave[2]);
    const wavelength = f(Math.max(wave[3], MIN_WAVELENGTH));
    const k = f(PI_2 / wavelength);
    const w = f(Math.sqrt(f(GRAVITY * k)));
    const a = f(steepness / f(Math.max(k, MIN_K)));
    // normalize(wave.xy): no clamp in the shader -- GLSL and WGSL both call
    // `normalize(wave.xy)` verbatim. Reproduces length then the two divisions.
    const len = f(Math.sqrt(f(f(dirX * dirX) + f(dirY * dirY))));
    const nx = f(dirX / len);
    const ny = f(dirY / len);
    const dot = f(f(nx * x) + f(ny * z));
    const kDot = f(k * dot);
    // f = k * dot - w * speed * time: GLSL groups `w * speed * time` as ((w*speed)*time).
    const wSpeed = f(w * f(speed));
    const phaseTerm = f(wSpeed * f(time));
    const phase = f(kDot - phaseTerm);
    const sinf = f(Math.sin(phase));
    const cosf = f(Math.cos(phase));
    return { nx, ny, a, k, sinf, cosf };
  }

  private _round(v: number): number {
    return this._f32 ? Math.fround(v) : v;
  }

  /** `vec4 w4 = vec4(w1.y, -w1.x, w1.z * 0.45, w1.w * 0.42)` -- perpendicular detail wave 1. */
  private _w4(): [number, number, number, number] {
    const f = (v: number): number => (this._f32 ? Math.fround(v) : v);
    return [
      f(this._wave1[1]),
      f(-this._wave1[0]),
      f(this._wave1[2] * 0.45),
      f(this._wave1[3] * 0.42),
    ];
  }

  /** `vec4 w5 = vec4(-w2.y, w2.x, w2.z * 0.35, w2.w * 0.35)` -- detail wave 2. */
  private _w5(): [number, number, number, number] {
    const f = (v: number): number => (this._f32 ? Math.fround(v) : v);
    return [
      f(-this._wave2[1]),
      f(this._wave2[0]),
      f(this._wave2[2] * 0.35),
      f(this._wave2[3] * 0.35),
    ];
  }

  /** `vec4 w6 = vec4(w1.x*0.5 - w1.y*0.866, w1.x*0.866 + w1.y*0.5, w1.z*0.25, w1.w*0.22)` -- bimodal 60-deg cross-swell. */
  private _w6(): [number, number, number, number] {
    const f = (v: number): number => (this._f32 ? Math.fround(v) : v);
    return [
      f(f(this._wave1[0] * 0.5) - f(this._wave1[1] * 0.866)),
      f(f(this._wave1[0] * 0.866) + f(this._wave1[1] * 0.5)),
      f(this._wave1[2] * 0.25),
      f(this._wave1[3] * 0.22),
    ];
  }
}
