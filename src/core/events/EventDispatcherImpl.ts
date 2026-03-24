/// src/core/events/EventDispatcherImpl.ts
import { EventType } from "../../enums/EventType.js";
import { EventDispatcher } from "../../interfaces/EventDispatcher.js";

/**
 * Type definition for event handler functions.
 */
export type EventHandler = (event: Record<string, unknown>) => void;

/**
 * Standard implementation of the EventDispatcher interface.
 */
export class EventDispatcherImpl implements EventDispatcher {
  private _listeners: Map<string, EventHandler[]> = new Map<string, EventHandler[]>();

  /**
   * @inheritdoc
   */
  public addEventListener(type: string | EventType, listener: EventHandler): void {
    const eventName: string = type as string;
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, []);
    }
    this._listeners.get(eventName)!.push(listener);
  }

  /**
   * @inheritdoc
   */
  public removeEventListener(type: string | EventType, listener: EventHandler): void {
    const eventName: string = type as string;
    const listeners: EventHandler[] | undefined = this._listeners.get(eventName);
    if (listeners) {
      const index: number = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * @inheritdoc
   */
  public dispatchEvent(type: string | EventType, eventData: Record<string, unknown> = {}): void {
    const eventName: string = type as string;
    const listeners: EventHandler[] | undefined = this._listeners.get(eventName);
    if (listeners) {
      eventData["type"] = eventName;
      const listenersCopy: EventHandler[] = listeners.slice(0);
      for (const listener of listenersCopy) {
        listener(eventData);
      }
    }
  }
}
