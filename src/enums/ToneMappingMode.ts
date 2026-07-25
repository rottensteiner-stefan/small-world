/**
 * Supported tone mapping algorithms.
 */
export enum ToneMappingMode {
  /** No tone mapping (Linear) */
  NONE = 0,
  /** Reinhard tone mapping */
  REINHARD = 1,
  /** Cineon tone mapping */
  CINEON = 2,
  /** ACES Filmic tone mapping */
  ACES_FILMIC = 3,
}
