/// src/enums/LightType.ts
export const LightType = {
  AMBIENT: "AmbientLight",
  AREA: "AreaLight",
  DIRECTIONAL: "DirectionalLight",
  POINT: "PointLight",
  SPOT: "SpotLight",
} as const;

export type LightType = (typeof LightType)[keyof typeof LightType];
