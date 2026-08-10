export enum CellType {
  WALL = 0,
  FLOOR = 1,
  RAMP_UP_N = 2,
  RAMP_UP_E = 3,
  RAMP_UP_S = 4,
  RAMP_UP_W = 5,
  HOLE = 6,
  /** A wall cell rendered as a load-bearing Frostglass panel instead of solid structure. */
  WALL_FROSTGLASS = 7,
  /** A walkable floor cell that shortens the route to somewhere already reachable the
   *  long way around -- Maze Flow's real route choice, rendered with a distinct cyan
   *  seam instead of the ordinary violet one. */
  FLOOR_SHORTCUT = 8,
}
