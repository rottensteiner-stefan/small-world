/**
 * Types of events dispatched by the engine.
 */
export declare const EventType: {
    /** Dispatched when a loader finishes. */
    readonly LOADER_END: "LoaderEnd";
    /** Dispatched when a loader encounters an error. */
    readonly LOADER_ERROR: "LoaderError";
    /** Dispatched when a loader makes progress. */
    readonly LOADER_PROGRESS: "LoaderProgress";
    /** Dispatched when a loader starts. */
    readonly LOADER_START: "LoaderStart";
};
/** Type definition for EventType. */
export type EventType = (typeof EventType)[keyof typeof EventType];
