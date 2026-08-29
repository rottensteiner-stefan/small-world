/**
 * Common configuration options for all resource loaders.
 */
export interface LoaderOptions {
  /** The base path to prepend to all resource URLs. Defaults to "". */
  basePath?: string;
}

/**
 * Specialized configuration options for image loaders.
 */
export interface ImageLoaderOptions extends LoaderOptions {
  /** Whether the image should be flipped vertically during loading/decoding. */
  flipY?: boolean;
}

/**
 * Specialized configuration options for glTF/GLB loaders.
 */
export interface GltfLoaderOptions extends LoaderOptions {
  /** Optional transformation function applied to node names during glTF hierarchy parsing. */
  nodeNameTransform?: (name: string) => string;
  /** Whether to normalize numeric Mixamo rig prefixes (e.g. "mixamorig1:" -> "mixamorig:"). Defaults to false. */
  normalizeMixamoRig?: boolean;
  /** Maximum metallic factor (or [min, max] range) applied to parsed PBR materials. */
  clampMetallic?: number | [number, number];
  /** Maximum roughness factor (or [min, max] range) applied to parsed PBR materials. */
  clampRoughness?: number | [number, number];
  /** Default metallic factor used when a material does not explicitly define one. */
  defaultMetallic?: number;
  /** Default roughness factor used when a material does not explicitly define one. */
  defaultRoughness?: number;
}
