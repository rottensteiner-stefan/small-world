/**
 * Minimal typed view over the Emscripten `basis_transcoder` module exported by
 * `vendor/basis/basis_transcoder.js`. Only the members the transcoder path needs
 * are declared; everything else stays intentionally generic.
 */
export interface BasisModule {
  initializeBasis(): void;
  readonly BasisFile: new (...args: unknown[]) => unknown;
  readonly KTX2File: new (data: Uint8Array) => KTX2File;
  readonly onRuntimeInitialized: unknown;
}

/**
 * Basis Universal transcoder texture format identifiers, matching the official
 * `KTX2Loader.TranscoderFormat` mapping (RGBA32 = 13). These are plain integers
 * passed to `getImageTranscodedSizeInBytes` / `transcodeImage`; the emscripten
 * `transcoder_texture_format` enum object on the module is a class instance and
 * not numerically usable, so the constants are kept as literals here.
 */
export const BASIS_FORMAT_RGBA32 = 13;

/**
 * The `KTX2File` class from the Basis Universal transcoder wrapping a
 * supercompressed KTX2 payload. Instances must be `close()`d after use.
 */
export interface KTX2File {
  isValid(): boolean;
  isUASTC(): boolean;
  isETC1S(): boolean;
  isHDR(): boolean;
  getWidth(): number;
  getHeight(): number;
  getLayers(): number;
  getLevels(): number;
  getFaces(): number;
  getHasAlpha(): boolean;
  startTranscoding(): boolean;
  getImageTranscodedSizeInBytes(level: number, layer: number, face: number, format: number): number;
  transcodeImage(
    dst: Uint8Array,
    level: number,
    layer: number,
    face: number,
    format: number,
    decodeFlags: number,
    x: number,
    y: number,
  ): boolean;
  getDFDFlags(): number;
  getImageLevelInfo(
    level: number,
    layer: number,
    face: number,
  ): { width: number; height: number; origWidth: number; origHeight: number };
  close(): void;
}

/** A decoded RGBA8 image plane for one mip level / layer / face. */
export interface BasisDecodedImage {
  mipLevel: number;
  width: number;
  height: number;
  /** RGBA8 pixel data, tightly packed (4 bytes per texel). */
  rgba: Uint8Array;
}

export interface BasisDecodeResult {
  width: number;
  height: number;
  images: BasisDecodedImage[];
}
