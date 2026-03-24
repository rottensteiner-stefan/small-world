export declare const TextureWrap: {
    readonly REPEAT: "repeat";
    readonly CLAMP_TO_EDGE: "clamp-to-edge";
    readonly MIRRORED_REPEAT: "mirror-repeat";
};
export type TextureWrap = (typeof TextureWrap)[keyof typeof TextureWrap];
