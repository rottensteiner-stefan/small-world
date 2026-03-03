export class Cube {
  constructor(public s = 1) {}
  getPrimitiveData() {
    const h = this.s / 2;
    return {
      vertices: new Float32Array([
        -h,
        -h,
        h,
        h,
        -h,
        h,
        h,
        h,
        h,
        -h,
        h,
        h,
        -h,
        -h,
        -h,
        h,
        -h,
        -h,
        h,
        h,
        -h,
        -h,
        h,
        -h,
      ]),
      indices: new Uint16Array([
        0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
      ]),
    };
  }
}
