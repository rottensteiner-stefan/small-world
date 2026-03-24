export declare class CubeTexture {
    uuid: string;
    images: (ImageBitmap | HTMLImageElement)[];
    isLoaded: boolean;
    constructor(urls?: string[]);
    load(urls: string[]): Promise<void>;
}
