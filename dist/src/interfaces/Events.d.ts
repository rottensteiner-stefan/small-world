import { EventHandler } from '../core/index.js';
import { EventType } from '../enums/index.js';
export interface Events {
    addEventListener(type: string | EventType, listener: EventHandler): void;
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}
