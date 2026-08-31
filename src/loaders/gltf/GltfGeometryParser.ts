import { GltfJson } from "./types.js";
import { GltfBinaryParser } from "./GltfBinaryParser.js";
import { GeometryDataInterface } from "../../interfaces/index.js";
import { ModelGeometry } from "../../geometry/index.js";

/**
 * Parser for glTF primitive vertex attributes and index buffers into ModelGeometry.
 */
export class GltfGeometryParser {
  /**
   * Converts a glTF mesh primitive into GeometryDataInterface.
   */
  public static parseGeometry(
    primitive: NonNullable<NonNullable<GltfJson["meshes"]>[number]["primitives"]>[number],
    json: GltfJson,
    buffers: ArrayBuffer[],
  ): GeometryDataInterface | null {
    const attributes = primitive.attributes;
    if (!attributes || attributes["POSITION"] === undefined || !json.accessors) return null;

    const positions = GltfBinaryParser.getBufferData(
      json.accessors[attributes["POSITION"]],
      json,
      buffers,
    );
    if (!positions) return null;

    const normals =
      attributes["NORMAL"] !== undefined
        ? GltfBinaryParser.getBufferData(json.accessors[attributes["NORMAL"]], json, buffers)
        : undefined;
    const uvs =
      attributes["TEXCOORD_0"] !== undefined
        ? GltfBinaryParser.getBufferData(json.accessors[attributes["TEXCOORD_0"]], json, buffers)
        : undefined;
    const indices =
      primitive.indices !== undefined
        ? GltfBinaryParser.getBufferData(json.accessors[primitive.indices], json, buffers)
        : undefined;
    const joints =
      attributes["JOINTS_0"] !== undefined
        ? GltfBinaryParser.getBufferData(json.accessors[attributes["JOINTS_0"]], json, buffers)
        : undefined;
    const weights =
      attributes["WEIGHTS_0"] !== undefined
        ? GltfBinaryParser.getBufferData(json.accessors[attributes["WEIGHTS_0"]], json, buffers)
        : undefined;

    return new ModelGeometry(
      positions as Float32Array,
      uvs ? (uvs as Float32Array) : new Float32Array(0),
      normals ? (normals as Float32Array) : new Float32Array(0),
      indices ? (indices as Uint16Array | Uint32Array) : new Uint16Array(0),
      joints || weights
        ? {
            joints: joints ? (joints as Float32Array | Uint16Array) : undefined,
            weights: weights ? (weights as Float32Array) : undefined,
          }
        : undefined,
    ).getGeometryData();
  }
}
