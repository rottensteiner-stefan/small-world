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
      
      chunks.set(key, content);
    }
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
    } catch (err: any) {
      console.error(`❌ ${file} validation failed:`);
      console.error(err.message || err);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

lintWgsl().catch(console.error);
