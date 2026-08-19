export enum CellType {
  WALL = 0,
  FLOOR = 1,
  /** Spawn point for the player -- exactly one per generated maze. */
  SPAWN = 2,
  /** Marks a cell where an enemy can be placed by the spawner. */
  ENEMY_SPAWN = 3,
  /** Pickup collectible (power-up, integrity restore). */
  PICKUP = 4,
}
