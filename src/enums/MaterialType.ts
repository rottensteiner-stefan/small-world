export const MaterialType = {
  BASIC: "BasicMaterial",
  LAMBERT: "LambertMaterial",
  PHONG: "PhongMaterial",
  SKYBOX: "SkyboxMaterial",
  TERRAIN: "TerrainMaterial",
  WIREFRAME: "WireframeMaterial",
} as const;

export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];
