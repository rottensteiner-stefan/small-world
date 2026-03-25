/// src/geometry/Grid.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A grid geometry.
 */
export class Grid extends AbstractGeometry {
  /**
   * Creates a new Grid geometry.
   * @param size The total size of the grid.
   * @param divisions The number of divisions.
   */
  constructor(
    public size: number = 20,
    public divisions: number = 20,
  ) {
    super();
    this.generateGeometryData();
  }

  /**
   * @inheritdoc
   */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const i: number[] = [];
    const step: number = this.size / this.divisions;
    const half: number = this.size / 2;
    let index: number = 0;

    for (let j = 0; j <= this.divisions; j++) {
      const pos: number = j * step - half;
      const ratio: number = j / this.divisions;

      v.push(pos, 0, -half, pos, 0, half);
      uv.push(ratio, 0, ratio, 1);
      i.push(index, index + 1);
      index += 2;

      v.push(-half, 0, pos, half, 0, pos);
      uv.push(0, ratio, 1, ratio);
      i.push(index, index + 1);
      index += 2;
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint16Array(i);
  }
}
