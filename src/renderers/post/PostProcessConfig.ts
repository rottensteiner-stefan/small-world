export interface PostProcessConfig {
  /** Enables or disables the entire post-processing pipeline */
  enabled: boolean;

  /** Multiplier for HDR tone mapping (default: 1.0) */
  exposure: number;

  /** Gamma correction value (default: 2.2) */
  gamma: number;

  // We can add Bloom, ColorGrading, Vignette etc. here later
}

export const DefaultPostProcessConfig: PostProcessConfig = {
  enabled: false,
  exposure: 1.0,
  gamma: 2.2,
};
