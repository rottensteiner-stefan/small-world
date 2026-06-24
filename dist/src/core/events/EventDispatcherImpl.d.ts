import { EventType } from '../../enums/index.js';
import { Events, EventHandler } from '../../interfaces/index.js';
/**
 * Standard implementation of the Events interface.
 */
export declare class EventDispatcherImpl implements Events {
    private _listeners;
    /**
     * @inheritdoc
     */
    addEventListener(type: string | EventType, listener: EventHandler): void;
    /**
     * @inheritdoc
     */
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    /**
     * @inheritdoc
     */
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}
