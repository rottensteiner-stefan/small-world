/**
 * Event names Hollow Circuit dispatches on the shared `EventDispatcherImpl` bus,
 * used to decouple gameplay logic (HollowCircuitController) from presentation
 * (HollowCircuitHud).
 */
export const Events = {
  DISC_COLLECTED: "app:hollowCircuit:discCollected",
  WISP_CONTACT: "app:hollowCircuit:wispContact",
  CLARITY_PULSE: "app:hollowCircuit:clarityPulse",
  FELL: "app:hollowCircuit:fell",
  VOID_CAUGHT: "app:hollowCircuit:voidCaught",
} as const;
