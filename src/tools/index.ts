export * from "./IBLShaders.js";
export * from "./ibl-gen.js";
export * from "./forge/ForgeTool.js";
export * from "./procgen/index.js";

// MaterialStudio, MapGenerator, Pixler, Xtractor, and Forge are intentionally NOT re-exported here:
// SmallWorld.ts lazy-loads them via dynamic import() so they don't bloat every consumer's bundle.
// Re-exporting them from this barrel would statically pull them back in, defeating that split --
// import them directly from their own module path if you need them outside SmallWorld.
