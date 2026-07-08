/// src/core/events/EventDispatcherImpl.ts
import { EventType } from "../../enums/index.js";
import { Events, EventHandler } from "../../interfaces/index.js";

/**
 * Standard implementation of the Events interface.
 */
export class EventDispatcherImpl implements Events {
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
      if (-1 !== index) {
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
