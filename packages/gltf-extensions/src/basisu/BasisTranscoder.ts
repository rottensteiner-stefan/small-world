import { Texture } from "@small-world/engine";

export interface BasisTranscodeOptions {
  format?: "rgba8" | "bc7" | "astc" | "etc2" | "dxt";
  mipmaps?: boolean;
}

export type BasisTranscodeHandler = (
  buffer: ArrayBuffer,
  mimeType?: string,
  options?: BasisTranscodeOptions,
) => Promise<Texture> | Texture;

export interface BasisTranscoderConfig {
  transcoderPath?: string;
  workerLimit?: number;
}

/**
 * BasisTranscoder handles KTX2 / Basis Universal compressed texture transcoding.
 * Third-party applications or WASM workers (e.g. basis_universal transcoder)
 * can register a custom transcoder via `BasisTranscoder.setTranscodeHandler(handler)`
 * or configure WASM worker paths via `BasisTranscoder.setConfig(config)`.
 */
export class BasisTranscoder {
  private static _config: BasisTranscoderConfig = {};
  private static _customHandler: BasisTranscodeHandler | null = null;

  /**
   * Configures transcoder paths and options.
   */
  public static setConfig(config: BasisTranscoderConfig): void {
    this._config = { ...this._config, ...config };
  }

  /**
   * Returns current transcoder configuration.
   */
  public static getConfig(): Readonly<BasisTranscoderConfig> {
    return this._config;
  }

  /**
   * Sets a custom transcode handler (e.g. WebAssembly basis_universal worker).
   */
  public static setTranscodeHandler(handler: BasisTranscodeHandler | null): void {
    this._customHandler = handler;
  }

  /**
   * Transcodes a Basis Universal or KTX2 buffer into a Small World Texture.
   */
  public static async transcode(
    buffer: ArrayBuffer,
    mimeType: string = "image/ktx2",
    options?: BasisTranscodeOptions,
  ): Promise<Texture> {
    if (this._customHandler) {
      return this._customHandler(buffer, mimeType, options);
    }

    // Default container inspection
    if (buffer.byteLength >= 12) {
      const view = new DataView(buffer);
      // KTX2 Identifier: «KTX 20»\r\n\x1A\n (0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A)
      const isKtx2 =
        view.getUint8(0) === 0xab &&
        view.getUint8(1) === 0x4b &&
        view.getUint8(2) === 0x54 &&
        view.getUint8(3) === 0x58 &&
        view.getUint8(4) === 0x20 &&
        view.getUint8(5) === 0x32 &&
        view.getUint8(6) === 0x30 &&
        view.getUint8(7) === 0xbb;

      if (!isKtx2) {
        // If not a raw KTX2 bitstream, try creating a Blob/Image URL for standard supported image blobs
        const blob = new Blob([buffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        try {
          return await Texture.fromUrl(url);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    }

    throw new Error(
      "[BasisTranscoder] No WASM or custom transcoder handler registered for KTX2/Basis Universal textures. " +
        "Call BasisTranscoder.setTranscodeHandler(handler) or configure BasisTranscoder.setConfig().",
    );
  }
}
