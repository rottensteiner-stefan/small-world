import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REF_IMG_PATH = path.join(__dirname, "..", ".agents", "scratches", "sandstone_ref.png");
const OUT_DIR = path.join(__dirname, "..", "apps", "showcases", "38", "assets");

if (!fs.existsSync(REF_IMG_PATH)) {
  console.error("Reference image not found:", REF_IMG_PATH);
  process.exit(1);
}

console.log("Reading reference image:", REF_IMG_PATH);
const refPng = PNG.sync.read(fs.readFileSync(REF_IMG_PATH));
const { width: srcW, height: srcH, data: srcData } = refPng;
console.log(`Source dimensions: ${srcW}x${srcH}`);

const OUT_SIZE = 1024;
const MARGIN = 180; // seamless blend overlap margin

// Crop center region from source (avoid original photo dark border/vignette)
const cropSize = 1400;
const cropX = Math.floor((srcW - cropSize) / 2);
const cropY = Math.floor((srcH - cropSize) / 2);

// Sample source pixel from center area with bilinear interpolation
function sampleSource(u, v) {
  const sx = cropX + u * cropSize;
  const sy = cropY + v * cropSize;

  const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(sx)));
  const x1 = Math.max(0, Math.min(srcW - 1, x0 + 1));
  const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(sy)));
  const y1 = Math.max(0, Math.min(srcH - 1, y0 + 1));

  const fx = sx - x0;
  const fy = sy - y0;

  const idx00 = (y0 * srcW + x0) * 4;
  const idx10 = (y0 * srcW + x1) * 4;
  const idx01 = (y1 * srcW + x0) * 4;
  const idx11 = (y1 * srcW + x1) * 4;

  const r =
    (1 - fx) * (1 - fy) * srcData[idx00] +
    fx * (1 - fy) * srcData[idx10] +
    (1 - fx) * fy * srcData[idx01] +
    fx * fy * srcData[idx11];
  const g =
    (1 - fx) * (1 - fy) * srcData[idx00 + 1] +
    fx * (1 - fy) * srcData[idx10 + 1] +
    (1 - fx) * fy * srcData[idx01 + 1] +
    fx * fy * srcData[idx11 + 1];
  const b =
    (1 - fx) * (1 - fy) * srcData[idx00 + 2] +
    fx * (1 - fy) * srcData[idx10 + 2] +
    (1 - fx) * fy * srcData[idx01 + 2] +
    fx * fy * srcData[idx11 + 2];

  return { r, g, b };
}

// 1. Extract and seamless-tile the center region
const rawTile = new Float32Array(OUT_SIZE * OUT_SIZE * 3);

for (let y = 0; y < OUT_SIZE; y++) {
  const v = y / OUT_SIZE;
  for (let x = 0; x < OUT_SIZE; x++) {
    const u = x / OUT_SIZE;
    const pCenter = sampleSource(u, v);

    let r = pCenter.r;
    let g = pCenter.g;
    let b = pCenter.b;

    // Horizontal seam blend
    if (x < MARGIN) {
      const weight = 0.5 * (1 - Math.cos((x / MARGIN) * Math.PI));
      const pOpposite = sampleSource(1.0 - (MARGIN - x) / OUT_SIZE, v);
      r = r * weight + pOpposite.r * (1 - weight);
      g = g * weight + pOpposite.g * (1 - weight);
      b = b * weight + pOpposite.b * (1 - weight);
    }

    // Vertical seam blend
    if (y < MARGIN) {
      const weight = 0.5 * (1 - Math.cos((y / MARGIN) * Math.PI));
      const pOpposite = sampleSource(u, 1.0 - (MARGIN - y) / OUT_SIZE);
      r = r * weight + pOpposite.r * (1 - weight);
      g = g * weight + pOpposite.g * (1 - weight);
      b = b * weight + pOpposite.b * (1 - weight);
    }

    const idx = (y * OUT_SIZE + x) * 3;
    rawTile[idx] = r;
    rawTile[idx + 1] = g;
    rawTile[idx + 2] = b;
  }
}

// 2. High-pass flat-field illumination normalization (removes any macroscopic brightness gradient)
const blurRadius = 48;
const lowPass = new Float32Array(OUT_SIZE * OUT_SIZE * 3);

// Horizontal box blur
const tempBlur = new Float32Array(OUT_SIZE * OUT_SIZE * 3);
for (let y = 0; y < OUT_SIZE; y++) {
  for (let x = 0; x < OUT_SIZE; x++) {
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let k = -blurRadius; k <= blurRadius; k += 4) {
      const sx = (x + k + OUT_SIZE) % OUT_SIZE;
      const idx = (y * OUT_SIZE + sx) * 3;
      sumR += rawTile[idx];
      sumG += rawTile[idx + 1];
      sumB += rawTile[idx + 2];
      count++;
    }
    const idx = (y * OUT_SIZE + x) * 3;
    tempBlur[idx] = sumR / count;
    tempBlur[idx + 1] = sumG / count;
    tempBlur[idx + 2] = sumB / count;
  }
}

// Vertical box blur
for (let y = 0; y < OUT_SIZE; y++) {
  for (let x = 0; x < OUT_SIZE; x++) {
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let k = -blurRadius; k <= blurRadius; k += 4) {
      const sy = (y + k + OUT_SIZE) % OUT_SIZE;
      const idx = (sy * OUT_SIZE + x) * 3;
      sumR += tempBlur[idx];
      sumG += tempBlur[idx + 1];
      sumB += tempBlur[idx + 2];
      count++;
    }
    const idx = (y * OUT_SIZE + x) * 3;
    lowPass[idx] = sumR / count;
    lowPass[idx + 1] = sumG / count;
    lowPass[idx + 2] = sumB / count;
  }
}

// Global target color (authentic warm Jordanian desert sandstone: rich golden-terracotta)
const targetR = 212.0;
const targetG = 145.0;
const targetB = 108.0;

const seamlessAlbedo = new Uint8Array(OUT_SIZE * OUT_SIZE * 4);
const heights = new Float32Array(OUT_SIZE * OUT_SIZE);
const roughness = new Uint8Array(OUT_SIZE * OUT_SIZE * 4);

for (let i = 0; i < OUT_SIZE * OUT_SIZE; i++) {
  const idx3 = i * 3;
  const idx4 = i * 4;

  const rFlat = (rawTile[idx3] / Math.max(1, lowPass[idx3])) * targetR;
  const gFlat = (rawTile[idx3 + 1] / Math.max(1, lowPass[idx3 + 1])) * targetG;
  const bFlat = (rawTile[idx3 + 2] / Math.max(1, lowPass[idx3 + 2])) * targetB;

  const rClamped = Math.min(255, Math.max(0, Math.round(rFlat)));
  const gClamped = Math.min(255, Math.max(0, Math.round(gFlat)));
  const bClamped = Math.min(255, Math.max(0, Math.round(bFlat)));

  seamlessAlbedo[idx4] = rClamped;
  seamlessAlbedo[idx4 + 1] = gClamped;
  seamlessAlbedo[idx4 + 2] = bClamped;
  seamlessAlbedo[idx4 + 3] = 255;

  const lum = 0.299 * rClamped + 0.587 * gClamped + 0.114 * bClamped;
  heights[i] = lum / 255.0;

  // Porous weathered sandstone roughness (0.75 - 0.90)
  const roughVal = 0.82 + (1.0 - heights[i]) * 0.10;
  const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
  roughness[idx4] = rByte;
  roughness[idx4 + 1] = rByte;
  roughness[idx4 + 2] = rByte;
  roughness[idx4 + 3] = 255;
}

// 2. High-precision Sobel Normal Map generator
function computeNormalMap(heightMap, size, strength = 4.2) {
  const normals = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xPrev = (x - 1 + size) % size;
      const xNext = (x + 1) % size;
      const yPrev = (y - 1 + size) % size;
      const yNext = (y + 1) % size;

      // Sobel 3x3 filter
      const tl = heightMap[yPrev * size + xPrev];
      const t  = heightMap[yPrev * size + x];
      const tr = heightMap[yPrev * size + xNext];
      const l  = heightMap[y * size + xPrev];
      const r  = heightMap[y * size + xNext];
      const bl = heightMap[yNext * size + xPrev];
      const b  = heightMap[yNext * size + x];
      const br = heightMap[yNext * size + xNext];

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      normals[idx]     = Math.round((nx * 0.5 + 0.5) * 255);
      normals[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normals[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normals[idx + 3] = 255;
    }
  }

  return normals;
}

const normals = computeNormalMap(heights, OUT_SIZE, 5.0);

function savePng(filename, data) {
  const png = new PNG({ width: OUT_SIZE, height: OUT_SIZE });
  png.data = Buffer.from(data);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log(`Saved: ${outPath} (${OUT_SIZE}x${OUT_SIZE})`);
}

// Save carved masonry maps
savePng("carved_masonry_albedo.png", seamlessAlbedo);
savePng("carved_masonry_normal.png", normals);
savePng("carved_masonry_roughness.png", roughness);

// 3. Generate natural Banded Sandstone (Desert Rose natural strata) for natural cliff & inner sanctum walls
const bandedAlbedo = new Uint8Array(OUT_SIZE * OUT_SIZE * 4);
const bandedHeights = new Float32Array(OUT_SIZE * OUT_SIZE);
const bandedRoughness = new Uint8Array(OUT_SIZE * OUT_SIZE * 4);

for (let y = 0; y < OUT_SIZE; y++) {
  const v = y / OUT_SIZE;
  for (let x = 0; x < OUT_SIZE; x++) {
    const u = x / OUT_SIZE;
    const idx = (y * OUT_SIZE + x) * 4;

    // Organic wavy strata
    const wave = Math.sin(v * Math.PI * 6.0 + Math.sin(u * Math.PI * 4.0) * 0.45) * 0.5 + 0.5;
    const wave2 = Math.cos(v * Math.PI * 12.0 + u * Math.PI * 2.0) * 0.5 + 0.5;

    const baseR = seamlessAlbedo[idx];
    const baseG = seamlessAlbedo[idx + 1];
    const baseB = seamlessAlbedo[idx + 2];

    // Subtle natural tonal shifting: warm terracotta, peach-rose, ochre
    const shiftR = baseR * (0.88 + wave * 0.22 + wave2 * 0.08);
    const shiftG = baseG * (0.84 + wave * 0.26 - wave2 * 0.06);
    const shiftB = baseB * (0.80 + wave * 0.30 - wave2 * 0.10);

    const rC = Math.min(255, Math.max(0, Math.round(shiftR)));
    const gC = Math.min(255, Math.max(0, Math.round(shiftG)));
    const bC = Math.min(255, Math.max(0, Math.round(shiftB)));

    bandedAlbedo[idx]     = rC;
    bandedAlbedo[idx + 1] = gC;
    bandedAlbedo[idx + 2] = bC;
    bandedAlbedo[idx + 3] = 255;

    bandedHeights[y * OUT_SIZE + x] = heights[y * OUT_SIZE + x] + wave * 0.25;

    const rough = 0.80 + (1.0 - (wave * 0.5 + wave2 * 0.5)) * 0.12;
    const rByte = Math.round(Math.min(255, Math.max(0, rough * 255)));
    bandedRoughness[idx]     = rByte;
    bandedRoughness[idx + 1] = rByte;
    bandedRoughness[idx + 2] = rByte;
    bandedRoughness[idx + 3] = 255;
  }
}

const bandedNormals = computeNormalMap(bandedHeights, OUT_SIZE, 4.5);

savePng("sandstone_banded_albedo.png", bandedAlbedo);
savePng("sandstone_banded_normal.png", bandedNormals);
savePng("sandstone_banded_roughness.png", bandedRoughness);

console.log("Processed all high-res sandstone PBR maps successfully!");
