export const LightType = {
  AMBIENT: "AmbientLight",
  DIRECTIONAL: "DirectionalLight",
  POINT: "PointLight",
  SPOT: "SpotLight",
  AREA: "AreaLight",
} as const;

export type LightType = (typeof LightType)[keyof typeof LightType];
