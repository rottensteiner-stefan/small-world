/**
 * Types of materials.
 */
export const MaterialType = {
  /** Material for open water rendering with Gerstner waves. */
  OPEN_WATER: "OpenWaterMaterial",
  /** Unlit basic material. */
  BASIC: "BasicMaterial",
  /** Lambertian diffuse material. */
  LAMBERT: "LambertMaterial",
  /** Phong specular material. */
  PHONG: "PhongMaterial",
  /** Material for skyboxes. */
  SKYBOX: "SkyboxMaterial",
  /** Specialized terrain material. */
  TERRAIN: "TerrainMaterial",
  /** Physically based rendering material. */
  STANDARD: "StandardMaterial",
  /** Material for wireframe rendering. */
  WIREFRAME: "WireframeMaterial",
  /** Material for sprites. */
  SPRITE: "SpriteMaterial",
  /** Special triplanar mapping material for seamless tiling. */
  WORLD: "WorldMaterial",
  /** Specialized material for fluid surfaces with depth fade. */
  FLUID_SURFACE: "FluidSurfaceMaterial",
  /** Depth material for shadow mapping. */
  DEPTH: "DepthMaterial",
  /** Physically based rendering material with transmission/refraction. */
  GLASS: "GlassMaterial",
  /** Heavy blurred transmission material for Neon Labyrinth. */
  FROSTGLASS: "FrostglassMaterial",
  /** Specialized screen shader with retro TV and early film effects. */
  RETRO_SCREEN: "RetroScreenMaterial",
} as const;

/** Type definition for MaterialType. */
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];
