/// src/interfaces/Events.ts

import { EventHandler } from "../core/index.js"; // Wird gleich angepasst
import { EventType } from "../enums/index.js";
export interface Events {
  addEventListener(type: string | EventType, listener: EventHandler): void;
  removeEventListener(type: string | EventType, listener: EventHandler): void;
  dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}
