export declare const ToolEvents: {
    readonly Pixler: {
        readonly LOAD_BASE64: "tool:pixler:loadBase64";
        readonly IMAGE_SAVED: "tool:pixler:imageSaved";
    };
    readonly Xtractor: {
        readonly EXTRACTED: "tool:xtractor:extracted";
    };
};
export type ToolEvents = typeof ToolEvents;
