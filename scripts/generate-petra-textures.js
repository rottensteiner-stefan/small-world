import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";
import { createNoise2D } from "simplex-noise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.join(__dirname, "..", "apps", "showcases", "38", "assets");
fs.mkdirSync(OUT_DIR, { recursive: true });

const noise2D = createNoise2D();

// Helper for seamless 2D noise (toroidal mapping)
function seamlessNoise(x, y, width, height, freqX = 1, freqY = 1, seedOffset = 0) {
  const nx = (x / width) * 2 * Math.PI;
  const ny = (y / height) * 2 * Math.PI;
  const radiusX = freqX / (2 * Math.PI);
  const radiusY = freqY / (2 * Math.PI);

  const cosX = Math.cos(nx) * radiusX;
  const sinX = Math.sin(nx) * radiusX;
  const cosY = Math.cos(ny) * radiusY;
  const sinY = Math.sin(ny) * radiusY;

  return (
    noise2D(cosX + seedOffset, sinX + seedOffset) * 0.5 +
    noise2D(cosY + seedOffset + 13.7, sinY + seedOffset + 29.3) * 0.5
  );
}

// Multi-octave seamless FBM
function seamlessFbm(x, y, width, height, octaves = 4, baseFreq = 2, lacunarity = 2.0, persistence = 0.5, seedOffset = 0) {
  let total = 0;
  let frequency = baseFreq;
  let amplitude = 1.0;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += seamlessNoise(x, y, width, height, frequency, frequency, seedOffset + i * 17.1) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

// Sobel normal map generator from heightmap
function heightToNormalMap(heights, width, height, strength = 4.0) {
  const normals = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const xPrev = (x - 1 + width) % width;
      const xNext = (x + 1) % width;
      const yPrev = (y - 1 + height) % height;
      const yNext = (y + 1) % height;

      // Sobel kernel
      const tl = heights[yPrev * width + xPrev];
      const t  = heights[yPrev * width + x];
      const tr = heights[yPrev * width + xNext];
      const l  = heights[y * width + xPrev];
      const r  = heights[y * width + xNext];
      const bl = heights[yNext * width + xPrev];
      const b  = heights[yNext * width + x];
      const br = heights[yNext * width + xNext];

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * width + x) * 4;
      normals[idx]     = Math.round((nx * 0.5 + 0.5) * 255);
      normals[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normals[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normals[idx + 3] = 255;
    }
  }

  return normals;
}

function savePng(filename, width, height, data) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(data);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log(`Saved: ${outPath}`);
}

// ----------------------------------------------------------------------------
// 1. Petra Sandstone (Desert Rose Banded Sedimentary Rock with Deep Grooves)
// ----------------------------------------------------------------------------
function generateSandstoneBanded(size = 512) {
  console.log("Generating Sandstone Banded (Deep Strata & Chisel Grooves)...");
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  // High contrast palette: iron terracotta, rich ochre, creamy rose, slate/charcoal veins
  const palette = [
    { pos: 0.00, r: 195, g: 72,  b: 44 },  // Deep Iron Terracotta
    { pos: 0.20, r: 228, g: 115, b: 58 },  // Burnt Red-Orange
    { pos: 0.38, r: 238, g: 178, b: 88 },  // Limonite Golden Ochre
    { pos: 0.58, r: 242, g: 208, b: 175 }, // Soft Rose Cream
    { pos: 0.76, r: 155, g: 82,  b: 62 },  // Deep Rust Silt
    { pos: 0.88, r: 75,  g: 56,  b: 54 },  // Deep Slate / Charcoal Vein
    { pos: 1.00, r: 195, g: 72,  b: 44 },
  ];

  function samplePalette(t) {
    const normT = ((t % 1) + 1) % 1;
    for (let i = 0; i < palette.length - 1; i++) {
      if (normT >= palette[i].pos && normT <= palette[i + 1].pos) {
        const segT = (normT - palette[i].pos) / (palette[i + 1].pos - palette[i].pos);
        return {
          r: palette[i].r + (palette[i + 1].r - palette[i].r) * segT,
          g: palette[i].g + (palette[i + 1].g - palette[i].g) * segT,
          b: palette[i].b + (palette[i + 1].b - palette[i].b) * segT,
        };
      }
    }
    return palette[0];
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Domain warping for natural swirling rock strata
      const warpX = seamlessFbm(x, y, size, size, 4, 3, 2.0, 0.5, 12.5) * 0.22;
      const warpY = seamlessFbm(x, y, size, size, 4, 3, 2.0, 0.5, 48.2) * 0.22;

      const vPos = (y / size) * 4.0 + warpY * 3.5 + Math.sin(((x / size) + warpX) * Math.PI * 4) * 0.25;
      const bandT = vPos;

      const col = samplePalette(bandT);
      const grain = (seamlessNoise(x, y, size, size, 64, 64, 99.1) * 0.5 + 0.5) * 36 - 18;
      const microNoise = (seamlessNoise(x, y, size, size, 128, 128, 12.3) * 0.5 + 0.5) * 20 - 10;

      // Deep chisel rake marks (diagonal pick strokes across rock face)
      const chiselAngle = (x * 1.2 + y * 0.8) / size;
      const chiselRake = Math.abs(Math.sin(chiselAngle * Math.PI * 32)) * 0.35;
      const chiselGroove = Math.pow(chiselRake, 4.0) * 45;

      const r = Math.min(255, Math.max(0, col.r + grain + microNoise - chiselGroove));
      const g = Math.min(255, Math.max(0, col.g + grain * 0.8 + microNoise * 0.8 - chiselGroove * 0.8));
      const b = Math.min(255, Math.max(0, col.b + grain * 0.7 + microNoise * 0.7 - chiselGroove * 0.7));

      albedo[idx]     = Math.round(r);
      albedo[idx + 1] = Math.round(g);
      albedo[idx + 2] = Math.round(b);
      albedo[idx + 3] = 255;

      // Deep relief heights: pronounced strata steps + sharp chiseled ridges
      const strataStep = Math.sin(bandT * Math.PI * 2) * 0.6 + Math.sin(bandT * Math.PI * 6) * 0.2;
      const deepChisel = (1.0 - Math.pow(Math.abs(Math.sin(chiselAngle * Math.PI * 32)), 2)) * 0.45;
      heights[y * size + x] = strataStep + deepChisel + (grain / 255) * 0.15;

      // Roughness (0.62 - 0.95 with polished veins and porous sand)
      const roughVal = 0.74 + (col.g / 255) * 0.14 + deepChisel * 0.15;
      const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
      roughness[idx]     = rByte;
      roughness[idx + 1] = rByte;
      roughness[idx + 2] = rByte;
      roughness[idx + 3] = 255;
    }
  }

  const normals = heightToNormalMap(heights, size, size, 6.5);

  savePng("sandstone_banded_albedo.png", size, size, albedo);
  savePng("sandstone_banded_normal.png", size, size, normals);
  savePng("sandstone_banded_roughness.png", size, size, roughness);
}

// ----------------------------------------------------------------------------
// 2. Carved Classical Masonry (Sharp Fluting & Ashlar Bevels)
// ----------------------------------------------------------------------------
function generateCarvedMasonry(size = 512) {
  console.log("Generating Carved Masonry (Deep Fluting & Stone Relief)...");
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const fbm = seamlessFbm(x, y, size, size, 4, 4, 2.0, 0.5, 33.7);
      const grain = (seamlessNoise(x, y, size, size, 64, 64, 88.2) * 0.5 + 0.5) * 22 - 11;

      // Ashlar stone block seams with deep bevels
      const uBlock = (x / size) * 4.0;
      const vBlock = (y / size) * 8.0;
      const seamDistX = Math.abs((uBlock % 1) - 0.5) * 2.0;
      const seamDistY = Math.abs((vBlock % 1) - 0.5) * 2.0;

      const bevelX = Math.pow(seamDistX, 6.0);
      const bevelY = Math.pow(seamDistY, 6.0);
      const deepMortar = Math.max(bevelX, bevelY) * 0.75;

      // Warm Nabataean weathered rose stone
      const baseR = 215 + fbm * 28 + grain - deepMortar * 60;
      const baseG = 148 + fbm * 22 + grain * 0.8 - deepMortar * 45;
      const baseB = 118 + fbm * 18 + grain * 0.7 - deepMortar * 40;

      albedo[idx]     = Math.round(Math.min(255, Math.max(0, baseR)));
      albedo[idx + 1] = Math.round(Math.min(255, Math.max(0, baseG)));
      albedo[idx + 2] = Math.round(Math.min(255, Math.max(0, baseB)));
      albedo[idx + 3] = 255;

      // Deep grooves and fluting heights
      const fluting = Math.sin((x / size) * Math.PI * 16) * 0.35;
      heights[y * size + x] = fluting - deepMortar * 0.8 + fbm * 0.3 + (grain / 255) * 0.1;

      const roughVal = 0.72 + fbm * 0.15 + deepMortar * 0.2;
      const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
      roughness[idx]     = rByte;
      roughness[idx + 1] = rByte;
      roughness[idx + 2] = rByte;
      roughness[idx + 3] = 255;
    }
  }

  const normals = heightToNormalMap(heights, size, size, 5.5);

  savePng("carved_masonry_albedo.png", size, size, albedo);
  savePng("carved_masonry_normal.png", size, size, normals);
  savePng("carved_masonry_roughness.png", size, size, roughness);
}

// ----------------------------------------------------------------------------
// 3. Plaza Sand & Canyon Ground (Deep Ripples & Pebble Relief)
// ----------------------------------------------------------------------------
function generatePlazaSand(size = 512) {
  console.log("Generating Plaza Sand...");
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const rippleAngle = (x / size) * 8.0 + (y / size) * 16.0;
      const rippleWarp = seamlessNoise(x, y, size, size, 4, 4, 71.2) * 1.2;
      // Sharp asymmetric dune crest
      const rippleRaw = (Math.sin(rippleAngle * Math.PI * 2 + rippleWarp) + 1.0) * 0.5;
      const ripple = Math.pow(rippleRaw, 2.5);

      const fbm = seamlessFbm(x, y, size, size, 4, 3, 2.0, 0.5, 52.1);
      const grain = (seamlessNoise(x, y, size, size, 128, 128, 44.9) * 0.5 + 0.5) * 22 - 11;

      const baseR = 222 + fbm * 22 + ripple * 18 + grain;
      const baseG = 175 + fbm * 20 + ripple * 14 + grain * 0.8;
      const baseB = 125 + fbm * 16 + ripple * 8  + grain * 0.7;

      albedo[idx]     = Math.round(Math.min(255, Math.max(0, baseR)));
      albedo[idx + 1] = Math.round(Math.min(255, Math.max(0, baseG)));
      albedo[idx + 2] = Math.round(Math.min(255, Math.max(0, baseB)));
      albedo[idx + 3] = 255;

      heights[y * size + x] = ripple * 0.65 + fbm * 0.25 + (grain / 255) * 0.08;

      const roughVal = 0.94 + grain * 0.002;
      const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
      roughness[idx]     = rByte;
      roughness[idx + 1] = rByte;
      roughness[idx + 2] = rByte;
      roughness[idx + 3] = 255;
    }
  }

  const normals = heightToNormalMap(heights, size, size, 4.5);

  savePng("plaza_sand_albedo.png", size, size, albedo);
  savePng("plaza_sand_normal.png", size, size, normals);
  savePng("plaza_sand_roughness.png", size, size, roughness);
}

// ----------------------------------------------------------------------------
// 4. Rugged Canyon Cliff Face (Deep Tectonic Fissures & Rock Strata)
// ----------------------------------------------------------------------------
function generateCliffRock(size = 512) {
  console.log("Generating Cliff Rock (Deep Fissures & Sheer Strata)...");
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const fbm = seamlessFbm(x, y, size, size, 5, 3, 2.1, 0.55, 62.3);
      // Deep vertical crevices
      const verticalFissure = Math.pow(Math.abs(seamlessNoise(x, y, size, size, 16, 2, 81.5)), 4.0) * 1.5;
      const horizontalStrata = Math.sin((y / size) * Math.PI * 12 + fbm * 2) * 0.4;
      const desertVarnish = Math.max(0, seamlessFbm(x, y, size, size, 3, 2, 2.0, 0.5, 93.1)) * 75;

      const baseR = 180 + fbm * 38 - verticalFissure * 80 - desertVarnish;
      const baseG = 108 + fbm * 28 - verticalFissure * 60 - desertVarnish * 0.9;
      const baseB = 82  + fbm * 22 - verticalFissure * 50 - desertVarnish * 0.8;

      albedo[idx]     = Math.round(Math.min(255, Math.max(0, baseR)));
      albedo[idx + 1] = Math.round(Math.min(255, Math.max(0, baseG)));
      albedo[idx + 2] = Math.round(Math.min(255, Math.max(0, baseB)));
      albedo[idx + 3] = 255;

      // Deep normal relief
      heights[y * size + x] = fbm * 0.8 - verticalFissure * 1.2 + horizontalStrata * 0.5;

      const roughVal = 0.88 + fbm * 0.1;
      const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
      roughness[idx]     = rByte;
      roughness[idx + 1] = rByte;
      roughness[idx + 2] = rByte;
      roughness[idx + 3] = 255;
    }
  }

  const normals = heightToNormalMap(heights, size, size, 7.5);

  savePng("weathered_cliff_albedo.png", size, size, albedo);
  savePng("weathered_cliff_normal.png", size, size, normals);
  savePng("weathered_cliff_roughness.png", size, size, roughness);
}

// ----------------------------------------------------------------------------
// 5. Ancient Scorched Torch Wood (Deep Wood Grains & Splits)
// ----------------------------------------------------------------------------
function generateTorchWood(size = 512) {
  console.log("Generating Torch Wood...");
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const woodFiber = seamlessNoise(x, y, size, size, 32, 2, 19.4);
      const ring = Math.sin((x / size) * Math.PI * 24 + woodFiber * 3) * 0.5 + 0.5;
      const splits = Math.pow(Math.abs(seamlessNoise(x, y, size, size, 48, 1, 88.5)), 6.0) * 1.2;
      const charring = Math.pow(y / size, 2) * 0.65;

      const baseR = (80 + ring * 30 - splits * 40) * (1.0 - charring);
      const baseG = (52 + ring * 22 - splits * 30) * (1.0 - charring);
      const baseB = (36 + ring * 15 - splits * 25) * (1.0 - charring);

      albedo[idx]     = Math.round(Math.min(255, Math.max(0, baseR)));
      albedo[idx + 1] = Math.round(Math.min(255, Math.max(0, baseG)));
      albedo[idx + 2] = Math.round(Math.min(255, Math.max(0, baseB)));
      albedo[idx + 3] = 255;

      heights[y * size + x] = woodFiber * 0.35 + ring * 0.3 - splits * 0.6;

      const roughVal = 0.72 + ring * 0.15 + charring * 0.15;
      const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
      roughness[idx]     = rByte;
      roughness[idx + 1] = rByte;
      roughness[idx + 2] = rByte;
      roughness[idx + 3] = 255;
    }
  }

  const normals = heightToNormalMap(heights, size, size, 5.0);

  savePng("torch_wood_albedo.png", size, size, albedo);
  savePng("torch_wood_normal.png", size, size, normals);
  savePng("torch_wood_roughness.png", size, size, roughness);
}

// ----------------------------------------------------------------------------
// 6. Forged Iron (Deep Hammered Dimples & Forge Weld Seams)
// ----------------------------------------------------------------------------
function generateForgedIron(size = 512) {
  console.log("Generating Forged Iron...");
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const hammer = seamlessFbm(x, y, size, size, 4, 8, 2.0, 0.5, 41.6);
      const dimples = Math.pow(Math.abs(seamlessNoise(x, y, size, size, 16, 16, 52.8)), 3.0);
      const edgeHighlight = Math.abs(seamlessNoise(x, y, size, size, 24, 24, 77.3)) * 30;

      const baseR = 48 + hammer * 22 + edgeHighlight * 0.45 - dimples * 20;
      const baseG = 46 + hammer * 20 + edgeHighlight * 0.40 - dimples * 18;
      const baseB = 45 + hammer * 20 + edgeHighlight * 0.35 - dimples * 18;

      albedo[idx]     = Math.round(Math.min(255, Math.max(0, baseR)));
      albedo[idx + 1] = Math.round(Math.min(255, Math.max(0, baseG)));
      albedo[idx + 2] = Math.round(Math.min(255, Math.max(0, baseB)));
      albedo[idx + 3] = 255;

      heights[y * size + x] = hammer * 0.5 - dimples * 0.6;

      const roughVal = 0.38 + hammer * 0.15;
      const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
      roughness[idx]     = rByte;
      roughness[idx + 1] = rByte;
      roughness[idx + 2] = rByte;
      roughness[idx + 3] = 255;
    }
  }

  const normals = heightToNormalMap(heights, size, size, 5.0);

  savePng("forged_iron_albedo.png", size, size, albedo);
  savePng("forged_iron_normal.png", size, size, normals);
  savePng("forged_iron_roughness.png", size, size, roughness);
}

// ----------------------------------------------------------------------------
// 7. Paved Flagstone Masonry (Deep Recessed Mortar & Chiseled Slabs)
// ----------------------------------------------------------------------------
function generatePavedFlagstone(size = 512) {
  console.log("Generating Paved Flagstone (Deep Mortar Joints)...");
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const fbm = seamlessFbm(x, y, size, size, 4, 3, 2.0, 0.5, 29.4);
      const grain = (seamlessNoise(x, y, size, size, 64, 64, 15.2) * 0.5 + 0.5) * 24 - 12;

      // Grid of weathered rectangular paving stones
      const uStone = (x / size) * 4.0;
      const row = Math.floor((y / size) * 6.0);
      const offset = (row % 2 === 0) ? 0.0 : 0.5;
      const vStone = (y / size) * 6.0;

      const distU = Math.abs(((uStone + offset) % 1) - 0.5) * 2.0;
      const distV = Math.abs((vStone % 1) - 0.5) * 2.0;

      // Deep recessed mortar bevel
      const mortarU = Math.pow(distU, 8.0);
      const mortarV = Math.pow(distV, 8.0);
      const deepJoint = Math.max(mortarU, mortarV);

      // Warm sandstone paver with dark mortar joints
      const baseR = 190 + fbm * 25 + grain - deepJoint * 90;
      const baseG = 135 + fbm * 20 + grain * 0.8 - deepJoint * 70;
      const baseB = 105 + fbm * 18 + grain * 0.7 - deepJoint * 60;

      albedo[idx]     = Math.round(Math.min(255, Math.max(0, baseR)));
      albedo[idx + 1] = Math.round(Math.min(255, Math.max(0, baseG)));
      albedo[idx + 2] = Math.round(Math.min(255, Math.max(0, baseB)));
      albedo[idx + 3] = 255;

      heights[y * size + x] = fbm * 0.35 - deepJoint * 1.1 + (grain / 255) * 0.08;

      const roughVal = 0.78 + fbm * 0.12 + deepJoint * 0.18;
      const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
      roughness[idx]     = rByte;
      roughness[idx + 1] = rByte;
      roughness[idx + 2] = rByte;
      roughness[idx + 3] = 255;
    }
  }

  const normals = heightToNormalMap(heights, size, size, 6.0);

  savePng("paved_flagstone_albedo.png", size, size, albedo);
  savePng("paved_flagstone_normal.png", size, size, normals);
  savePng("paved_flagstone_roughness.png", size, size, roughness);
}

generateSandstoneBanded(512);
generateCarvedMasonry(512);
generatePlazaSand(512);
generateCliffRock(512);
generateTorchWood(512);
generateForgedIron(512);
generatePavedFlagstone(512);
console.log("All high-relief Petra textures generated successfully!");
