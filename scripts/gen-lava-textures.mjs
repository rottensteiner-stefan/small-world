/**
 * Generates the two seamless textures the Stylized Lava port samples (MinionsArt shader inputs):
 *   lava_main.webp    -- _MainTex:    black blobs separated by a thick white vein network
 *   lava_distort.webp -- _DistortTex: soft cloud noise (mid-grey, low contrast)
 * Usage: node scripts/gen-lava-textures.mjs [outDir]   (default apps/showcases/10/assets)
 * Needs `cwebp` on PATH. Both outputs tile seamlessly (all lattices wrap).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";

const outDir = process.argv[2] ?? "apps/showcases/10/assets";
mkdirSync(outDir, { recursive: true });

function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Periodic value noise on a `period` x `period` lattice, returns 0..1. */
function valueNoise(u, v, period, seed) {
  const x = u * period;
  const y = v * period;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const wrap = (n) => ((n % period) + period) % period;
  const a = hash2(wrap(x0), wrap(y0), seed);
  const b = hash2(wrap(x0 + 1), wrap(y0), seed);
  const c = hash2(wrap(x0), wrap(y0 + 1), seed);
  const d = hash2(wrap(x0 + 1), wrap(y0 + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(u, v, basePeriod, octaves, seed) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(u, v, basePeriod << o, seed + o * 17);
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}

/** Tileable Worley on a `cells` x `cells` jittered grid: returns [F1, F2, nearest cell hash 0..1]. */
function worley(u, v, cells, seed) {
  const x = u * cells;
  const y = v * cells;
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  let f1 = 1e9;
  let f2 = 1e9;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const nx = cx + i;
      const ny = cy + j;
      const wx = ((nx % cells) + cells) % cells;
      const wy = ((ny % cells) + cells) % cells;
      const px = nx + 0.15 + 0.7 * hash2(wx, wy, seed);
      const py = ny + 0.15 + 0.7 * hash2(wx, wy, seed + 101);
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash2(wx, wy, seed + 211);
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return [f1, f2, id];
}

function writeWebp(name, size, pixel) {
  const png = new PNG({ width: size, height: size });
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const g = Math.round(Math.min(1, Math.max(0, pixel(px / size, py / size))) * 255);
      const o = (py * size + px) * 4;
      png.data[o] = png.data[o + 1] = png.data[o + 2] = g;
      png.data[o + 3] = 255;
    }
  }
  const tmp = mkdtempSync(join(tmpdir(), "lava-tex-"));
  const pngPath = join(tmp, `${name}.png`);
  writeFileSync(pngPath, PNG.sync.write(png));
  execFileSync("cwebp", ["-lossless", "-z", "9", "-quiet", pngPath, "-o", join(outDir, name)]);
}

// _MainTex: ~7x7 round black blobs (per-cell radius) separated by thick white veins, domain-warped
// so the network wobbles organically. A sparse second Worley adds tiny specks.
writeWebp("lava_main.webp", 1024, (u, v) => {
  const wu = u + (fbm(u, v, 4, 3, 7) - 0.5) * 0.07;
  const wv = v + (fbm(u, v, 4, 3, 19) - 0.5) * 0.07;
  const [f1, f2, id] = worley(((wu % 1) + 1) % 1, ((wv % 1) + 1) % 1, 7, 3);
  // Veins along the shared cell borders (F2-F1 gap) plus white pools where F1 grows large
  // (cell corners), which rounds the black blobs like the reference.
  const radius = 0.56 + 0.1 * id;
  const veins = 1 - smooth(0.04, 0.17, f2 - f1);
  const pools = smooth(radius, radius + 0.08, f1);
  const [s1] = worley(u, v, 23, 77);
  const speck = (1 - smooth(0.05, 0.1, s1)) * (hash2(Math.floor(u * 23), Math.floor(v * 23), 9) < 0.18 ? 1 : 0);
  return Math.max(veins, pools, speck * 0.9);
});

// _DistortTex: soft clouds. Mid-grey with low contrast so (d + d2) * 0.5 stays around 0.5.
writeWebp("lava_distort.webp", 512, (u, v) => {
  const n = fbm(u, v, 4, 5, 123);
  return 0.5 + (n - 0.5) * 1.15;
});

console.log(`wrote lava_main.webp + lava_distort.webp to ${outDir}`);
