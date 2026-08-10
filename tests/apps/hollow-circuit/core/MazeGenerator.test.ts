import { MazeGenerator } from "../../../../src/apps/hollow-circuit/core/MazeGenerator.js";
import { CellType } from "../../../../src/apps/hollow-circuit/enums/CellType.js";

describe("MazeGenerator", () => {
  it("adds at least one FLOOR_SHORTCUT cell per floor to create a real route choice", () => {
    const maze = new MazeGenerator(15, 15, 2);
    maze.generate();

    for (let f = 0; f < maze.floors; f++) {
      let shortcutCount = 0;
      for (let z = 0; z < maze.depth; z++) {
        for (let x = 0; x < maze.width; x++) {
          if (maze.grid[f]![z]![x] === CellType.FLOOR_SHORTCUT) shortcutCount++;
        }
      }
      expect(shortcutCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("flanks at least some shortcuts with Frostglass panels across multiple maze generations", () => {
    // Carving is randomized, so a single maze's shortcut might happen to land where both
    // flanking cells are already floor -- run several independent generations instead of
    // asserting a guaranteed-every-time property that isn't actually guaranteed.
    let sawFrostglassFlank = false;

    for (let attempt = 0; attempt < 20 && !sawFrostglassFlank; attempt++) {
      const maze = new MazeGenerator(15, 15, 1);
      maze.generate();

      for (let z = 1; z < maze.depth - 1; z++) {
        for (let x = 1; x < maze.width - 1; x++) {
          if (maze.grid[0]![z]![x] !== CellType.FLOOR_SHORTCUT) continue;
          if (
            maze.grid[0]![z - 1]![x] === CellType.WALL_FROSTGLASS ||
            maze.grid[0]![z + 1]![x] === CellType.WALL_FROSTGLASS ||
            maze.grid[0]![z]![x - 1] === CellType.WALL_FROSTGLASS ||
            maze.grid[0]![z]![x + 1] === CellType.WALL_FROSTGLASS
          ) {
            sawFrostglassFlank = true;
          }
        }
      }
    }

    expect(sawFrostglassFlank).toBe(true);
  });
});
