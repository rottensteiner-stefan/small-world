export class Sphere {
  constructor(
    public r = 1,
    public s = 12,
  ) {}
  getPrimitiveData() {
    const v: number[] = [],
      i: number[] = [];
    for (let y = 0; y <= this.s; y++) {
      const lat = (y * Math.PI) / this.s,
        sinL = Math.sin(lat),
        cosL = Math.cos(lat);
      for (let x = 0; x <= this.s; x++) {
        const lon = (x * 2 * Math.PI) / this.s;
        v.push(Math.cos(lon) * sinL * this.r, cosL * this.r, Math.sin(lon) * sinL * this.r);
      }
    }
    for (let y = 0; y < this.s; y++)
      for (let x = 0; x < this.s; x++) {
        const f = y * (this.s + 1) + x,
          s = f + this.s + 1;
        i.push(f, s, s, s + 1, s + 1, f + 1, f + 1, f);
      }
    return { vertices: new Float32Array(v), indices: new Uint16Array(i) };
  }
}
