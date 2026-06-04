/// src/core/events/EventDispatcherImpl.ts
/**
 * Standard implementation of the Events interface.
 */
export class EventDispatcherImpl {
    _listeners = new Map();
    /**
     * @inheritdoc
     */
    addEventListener(type, listener) {
        const eventName = type;
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, []);
        }
        this._listeners.get(eventName).push(listener);
    }
    /**
     * @inheritdoc
     */
    removeEventListener(type, listener) {
        const eventName = type;
        const listeners = this._listeners.get(eventName);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (-1 !== index) {
                listeners.splice(index, 1);
            }
        }
    }
    /**
     * @inheritdoc
     */
    dispatchEvent(type, eventData = {}) {
        const eventName = type;
        const listeners = this._listeners.get(eventName);
        if (listeners) {
            eventData["type"] = eventName;
            const listenersCopy = listeners.slice(0);
            for (const listener of listenersCopy) {
                listener(eventData);
            }
        }
    }
}
//# sourceMappingURL=EventDispatcherImpl.js.map