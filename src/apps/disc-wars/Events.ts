export const Events = {
  DISC_THROWN: "app:discWars:discThrown",
  DISC_BOUNCED: "app:discWars:discBounced",
  DISC_CAUGHT: "app:discWars:discCaught",
  ENEMY_HIT: "app:discWars:enemyHit",
  ENEMY_DEREZZING: "app:discWars:enemyDerezzing",
  PLAYER_HIT: "app:discWars:playerHit",
  PLAYER_DEREZZING: "app:discWars:playerDerezzing",
  INTEGRITY_CHANGED: "app:discWars:integrityChanged",
  INSTANCE_LOST: "app:discWars:instanceLost",
  GAME_OVER: "app:discWars:gameOver",
  MAZE_CLEARED: "app:discWars:mazeCleared",
} as const;

export type DiscWarsEvent = (typeof Events)[keyof typeof Events];
