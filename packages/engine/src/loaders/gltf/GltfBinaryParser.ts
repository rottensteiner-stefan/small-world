import { GltfJson, GltfData, TypedArray } from "./types.js";

/**
 * Utility parser for glTF 2.0 binary chunks (.glb), Base64 data URIs, and buffer accessors.
 */
export class GltfBinaryParser {
  /**
   * Parses a binary .glb container into its JSON description and binary buffer payload.
   */
  public static parseGlb(arrayBuffer: ArrayBuffer): GltfData {
    const dataView = new DataView(arrayBuffer);

    // Check Magic: "glTF" (0x46546c67)
    const magic = dataView.getUint32(0, true);
    if (magic !== 0x46546c67) throw new Error("Not a valid .glb file.");

    const version = dataView.getUint32(4, true);
    if (version !== 2) throw new Error("Only glTF 2.0 is supported.");

    let json: GltfJson | null = null;
    const buffers: ArrayBuffer[] = [];
    let offset = 12;

    while (offset < arrayBuffer.byteLength) {
      const chunkLength = dataView.getUint32(offset, true);
      const chunkType = dataView.getUint32(offset + 4, true);
      offset += 8;

      if (chunkType === 0x4e4f534a) {
        // JSON chunk
        const jsonContent = new TextDecoder().decode(
          new Uint8Array(arrayBuffer, offset, chunkLength),
        );
        json = JSON.parse(jsonContent) as GltfJson;
      } else if (chunkType === 0x004e4942) {
        // BIN chunk
        buffers.push(arrayBuffer.slice(offset, offset + chunkLength));
      }
      offset += chunkLength;
    }

    if (!json) throw new Error("No JSON chunk found in .glb file.");

    return { json, buffers };
  }

  /**
   * Decodes a Base64-encoded Data URI into an ArrayBuffer.
   */
  public static decodeBase64(uri: string): ArrayBuffer {
    const base64 = uri.split(",")[1]!;
    const binaryStr = atob(base64);
    const buffer = new ArrayBuffer(binaryStr.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binaryStr.length; i++) view[i] = binaryStr.charCodeAt(i);
    return buffer;
  }

  /**
   * Extracts a typed array slice from glTF accessors and buffer views.
   */
  public static getBufferData(
    accessor: NonNullable<GltfJson["accessors"]>[number] | undefined,
    json: GltfJson,
    buffers: ArrayBuffer[],
  ): TypedArray | null {
    if (accessor === undefined || accessor.bufferView === undefined || !json.bufferViews)
      return null;
    const bufferView = json.bufferViews[accessor.bufferView];
    if (!bufferView) return null;
    const buffer = buffers[bufferView.buffer];

    if (!buffer) {
      return null;
    }

    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const count = accessor.count * this.getComponentCount(accessor.type);

    switch (accessor.componentType) {
      case 5121:
        return new Uint8Array(buffer, byteOffset, count);
      case 5123:
        return new Uint16Array(buffer, byteOffset, count);
      case 5125:
        return new Uint32Array(buffer, byteOffset, count);
      case 5126:
        return new Float32Array(buffer, byteOffset, count);
      default:
        return null;
    }
  }

  /**
   * Returns the number of scalar components for a glTF accessor type name.
   */
  public static getComponentCount(type: string): number {
    switch (type) {
      case "SCALAR":
        return 1;
      case "VEC2":
        return 2;
      case "VEC3":
        return 3;
      case "VEC4":
        return 4;
      case "MAT4":
        return 16;
      default:
        return 1;
    }
  }
}
