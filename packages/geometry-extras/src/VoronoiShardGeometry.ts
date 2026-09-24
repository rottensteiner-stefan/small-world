import { AbstractGeometry } from "@small-world/engine";
import { Vec3Like } from "./Vec3Like.js";

/**
 * A single, already-clipped convex cell (as produced by `computeCellFaces()`)
 * rendered as its own standalone geometry -- the single-cell counterpart to
 * `VoronoiCells`, which always merges every cell into one combined mesh.
 * Intended for anything that needs each cell as a separate object (e.g. a
 * physics fracture shard), not just a single "draw the whole diagram" mesh.
 */
export class VoronoiShardGeometry extends AbstractGeometry {
  /** The cell's faces, as passed to the constructor. */
  public readonly faces: readonly (readonly Vec3Like[])[];

  /**
   * Creates a new VoronoiShardGeometry.
   * @param faces The cell's CCW-outward-wound faces (e.g. from `computeCellFaces()`).
   */
  constructor(faces: readonly (readonly Vec3Like[])[]) {
    super();
    this.faces = faces;
    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const idx: number[] = [];

    for (const face of this.faces) {
      const base: number = v.length / 3;
      for (const p of face) v.push(p.x, p.y, p.z);
      for (let k: number = 1; k < face.length - 1; k++) {
        idx.push(base, base + k, base + k + 1);
      }
    }

    this._vertices = new Float32Array(v);
    this._indices = this._createIndexArray(idx.length);
    this._indices.set(idx);
    this.computeNormals();
  }
}
