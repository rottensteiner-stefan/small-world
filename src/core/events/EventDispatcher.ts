import { EventType } from "../../enums/EventType.js";

export type EventHandler = (event: any) => void;

export class EventDispatcher {
  private _listeners = new Map<string, EventHandler[]>();

  // Wir erlauben 'string | EventType' für maximale Flexibilität und Typsicherheit
  public addEventListener(type: string | EventType, listener: EventHandler): void {
    const eventName = type as string;
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, []);
    }
    this._listeners.get(eventName)!.push(listener);
  }

  public removeEventListener(type: string | EventType, listener: EventHandler): void {
    const eventName = type as string;
    const listeners = this._listeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public dispatchEvent(type: string | EventType, eventData: any = {}): void {
    const eventName = type as string;
    const listeners = this._listeners.get(eventName);
    if (listeners) {
      eventData.type = eventName;
      const listenersCopy = listeners.slice(0);
      for (const listener of listenersCopy) {
        listener(eventData);
      }
    }
  }
}
