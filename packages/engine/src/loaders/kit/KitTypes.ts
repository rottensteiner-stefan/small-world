/**
 * A light configuration attached to a prop socket.
 *
 * `type` is intentionally a string so it can accept both the engine class names used in some kits
 * (e.g. industrial/wall_lamp writes `"PointLight"`) and the lowercase spec form (`"point"`).
 */
export interface KitSocketLightConfig {
  type: string;
  color: string;
  intensity: number;
  distance: number;
}

/** A named attachment point on a kit prop (e.g. `FlameGlow`, `BulbLight`). */
export interface KitSocket {
  name: string;
  position: [number, number, number];
  recommendedLight?: KitSocketLightConfig;
}

/** Physical box dimensions of a prop. */
export interface KitDimensions {
  width?: number;
  height: number;
  depth?: number;
  radius?: number;
}

/** The `meta.json` spec sheet living next to a kit prop's `model.glb` (ADR 0011). */
export interface PropMeta {
  id: string;
  name: string;
  category: string;
  kit: string;
  version: string;
  description: string;
  triangles: number;
  materials: number;
  textures: string[];
  dimensions: KitDimensions;
  recommendedScale: number;
  sockets?: KitSocket[];
  hazardClass?: string;
  author: string;
  license: string;
}

/** One item entry in a kit's `kit.json` manifest. */
export interface KitManifestItem {
  id: string;
  name: string;
  category: string;
  hazardClass?: string;
  path: string;
  preview: string;
  meta: string;
}

/** The `kit.json` manifest (ADR 0011). */
export interface KitManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  items: KitManifestItem[];
  author: string;
  license: string;
}

/** Overrides that a level instance can exert over a socket's recommended light. */
export interface SocketLightOverride {
  type?: string;
  color?: string;
  intensity?: number;
  distance?: number;
}

/** Overrides a level instance can exert over a prop's automatic socket light mounting. */
export interface KitPropLightOverrides {
  [socketName: string]: SocketLightOverride | false;
}

/** Material PBR overrides applied after a prop loads (level-instance tuning). */
export interface KitMaterialOverride {
  roughness?: number;
  metallic?: number;
  emissiveIntensity?: number;
  emissiveColor?: string;
}

/** Options controlling one `registry.loadProp` call. */
export interface LoadPropOptions {
  /** Absolute placement override. When omitted, the prop keeps identity transform. */
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Explicit scale override (a scalar or per-axis [x,y,z]). Overrides `recommendedScale`. */
  scale?: number | [number, number, number];
  /** Per-socket light overrides. `false` disables that socket's light entirely. */
  lightOverrides?: KitPropLightOverrides;
  /** Apply `meta.recommendedScale` automatically (default true). */
  applyRecommendedScale?: boolean;
  /** Material-level PBR overrides applied to every material on the prop. */
  materialOverrides?: KitMaterialOverride;
}

/** A loaded kit prop instance with its resolved sockets and lights. */
export interface KitPropInstance {
  /** The loaded glTF root, scaled/placed per options. Add this to a scene. */
  root: import("../../core/Object3D.js").Object3D;
  /** The prop's resolved meta spec. */
  meta: PropMeta;
  /** The socket lights that were mounted (keyed by socket name). */
  lights: Map<string, import("../../core/lights/AbstractLight.js").AbstractLight>;
}

export interface LevelEnvironmentSurface {
  name: string;
  geometry: "cube" | "plane" | "cylinder";
  size?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  material?: {
    textureSet?: string;
    repeat?: [number, number];
    color?: string;
    roughness?: number;
    metallic?: number;
  };
}

export interface LevelPropPlacement {
  id: string;
  kitProp: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  lightOverrides?: KitPropLightOverrides;
  materialOverrides?: KitMaterialOverride;
}

export interface LevelLightDef {
  name: string;
  type: "spot" | "point" | "directional" | "ambient";
  color?: string;
  intensity?: number;
  distance?: number;
  position?: [number, number, number];
  target?: [number, number, number];
  direction?: [number, number, number];
  angle?: number;
  penumbra?: number;
  decay?: number;
}

export interface LevelHotspotDef {
  id: string;
  name: string;
  position: [number, number, number];
  interactionRadius?: number;
  promptText: string;
  monologueTitle?: string;
  monologueText?: string[];
  action?: string;
}

export interface LevelDescriptor {
  id: string;
  name: string;
  version: string;
  description?: string;
  environment?: {
    surfaces?: LevelEnvironmentSurface[];
  };
  props: LevelPropPlacement[];
  lights?: LevelLightDef[];
  hotspots?: LevelHotspotDef[];
  stageZone?: {
    displayName?: string;
    points: Array<{ u: number; v: number; scale?: number }>;
    projection?: { mode: string; width?: number; height?: number; z?: number; centerY?: number };
  };
}

export interface LevelInstance {
  descriptor: LevelDescriptor;
  root: import("../../core/Object3D.js").Object3D;
  props: Map<string, KitPropInstance>;
  lights: Map<string, import("../../core/lights/AbstractLight.js").AbstractLight>;
  hotspots: LevelHotspotDef[];
}
