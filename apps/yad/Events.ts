/**
 * Event names YAD dispatches on the shared `EventDispatcherImpl` bus, used to
 * decouple gameplay logic (YadController) from presentation (YadHud).
 */
export const Events = {
  DAMAGE: "app:yad:damage",
  PICKUP: "app:yad:pickup",
  SHOOT: "app:yad:shoot",
  WEAPON: "app:yad:weapon",
  GAME_OVER: "app:yad:gameOver",
} as const;
