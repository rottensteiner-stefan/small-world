/// src/enums/MaterialType.ts

/**
 * Types of materials.
 */
export const MaterialType = {
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
  /** Specialized animated lava material. */
  LAVA: "LavaMaterial",
} as const;

/** Type definition for MaterialType. */
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];
