import { AssetManager, ProgressCallback } from "./AssetManager.js";

export type ChunkCallback = (chunk: Uint8Array, loaded: number, total: number) => void;

/**
 * Options for streaming binary asset data.
 */
export interface StreamOptions {
  /** Optional callback triggered whenever a new binary chunk arrives. */
  onChunk?: ChunkCallback;
  /** Optional total progress callback. */
  onProgress?: ProgressCallback;
}

/**
 * Handles streaming of large binary assets (DirectStorage adaptation for Web).
 * Reads data incrementally via `ReadableStreamDefaultReader` into transferable buffers.
 */
export class BinaryStreamLoader {
  /**
   * Streams a binary resource chunk-by-chunk and returns the consolidated ArrayBuffer.
   * @param url The resource URL.
   * @param options Streaming callbacks.
   * @returns A promise resolving to the final contiguous ArrayBuffer.
   */
  public static async stream(url: string, options: StreamOptions = {}): Promise<ArrayBuffer> {
    return AssetManager.streamBinary(url, options.onChunk, options.onProgress);
  }
}
