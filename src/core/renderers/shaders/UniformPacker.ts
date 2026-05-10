import { ShaderPropertyType } from "../../../enums/index.js";
import { ShaderLayout } from "./ShaderDefinition.js";
import { Vector3D, Matrix4 } from "../../../math/index.js";
import { Color } from "../../colors/Color.js";

/**
 * Utility to pack uniform data into a Float32Array based on a layout.
 */
export class UniformPacker {
  /**
   * Packs properties into a buffer.
   * @param layout The shader layout defining the sequence.
   * @param values The actual values to pack.
   * @param bufferSize Minimum size of the resulting buffer in bytes (default 256 for WebGPU alignment).
   * @returns A Float32Array ready for GPU upload.
   */
  public static pack(
    layout: ShaderLayout,
    values: Record<string, unknown>,
    bufferSize: number = 256
  ): Float32Array {
    const data = new Float32Array(bufferSize / 4);
    if (!layout.uniformLayout) return data;

    let offset = 0; // in floats (4 bytes each)

    for (const name of layout.uniformLayout) {
      const meta = layout.uniforms[name];
      if (!meta) continue;

      const val = values[name] ?? meta.defaultValue;
      
      // Ensure Alignment
      const alignment = this._getTypeAlignment(meta.type);
      if (offset % alignment !== 0) {
          offset += (alignment - (offset % alignment));
      }

      if (val === undefined) {
          offset += this._getTypeSize(meta.type);
          continue;
      }

      switch (meta.type) {
        case ShaderPropertyType.FLOAT:
          data[offset] = val as number;
          offset += 1;
          break;
        case ShaderPropertyType.VEC2:
          if (Array.isArray(val) || val instanceof Float32Array) {
            data[offset] = (val as number[])[0]!;
            data[offset + 1] = (val as number[])[1]!;
          }
          offset += 2;
          break;
        case ShaderPropertyType.VEC3:
          if (val instanceof Vector3D) {
            data[offset] = val.x;
            data[offset + 1] = val.y;
            data[offset + 2] = val.z;
          } else if (Array.isArray(val) || val instanceof Float32Array) {
            data[offset] = (val as number[])[0]!;
            data[offset + 1] = (val as number[])[1]!;
            data[offset + 2] = (val as number[])[2]!;
          }
          offset += 3; 
          break;
        case ShaderPropertyType.VEC4:
        case ShaderPropertyType.COLOR:
          if (val instanceof Color) {
            data.set(val.toFloat32Array(), offset);
          } else if (Array.isArray(val) || val instanceof Float32Array) {
            data.set(val as Float32Array, offset);
          }
          offset += 4;
          break;
        case ShaderPropertyType.MAT4:
          if (val instanceof Matrix4) {
            data.set(val.data, offset);
          } else if (val instanceof Float32Array) {
            data.set(val, offset);
          }
          offset += 16;
          break;
      }
    }

    return data;
  }

  private static _getTypeSize(type: ShaderPropertyType): number {
    switch (type) {
      case ShaderPropertyType.FLOAT: return 1;
      case ShaderPropertyType.VEC2: return 2;
      case ShaderPropertyType.VEC3: return 3;
      case ShaderPropertyType.VEC4: return 4;
      case ShaderPropertyType.COLOR: return 4;
      case ShaderPropertyType.MAT4: return 16;
      default: return 0;
    }
  }

  private static _getTypeAlignment(type: ShaderPropertyType): number {
    switch (type) {
      case ShaderPropertyType.FLOAT: return 1;
      case ShaderPropertyType.VEC2: return 2;
      case ShaderPropertyType.VEC3: return 4; // 16 bytes alignment for vec3
      case ShaderPropertyType.VEC4: return 4; // 16 bytes
      case ShaderPropertyType.COLOR: return 4; // 16 bytes
      case ShaderPropertyType.MAT4: return 16; // 64 bytes
      default: return 1;
    }
  }
}
