/// src/geometry/Grid.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * Configuration options for grid geometry.
 */
export interface GridOptions {
  /** The total size of the grid. Defaults to 20. */
  size?: number;
  /** The number of divisions. Defaults to 20. */
  divisions?: number;
}

/**
 * A grid geometry.
 */
export class Grid extends AbstractGeometry {
  /** The total size of the grid. */
  public size: number;
  /** The number of divisions. */
  public divisions: number;

  /**
   * Creates a new Grid geometry.
   * @param options The configuration options for the grid.
   */
  constructor(options: GridOptions = {}) {
    super();
    const { size = 20, divisions = 20 } = options;
    this.size = size;
    this.divisions = divisions;
    this._isLineGeometry = true;
    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const i: number[] = [];
    const step: number = this.size / this.divisions;
    const half: number = this.size / 2;
    let index: number = 0;

    for (let j: number = 0; j <= this.divisions; j++) {
      const pos: number = j * step - half;
      const ratio: number = j / this.divisions;

      // Vertical line
      v.push(pos, 0, -half, pos, 0, half);
      uv.push(ratio, 0, ratio, 1);
      i.push(index, index + 1);
      index += 2;

      // Horizontal line
      v.push(-half, 0, pos, half, 0, pos);
      uv.push(0, ratio, 1, ratio);
      i.push(index, index + 1);
      index += 2;
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = this._createIndexArray(i.length);
    this._indices.set(i);
  }
}
