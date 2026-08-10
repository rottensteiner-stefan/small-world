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
      this._addShortcut(f);
    }

    for (let f = 0; f < this.floors - 1; f++) {
      this._addRamps(f, 3);
    }

    // Floor 0 is the true bottom -- nothing exists below it, so its voids stay a pure,
    // unrecoverable hazard. Floors above have a floor below them to catch onto, so their
    // voids are where the Controller's Void Catch skill move actually matters.
    this._addVoidZones(0, 15);
    for (let f = 1; f < this.floors; f++) {
      this._addVoidZones(f, 10);
    }

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

  /**
   * Maze Flow's real route choice: knocks down the single wall whose removal saves
   * the most path length between two already-carved FLOOR cells, turning this perfect
   * (loop-free) maze into one with a genuine shortcut -- the original long way around
   * stays intact and ordinarily lit, while the new opening becomes a
   * `CellType.FLOOR_SHORTCUT` flanked by Frostglass where possible. "Risky" here means
   * dim and see-through rather than brightly lit, not mechanically more dangerous.
   */
  private _addShortcut(f: number): void {
    interface Candidate {
      wallX: number;
      wallZ: number;
      ax: number;
      az: number;
      bx: number;
      bz: number;
    }
    const candidates: Candidate[] = [];

    for (let z = 1; z < this.depth - 1; z++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[f]![z]![x] !== CellType.FLOOR) continue;

        if (
          x + 2 < this.width - 1 &&
          this.grid[f]![z]![x + 1] === CellType.WALL &&
          this.grid[f]![z]![x + 2] === CellType.FLOOR
        ) {
          candidates.push({ wallX: x + 1, wallZ: z, ax: x, az: z, bx: x + 2, bz: z });
        }
        if (
          z + 2 < this.depth - 1 &&
          this.grid[f]![z + 1]![x] === CellType.WALL &&
          this.grid[f]![z + 2]![x] === CellType.FLOOR
        ) {
          candidates.push({ wallX: x, wallZ: z + 1, ax: x, az: z, bx: x, bz: z + 2 });
        }
      }
    }

    let best: Candidate | undefined;
    let bestDistance = -1;
    for (const c of candidates) {
      const distance = this._floorPathLength(f, c.ax, c.az, c.bx, c.bz);
      if (distance > bestDistance) {
        bestDistance = distance;
        best = c;
      }
    }
    if (!best) return;

    this.grid[f]![best.wallZ]![best.wallX] = CellType.FLOOR_SHORTCUT;

    const isHorizontal = best.az === best.bz;
    const flanks: [number, number][] = isHorizontal
      ? [
          [best.wallX, best.wallZ - 1],
          [best.wallX, best.wallZ + 1],
        ]
      : [
          [best.wallX - 1, best.wallZ],
          [best.wallX + 1, best.wallZ],
        ];
    for (const [fx, fz] of flanks) {
      if (
        fx > 0 &&
        fx < this.width - 1 &&
        fz > 0 &&
        fz < this.depth - 1 &&
        this.grid[f]![fz]![fx] === CellType.WALL
      ) {
        this.grid[f]![fz]![fx] = CellType.WALL_FROSTGLASS;
      }
    }
  }

  /**
   * BFS shortest path length (in cells), walking only through existing FLOOR cells on
   * floor f -- used by _addShortcut to find the wall whose removal saves the most
   * distance. Returns -1 if no such path exists yet (shouldn't happen once carved).
   */
  private _floorPathLength(f: number, ax: number, az: number, bx: number, bz: number): number {
    const key = (x: number, z: number): number => z * this.width + x;
    const visited = new Set<number>([key(ax, az)]);
    const queue: [number, number, number][] = [[ax, az, 0]];
    let head = 0;

    while (head < queue.length) {
      const [x, z, distance] = queue[head]!;
      head++;
      if (x === bx && z === bz) return distance;

      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx!;
        const nz = z + dz!;
        if (nx < 0 || nx >= this.width || nz < 0 || nz >= this.depth) continue;
        if (this.grid[f]![nz]![nx] !== CellType.FLOOR) continue;
        const k = key(nx, nz);
        if (visited.has(k)) continue;
        visited.add(k);
        queue.push([nx, nz, distance + 1]);
      }
    }
    return -1;
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

  /**
   * A real goal: the top floor's first FLOOR cell scanning from the opposite corner to
   * getSpawnPoint's scan, so it tends to land far from where the player started without
   * needing full multi-floor pathfinding through ramps.
   */
  public getExfilPoint(scale: number, height: number): Vector3D {
    const topFloor = this.floors - 1;
    for (let z = this.depth - 2; z >= 1; z--) {
      for (let x = this.width - 2; x >= 1; x--) {
        if (this.grid[topFloor]![z]![x] === CellType.FLOOR) {
          return new Vector3D(x * scale, topFloor * height + 1.6, -z * scale);
        }
      }
    }
    return new Vector3D(0, topFloor * height + 1.6, 0);
  }
}
