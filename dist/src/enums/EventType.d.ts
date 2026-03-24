export declare const EventType: {
    readonly LOADER_END: "LoaderEnd";
    readonly LOADER_ERROR: "LoaderError";
    readonly LOADER_PROGRESS: "LoaderProgress";
    readonly LOADER_START: "LoaderStart";
};
export type EventType = (typeof EventType)[keyof typeof EventType];
