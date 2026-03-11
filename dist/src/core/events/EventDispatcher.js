export class EventDispatcher {
    _listeners = new Map();
    // Wir erlauben 'string | EventType' für maximale Flexibilität und Typsicherheit
    addEventListener(type, listener) {
        const eventName = type;
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, []);
        }
        this._listeners.get(eventName).push(listener);
    }
    removeEventListener(type, listener) {
        const eventName = type;
        const listeners = this._listeners.get(eventName);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    dispatchEvent(type, eventData = {}) {
        const eventName = type;
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
//# sourceMappingURL=EventDispatcher.js.map