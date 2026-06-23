import fs from "fs/promises";
import path from "path";
import { WgslReflect } from "wgsl_reflect/wgsl_reflect.module.js";

const chunksDir = path.resolve("public/resources/shaders/web_gpu/chunks");
const materialsDir = path.resolve("src/core/materials/shaders");

async function loadChunks() {
  const chunks = new Map<string, string>();
  const files = await fs.readdir(chunksDir);
  for (const file of files) {
    if (file.endsWith(".wgsl")) {
      const name = file.replace(".wgsl", "").toUpperCase();
      const content = await fs.readFile(path.join(chunksDir, file), "utf8");

      // WGSL chunks often correspond to standard keys
      let key = name;
      if (name === "LIGHTING_PBR") key = "WGSL_PBR_LIGHTING";
      if (name === "LIGHTING") key = "WGSL_LIGHTING";
      if (name === "FOG_CALC") key = "WGSL_FOG_CALC";

      chunks.set(key, content);
    }
  }

  // Load dynamic chunks from CoreShaderChunks.ts
  try {
    const coreChunksPath = path.resolve("src/core/renderers/shaders/CoreShaderChunks.ts");
    const coreChunksContent = await fs.readFile(coreChunksPath, "utf8");
    const extractChunk = (varName: string) => {
      const regex = new RegExp(`const\\s+${varName}\\s*=\\s*\`([\\s\\S]*?)\`;`);
      const match = regex.exec(coreChunksContent);
      return match ? match[1] : "";
    };

    chunks.set("FILTER_GLITCH_DISTORT", extractChunk("filterGlitchDistortWGSL"));
    chunks.set("FILTER_VHS_DISTORT", extractChunk("filterVhsDistortWGSL"));
    chunks.set("FILTER_COLOR_GRADING", extractChunk("filterColorGradingWGSL"));
  } catch (e) {
    console.warn("Could not load dynamic filter chunks from CoreShaderChunks.ts:", e);
  }

  return chunks;
}

async function lintWgsl() {
  const chunks = await loadChunks();
  const files = await fs.readdir(materialsDir);
  let hasErrors = false;

  for (const file of files) {
    if (!file.endsWith(".wgsl")) continue;

    const filePath = path.join(materialsDir, file);
    let code = await fs.readFile(filePath, "utf8");

    // Simple regex to replace chunks like [WGSL_PBR_LIGHTING]
    code = code.replace(/\[([A-Z_]+)\]/g, (match, key) => {
      // If it's a global struct chunk, we prepend it manually later,
      // but let's replace what we can
      return chunks.get(key) || match;
    });

    // We also need to prepend the structs and bindings which are usually added by the engine
    const structs = chunks.get("STRUCTS") || "";
    // pbr_math is needed if it's PBR
    const pbrMath = chunks.get("PBR_MATH") || "";

    // In actual engine, structs.wgsl is prepended to everything
    code = structs + "\n" + pbrMath + "\n" + code;

    try {
      new WgslReflect(code);
      console.log(`✅ ${file} passed validation.`);
    } catch (err: unknown) {
      console.error(`❌ ${file} validation failed:`);
      console.error((err as Error).message || err);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

lintWgsl().catch(console.error);
