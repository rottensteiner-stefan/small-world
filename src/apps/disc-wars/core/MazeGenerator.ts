import { CellType } from "../enums/CellType.js";
import { Vector3D } from "../../../math/Vector3D.js";

/** A single-floor, flat 2D grid — DISC WARS doesn't need multi-floor stacking. */
export class MazeGenerator {
  public grid: CellType[][] = [];

  constructor(
    public width: number,
    public depth: number,
  ) {}

  public generate(): void {
    this.grid = [];
    for (let z = 0; z < this.depth; z++) {
      const row: CellType[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push(CellType.WALL);
      }
      this.grid.push(row);
    }

    this._carveMaze(1, 1);
    this._placeSpawn();
    this._placeEnemySpawns(6);
  }

  /** Returns all floor-like cells as world-space XZ positions (Y=0). */
  public getFloorPositions(scale: number): Vector3D[] {
    const out: Vector3D[] = [];
    for (let z = 0; z < this.depth; z++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.grid[z]![x]!;
        if (t !== CellType.WALL) {
          out.push(new Vector3D(x * scale, 0, -z * scale));
        }
      }
    }
    return out;
  }

  public getPlayerSpawn(scale: number): Vector3D {
    for (let z = 0; z < this.depth; z++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[z]![x] === CellType.SPAWN) {
          return new Vector3D(x * scale, 1.8, -z * scale);
        }
      }
    }
    // Should never happen after generate(), but fail fast.
    throw new Error("MazeGenerator: no SPAWN cell found — call generate() first.");
  }

  private _carveMaze(startX: number, startZ: number): void {
    const dirs = [
      [0, -2],
      [2, 0],
      [0, 2],
      [-2, 0],
    ];

    const stack: [number, number][] = [[startX, startZ]];
    this.grid[startZ]![startX] = CellType.FLOOR;

    while (stack.length > 0) {
      const [cx, cz] = stack[stack.length - 1]!;

      // Shuffle directions for random carving.
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j]!, dirs[i]!];
      }

      let moved = false;
      for (const [dx, dz] of dirs) {
        const nx = cx + dx!;
        const nz = cz + dz!;
        if (nx <= 0 || nx >= this.width - 1 || nz <= 0 || nz >= this.depth - 1) continue;
        if (this.grid[nz]![nx] !== CellType.WALL) continue;

        // Carve the passage cell and the wall between.
        this.grid[nz]![nx] = CellType.FLOOR;
        this.grid[cz + dz! / 2]![cx + dx! / 2] = CellType.FLOOR;
        stack.push([nx, nz]);
        moved = true;
        break;
      }

      if (!moved) {
        stack.pop();
      }
    }
  }

  private _placeSpawn(): void {
    // Always start at (1,1) — guaranteed to be carved by _carveMaze.
    this.grid[1]![1] = CellType.SPAWN;
  }

  private _placeEnemySpawns(count: number): void {
    const candidates: [number, number][] = [];
    for (let z = 0; z < this.depth; z++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[z]![x] === CellType.FLOOR) {
          candidates.push([x, z]);
        }
      }
    }

    // Shuffle and pick first N, keeping them away from the player spawn.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
    }

    let placed = 0;
    for (const [x, z] of candidates) {
      if (placed >= count) break;
      const dx = x - 1;
      const dz = z - 1;
      // Keep enemies at least 5 cells from the player spawn.
      if (Math.sqrt(dx * dx + dz * dz) < 5) continue;
      this.grid[z]![x] = CellType.ENEMY_SPAWN;
      placed++;
    }
  }
}
