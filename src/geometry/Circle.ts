export class Circle {
  constructor(
    public radius: number = 1,
    public segments: number = 32,
  ) {}

  getPrimitiveData() {
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < this.segments; i++) {
      const theta = (i / this.segments) * Math.PI * 2;
      const x = Math.cos(theta) * this.radius;
      const z = Math.sin(theta) * this.radius;

      vertices.push(x, 0, z);

      // Verbinde diesen Punkt mit dem nächsten
      indices.push(i, (i + 1) % this.segments);
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }
}
