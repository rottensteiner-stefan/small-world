export const AppEvents = {
  Yad: {
    DAMAGE: "app:yad:damage",
    PICKUP: "app:yad:pickup",
    SHOOT: "app:yad:shoot",
    WEAPON: "app:yad:weapon",
    GAME_OVER: "app:yad:gameOver",
  },
} as const;

export type AppEvents = typeof AppEvents;
