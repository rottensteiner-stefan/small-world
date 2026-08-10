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
}
