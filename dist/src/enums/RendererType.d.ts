export declare const RendererType: {
    readonly BEST: "BEST";
    readonly WEB_GPU: "WEB_GPU";
    readonly WEB_GL2: "WEB_GL2";
    readonly WEB_GL1: "WEB_GL1";
    readonly CANVAS: "CANVAS";
};
export type RendererType = (typeof RendererType)[keyof typeof RendererType];
