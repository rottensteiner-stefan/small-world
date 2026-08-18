/**
 * Event names Neon Labyrinth dispatches on the shared `EventDispatcherImpl` bus,
 * used to decouple gameplay logic (NeonLabyrinthController) from presentation
 * (NeonLabyrinthHud).
 */
export const Events = {
  DISC_COLLECTED: "app:neonLabyrinth:discCollected",
  WISP_CONTACT: "app:neonLabyrinth:wispContact",
  CLARITY_PULSE: "app:neonLabyrinth:clarityPulse",
  FELL: "app:neonLabyrinth:fell",
  VOID_CAUGHT: "app:neonLabyrinth:voidCaught",
  EXFIL_REACHED: "app:neonLabyrinth:exfilReached",
} as const;
