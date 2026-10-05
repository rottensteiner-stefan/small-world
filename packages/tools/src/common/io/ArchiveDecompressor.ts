import { unzip, unzipSync, gunzipSync } from "fflate";
import { SecurityValidator } from "./Security.js";
import type { IngestFileItem } from "./UniversalIngestTypes.js";

export class ArchiveDecompressor {
  private readonly _security: SecurityValidator;

  constructor(security?: SecurityValidator) {
    this._security = security ?? new SecurityValidator();
  }

  /**
   * Decompresses a GZ or TGZ blob/buffer.
   */
  public async decompressGzip(
    buffer: Uint8Array | ArrayBuffer | Blob,
    filename: string,
  ): Promise<IngestFileItem> {
    let bytes: Uint8Array;
    if (buffer instanceof Blob) {
      bytes = new Uint8Array(await buffer.arrayBuffer());
    } else if (buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(buffer);
    } else {
      bytes = buffer;
    }

    let decompressed: Uint8Array;

    if (typeof DecompressionStream !== "undefined") {
      try {
        const stream = new Blob([bytes as BlobPart])
          .stream()
          .pipeThrough(new DecompressionStream("gzip"));
        const response = new Response(stream);
        decompressed = new Uint8Array(await response.arrayBuffer());
      } catch {
        // Fallback to fflate
        decompressed = gunzipSync(bytes);
      }
    } else {
      decompressed = gunzipSync(bytes);
    }

    const uncompressedName = filename.replace(/\.gz$/i, "") || "uncompressed_file";
    const mimeType = this._guessMimeType(uncompressedName);

    return {
      name: uncompressedName,
      path: uncompressedName,
      size: decompressed.byteLength,
      mimeType,
      data: decompressed,
      blob: new Blob([decompressed as BlobPart], { type: mimeType }),
    };
  }

  /**
   * Unpacks a ZIP archive into a list of sanitized IngestFileItem entries.
   */
  public async unpackZip(buffer: Uint8Array | ArrayBuffer | Blob): Promise<IngestFileItem[]> {
    let bytes: Uint8Array;
    if (buffer instanceof Blob) {
      bytes = new Uint8Array(await buffer.arrayBuffer());
    } else if (buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(buffer);
    } else {
      bytes = buffer;
    }

    const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
      unzip(bytes, (err, data) => {
        if (err) {
          try {
            resolve(unzipSync(bytes));
          } catch {
            reject(new Error(`Failed to decompress ZIP archive: ${err.message}`));
          }
          return;
        }
        resolve(data);
      });
    });

    const items: IngestFileItem[] = [];

    for (const [rawPath, data] of Object.entries(unzipped)) {
      if (rawPath.endsWith("/")) continue;

      const pathValidation = this._security.validatePath(rawPath);
      if (!pathValidation.valid) {
        console.warn(
          `[ArchiveDecompressor] Skipping unsafe entry '${rawPath}': ${pathValidation.reason}`,
        );
        continue;
      }

      const cleanPath = this._security.sanitizePath(rawPath);
      if (!cleanPath) continue;

      const filename = cleanPath.split("/").pop() || cleanPath;
      const mimeType = this._guessMimeType(filename);

      items.push({
        name: filename,
        path: cleanPath,
        size: data.byteLength,
        mimeType,
        data,
        blob: new Blob([data as BlobPart], { type: mimeType }),
      });
    }

    return items;
  }

  private _guessMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "webp":
        return "image/webp";
      case "svg":
        return "image/svg+xml";
      case "gltf":
        return "model/gltf+json";
      case "glb":
        return "model/gltf-binary";
      case "json":
        return "application/json";
      case "bin":
        return "application/octet-stream";
      case "wav":
        return "audio/wav";
      case "mp3":
        return "audio/mpeg";
      case "ogg":
        return "audio/ogg";
      default:
        return "application/octet-stream";
    }
  }
}
