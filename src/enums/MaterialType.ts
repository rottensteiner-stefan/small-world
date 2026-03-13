export const MaterialType = {
  BASIC: "BasicMaterial",
  LAMBERT: "LambertMaterial",
  PHONG: "PhongMaterial",
  SKYBOX: "SkyboxMaterial",
  WIREFRAME: "WireframeMaterial",
} as const;

export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];
