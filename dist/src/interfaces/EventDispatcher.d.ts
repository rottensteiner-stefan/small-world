import { EventHandler } from '../core/events/EventDispatcherImpl.js';
import { EventType } from '../enums/EventType.js';
export interface EventDispatcher {
    addEventListener(type: string | EventType, listener: EventHandler): void;
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}
