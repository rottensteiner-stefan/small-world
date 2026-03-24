import { EventType } from '../../enums/EventType.js';
import { EventDispatcher } from '../../interfaces/EventDispatcher.js';
export type EventHandler = (event: Record<string, unknown>) => void;
export declare class EventDispatcherImpl implements EventDispatcher {
    private _listeners;
    addEventListener(type: string | EventType, listener: EventHandler): void;
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}
