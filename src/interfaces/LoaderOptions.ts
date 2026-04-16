/// src/interfaces/LoaderOptions.ts

export interface LoaderOptions {
  /** The base path for resource URLs. */
  basePath?: string;
}

/**
 * Specialized options for image loaders.
 */
export interface ImageLoaderOptions extends LoaderOptions {
  /** Whether the image should be flipped vertically during loading. */
  flipY?: boolean;
}
