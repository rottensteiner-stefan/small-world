import BasisGlue from "../../vendor/basis/basis_transcoder.js?raw";
import basisWasmUrl from "../../vendor/basis/basis_transcoder.wasm?url";
import { BASIS_FORMAT_RGBA32, BasisDecodeResult, BasisModule, KTX2File } from "./basisTypes.js";

export interface BasisWasmConfig {
  /** Optional alternate .wasm bytes to load instead of the vendored copy. */
  wasmBinary?: ArrayBuffer;
}

/**
 * Loads the vendored official Basis Universal WebAssembly transcoder and uses it
 * to inflate + transcode `KHR_texture_basisu` KTX2 payloads to RGBA8. The WASM
 * module is instantiated exactly once per context and reused across transcode
 * calls. This deliberately delegates the (very intricate) ETC1S/UASTC decoding
 * to the official binary instead of re-implementing it.
 */
export class BasisWasmTranscoder {
  private static _modulePromise: Promise<BasisModule> | null = null;
  private static _wasmBinary: ArrayBuffer | null = null;

  /**
   * Returns the initialized transcode module, loading + instantiating the WASM
   * on first use. Safe to call concurrently; the promise is cached.
   */
  public static async getModule(config?: BasisWasmConfig): Promise<BasisModule> {
    const override = config?.wasmBinary;
    const rebuild = override !== undefined && override !== this._wasmBinary;
    if (rebuild) {
      this._modulePromise = null;
      this._wasmBinary = override;
    }
    if (!this._modulePromise) {
      this._modulePromise = this._initModule(config);
    }
    return this._modulePromise;
  }

  private static async _initModule(config?: BasisWasmConfig): Promise<BasisModule> {
    // The vendored file is an Emscripten factory: strip the trailing CJS/AMD
    // export footer (this project is ESM) and invoke the remaining expression
    // to obtain the module factory function. The glue's Node branch calls
    // `require("fs")/require("path")` only to *build* lazy binary-load closures;
    // those are never invoked because `wasmBinary` is always supplied, so a
    // minimal stub is injected instead of a real CommonJS loader.
    const factorySource = BasisGlue.replace(/if \(typeof exports === 'object'[\s\S]*$/, "");
    // trusted vendored source
    const factory = new Function("require", "__dirname", `${factorySource}\n;return BASIS;`)(
      (id: string): Record<string, unknown> =>
        id === "fs"
          ? { readFileSync: (): void => void 0, statSync: (): void => void 0 }
          : id === "path"
            ? {
                normalize: (p: string): string => p,
                join: (...parts: string[]): string => parts.join("/"),
              }
            : {},
      "",
    ) as (opts: Record<string, unknown>) => unknown;

    const wasmBinary = config?.wasmBinary ?? (await this._loadVendoredWasm());

    const module = await new Promise<BasisModule>((resolve, reject) => {
      try {
        const instance = factory({
          wasmBinary,
          onRuntimeInitialized: () => resolve(instance),
        }) as BasisModule;
      } catch (err) {
        reject(err as Error);
      }
    });

    module.initializeBasis();
    return module;
  }

  private static async _loadVendoredWasm(): Promise<ArrayBuffer> {
    const res = await fetch(basisWasmUrl);
    if (!res.ok) {
      throw new Error(
        `[BasisWasmTranscoder] Failed to load vendored basis_transcoder.wasm (${res.status})`,
      );
    }
    return res.arrayBuffer();
  }

  /**
   * Transcodes every mip level of the given KTX2 buffer to RGBA8 planes.
   * @param ktx2 The raw KTX2 file bytes (Basis Universal supercompressed).
   * @param config Optional override (e.g. explicit WASM bytes for tests).
   * @returns Decoded RGBA8 planes for all mips/faces/layers.
   */
  public static async transcode(
    ktx2: Uint8Array,
    config?: BasisWasmConfig,
  ): Promise<BasisDecodeResult> {
    const module = await this.getModule(config);
    const file: KTX2File = new module.KTX2File(ktx2);

    try {
      if (!file.isETC1S() && !file.isUASTC()) {
        throw new Error(
          "[BasisWasmTranscoder] KTX2 uses an unsupported basis encoding (expected ETC1S or UASTC)",
        );
      }

      // `isValid()` is a no-op stub in the vendored build, so a failed
      // `startTranscoding()` is the authoritative signal for an unreadable file.
      if (!file.startTranscoding()) {
        throw new Error("[BasisWasmTranscoder] Invalid or unsupported .ktx2 file");
      }

      const width = file.getWidth();
      const height = file.getHeight();
      const levelCount = file.getLevels();
      const layerCount = file.getLayers() || 1;
      const faceCount = file.getFaces();

      const images: BasisDecodeResult["images"] = [];
      const format = BASIS_FORMAT_RGBA32;

      for (let level = 0; level < levelCount; level++) {
        for (let layer = 0; layer < layerCount; layer++) {
          for (let face = 0; face < faceCount; face++) {
            const levelInfo = file.getImageLevelInfo(level, layer, face);
            const byteLength = file.getImageTranscodedSizeInBytes(level, layer, face, format);
            const rgba = new Uint8Array(byteLength);
            const ok = file.transcodeImage(rgba, level, layer, face, format, 0, -1, -1);
            if (!ok) {
              throw new Error(
                `[BasisWasmTranscoder] .transcodeImage failed (level ${level}, layer ${layer}, face ${face})`,
              );
            }
            images.push({
              mipLevel: level,
              width: levelInfo.origWidth,
              height: levelInfo.origHeight,
              rgba,
            });
          }
        }
      }

      return { width, height, images };
    } finally {
      file.close();
    }
  }
}
