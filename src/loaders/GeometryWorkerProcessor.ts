export interface RawGeometryInput {
  vertices: Float32Array;
  indices?: Uint16Array | Uint32Array;
  normals?: Float32Array;
  tangents?: Float32Array;
  uvs?: Float32Array;
}

export interface ProcessedGeometryOutput extends RawGeometryInput {
  normals: Float32Array;
  tangents: Float32Array;
  uvs: Float32Array;
}

/**
 * High-performance processor for off-main-thread geometry computation
 * (DirectStorage worker staging). Computes normals and tangents asynchronously.
 */
export class GeometryWorkerProcessor {
  /**
   * Computes vertex normals from vertices and optional indices without blocking the main render loop.
   */
  public static computeNormals(
    vertices: Float32Array,
    indices?: Uint16Array | Uint32Array,
  ): Float32Array {
    const normals = new Float32Array(vertices.length);
    const count = indices ? indices.length : vertices.length / 3;

    for (let i = 0; i < count; i += 3) {
      const i1 = indices ? indices[i]! : i;
      const i2 = indices ? indices[i + 1]! : i + 1;
      const i3 = indices ? indices[i + 2]! : i + 2;

      const v1x = vertices[i1 * 3]!;
      const v1y = vertices[i1 * 3 + 1]!;
      const v1z = vertices[i1 * 3 + 2]!;

      const v2x = vertices[i2 * 3]!;
      const v2y = vertices[i2 * 3 + 1]!;
      const v2z = vertices[i2 * 3 + 2]!;

      const v3x = vertices[i3 * 3]!;
      const v3y = vertices[i3 * 3 + 1]!;
      const v3z = vertices[i3 * 3 + 2]!;

      const ax = v2x - v1x;
      const ay = v2y - v1y;
      const az = v2z - v1z;

      const bx = v3x - v1x;
      const by = v3y - v1y;
      const bz = v3z - v1z;

      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;

      normals[i1 * 3]! += nx;
      normals[i1 * 3 + 1]! += ny;
      normals[i1 * 3 + 2]! += nz;

      normals[i2 * 3]! += nx;
      normals[i2 * 3 + 1]! += ny;
      normals[i2 * 3 + 2]! += nz;

      normals[i3 * 3]! += nx;
      normals[i3 * 3 + 1]! += ny;
      normals[i3 * 3 + 2]! += nz;
    }

    // Normalize
    for (let i = 0; i < vertices.length; i += 3) {
      const x = normals[i]!;
      const y = normals[i + 1]!;
      const z = normals[i + 2]!;
      const len = Math.hypot(x, y, z);
      if (len > 0) {
        normals[i] = x / len;
        normals[i + 1] = y / len;
        normals[i + 2] = z / len;
      }
    }

    return normals;
  }

  /**
   * Computes MikkTSpace-style tangent vectors asynchronously.
   */
  public static computeTangents(
    vertices: Float32Array,
    normals: Float32Array,
    uvs: Float32Array,
    indices?: Uint16Array | Uint32Array,
  ): Float32Array {
    const tangents = new Float32Array(vertices.length);
    const tan1 = new Float32Array(vertices.length);
    const tan2 = new Float32Array(vertices.length);

    const triangleCount = indices ? indices.length / 3 : vertices.length / 9;

    for (let i = 0; i < triangleCount; i++) {
      const i1 = indices ? indices[i * 3]! : i * 3;
      const i2 = indices ? indices[i * 3 + 1]! : i * 3 + 1;
      const i3 = indices ? indices[i * 3 + 2]! : i * 3 + 2;

      const v1x = vertices[i1 * 3]!;
      const v1y = vertices[i1 * 3 + 1]!;
      const v1z = vertices[i1 * 3 + 2]!;
      const v2x = vertices[i2 * 3]!;
      const v2y = vertices[i2 * 3 + 1]!;
      const v2z = vertices[i2 * 3 + 2]!;
      const v3x = vertices[i3 * 3]!;
      const v3y = vertices[i3 * 3 + 1]!;
      const v3z = vertices[i3 * 3 + 2]!;

      const w1u = uvs[i1 * 2]!;
      const w1v = uvs[i1 * 2 + 1]!;
      const w2u = uvs[i2 * 2]!;
      const w2v = uvs[i2 * 2 + 1]!;
      const w3u = uvs[i3 * 2]!;
      const w3v = uvs[i3 * 2 + 1]!;

      const x1 = v2x - v1x;
      const x2 = v3x - v1x;
      const y1 = v2y - v1y;
      const y2 = v3y - v1y;
      const z1 = v2z - v1z;
      const z2 = v3z - v1z;

      const s1 = w2u - w1u;
      const s2 = w3u - w1u;
      const t1 = w2v - w1v;
      const t2 = w3v - w1v;

      const div = s1 * t2 - s2 * t1;
      const r = 0 === div ? 0 : 1.0 / div;
      const tx = (t2 * x1 - t1 * x2) * r;
      const ty = (t2 * y1 - t1 * y2) * r;
      const tz = (t2 * z1 - t1 * z2) * r;
      const bx = (s1 * x2 - s2 * x1) * r;
      const by = (s1 * y2 - s2 * y1) * r;
      const bz = (s1 * z2 - s2 * z1) * r;

      tan1[i1 * 3]! += tx;
      tan1[i1 * 3 + 1]! += ty;
      tan1[i1 * 3 + 2]! += tz;
      tan1[i2 * 3]! += tx;
      tan1[i2 * 3 + 1]! += ty;
      tan1[i2 * 3 + 2]! += tz;
      tan1[i3 * 3]! += tx;
      tan1[i3 * 3 + 1]! += ty;
      tan1[i3 * 3 + 2]! += tz;

      tan2[i1 * 3]! += bx;
      tan2[i1 * 3 + 1]! += by;
      tan2[i1 * 3 + 2]! += bz;
      tan2[i2 * 3]! += bx;
      tan2[i2 * 3 + 1]! += by;
      tan2[i2 * 3 + 2]! += bz;
      tan2[i3 * 3]! += bx;
      tan2[i3 * 3 + 1]! += by;
      tan2[i3 * 3 + 2]! += bz;
    }

    const vertexCount = vertices.length / 3;
    for (let i = 0; i < vertexCount; i++) {
      const nx = normals[i * 3]!;
      const ny = normals[i * 3 + 1]!;
      const nz = normals[i * 3 + 2]!;
      const tx = tan1[i * 3]!;
      const ty = tan1[i * 3 + 1]!;
      const tz = tan1[i * 3 + 2]!;

      const dot = nx * tx + ny * ty + nz * tz;
      const otx = tx - nx * dot;
      const oty = ty - ny * dot;
      const otz = tz - nz * dot;
      const len = Math.hypot(otx, oty, otz);

      if (len > 0) {
        tangents[i * 3] = otx / len;
        tangents[i * 3 + 1] = oty / len;
        tangents[i * 3 + 2] = otz / len;
      }
    }

    return tangents;
  }

  /**
   * Processes raw geometry data asynchronously (e.g. preparing for GPU upload).
   */
  public static async processGeometryAsync(
    data: RawGeometryInput,
  ): Promise<ProcessedGeometryOutput> {
    // Non-blocking staging via microtask queue
    return new Promise((resolve) => {
      queueMicrotask(() => {
        let normals = data.normals;
        if (!normals || 0 === normals.length) {
          normals = this.computeNormals(data.vertices, data.indices);
        }

        let tangents = data.tangents;
        let uvs = data.uvs;
        if (!uvs || 0 === uvs.length) {
          uvs = new Float32Array((data.vertices.length / 3) * 2);
        }

        if (!tangents || 0 === tangents.length) {
          tangents = this.computeTangents(data.vertices, normals, uvs, data.indices);
        }

        resolve({
          ...data,
          normals,
          tangents,
          uvs,
        });
      });
    });
  }
}
