import { CellType } from "../enums/CellType.js";
import { Vector3D } from "../../../math/Vector3D.js";

export class MazeGenerator {
  public grid: CellType[][][] = [];

  constructor(
    public width: number,
    public depth: number,
    public floors: number,
  ) {}

  public generate(): void {
    for (let f = 0; f < this.floors; f++) {
      const floorGrid: CellType[][] = [];
      for (let z = 0; z < this.depth; z++) {
        const row: CellType[] = [];
        for (let x = 0; x < this.width; x++) {
          row.push(CellType.WALL);
        }
        floorGrid.push(row);
      }
      this.grid.push(floorGrid);

      this._carveMaze(f, 1, 1);
    }

    for (let f = 0; f < this.floors - 1; f++) {
      this._addRamps(f, 3);
    }

    this._addVoidZones(0, 15);

    for (let f = 0; f < this.floors; f++) {
      this._addFrostglassPanels(f, 5);
    }
  }

  private _carveMaze(f: number, startX: number, startZ: number): void {
    const dirs = [
      [0, -2],
      [2, 0],
      [0, 2],
      [-2, 0],
    ];
    this.grid[f]![startZ]![startX] = CellType.FLOOR;
    const stack: [number, number][] = [[startX, startZ]];

    while (stack.length > 0) {
      const [x, z] = stack[stack.length - 1]!;

      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j]!, dirs[i]!];
      }

      let carved = false;
      for (const [dx, dz] of dirs) {
        const nx = x + dx!;
        const nz = z + dz!;
        if (nx > 0 && nx < this.width - 1 && nz > 0 && nz < this.depth - 1) {
          if (this.grid[f]![nz]![nx] === CellType.WALL) {
            this.grid[f]![nz]![nx] = CellType.FLOOR;
            this.grid[f]![z + dz! / 2]![x + dx! / 2] = CellType.FLOOR;
            stack.push([nx, nz]);
            carved = true;
            break;
          }
        }
      }

      if (!carved) {
        stack.pop();
      }
    }
  }

  private _addRamps(f: number, maxCount: number): void {
    let count = 0;
    const maxAttempts = 200;
    let attempts = 0;

    while (count < maxCount && attempts < maxAttempts) {
      attempts++;
      const x = 2 + Math.floor(Math.random() * (this.width - 4));
      const z = 2 + Math.floor(Math.random() * (this.depth - 4));

      if (this.grid[f]![z]![x] === CellType.FLOOR && this.grid[f + 1]![z]![x] === CellType.FLOOR) {
        if (
          this.grid[f]![z - 1]![x] === CellType.FLOOR &&
          this.grid[f + 1]![z - 1]![x] === CellType.FLOOR
        ) {
          this.grid[f]![z]![x] = CellType.RAMP_UP_N;
          this.grid[f + 1]![z]![x] = CellType.HOLE;
          count++;
        } else if (
          this.grid[f]![z + 1]![x] === CellType.FLOOR &&
          this.grid[f + 1]![z + 1]![x] === CellType.FLOOR
        ) {
          this.grid[f]![z]![x] = CellType.RAMP_UP_S;
          this.grid[f + 1]![z]![x] = CellType.HOLE;
          count++;
        } else if (
          this.grid[f]![z]![x + 1] === CellType.FLOOR &&
          this.grid[f + 1]![z]![x + 1] === CellType.FLOOR
        ) {
          this.grid[f]![z]![x] = CellType.RAMP_UP_E;
          this.grid[f + 1]![z]![x] = CellType.HOLE;
          count++;
        } else if (
          this.grid[f]![z]![x - 1] === CellType.FLOOR &&
          this.grid[f + 1]![z]![x - 1] === CellType.FLOOR
        ) {
          this.grid[f]![z]![x] = CellType.RAMP_UP_W;
          this.grid[f + 1]![z]![x] = CellType.HOLE;
          count++;
        }
      }
    }
  }

  private _addVoidZones(f: number, maxCount: number): void {
    let count = 0;
    for (let i = 0; i < 200; i++) {
      if (count >= maxCount) break;
      const x = 1 + Math.floor(Math.random() * (this.width - 2));
      const z = 1 + Math.floor(Math.random() * (this.depth - 2));
      if (this.grid[f]![z]![x] === CellType.FLOOR) {
        this.grid[f]![z]![x] = CellType.HOLE;
        count++;
      }
    }
  }

  /** Turns a handful of solid WALL cells that border a FLOOR cell into Frostglass panels. */
  private _addFrostglassPanels(f: number, maxCount: number): void {
    let count = 0;
    for (let i = 0; i < 200; i++) {
      if (count >= maxCount) break;
      const x = 1 + Math.floor(Math.random() * (this.width - 2));
      const z = 1 + Math.floor(Math.random() * (this.depth - 2));
      if (this.grid[f]![z]![x] !== CellType.WALL) continue;

      const bordersFloor =
        this.grid[f]![z - 1]![x] === CellType.FLOOR ||
        this.grid[f]![z + 1]![x] === CellType.FLOOR ||
        this.grid[f]![z]![x - 1] === CellType.FLOOR ||
        this.grid[f]![z]![x + 1] === CellType.FLOOR;
      if (!bordersFloor) continue;

      this.grid[f]![z]![x] = CellType.WALL_FROSTGLASS;
      count++;
    }
  }

  public getSpawnPoint(scale: number): Vector3D {
    for (let z = 1; z < this.depth; z++) {
      for (let x = 1; x < this.width; x++) {
        if (this.grid[0]![z]![x] === CellType.FLOOR) {
          return new Vector3D(x * scale, 1.6, -z * scale);
        }
      }
    }
    return new Vector3D(0, 1.6, 0);
  }
}
