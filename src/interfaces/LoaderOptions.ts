/// src/interfaces/LoaderOptions.ts

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
