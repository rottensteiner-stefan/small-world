declare global {
    interface Window {
        update3DTextures?: (diffuseCanvas: HTMLCanvasElement, normalCanvas: HTMLCanvasElement, roughnessCanvas: HTMLCanvasElement, normalStrength: number, metallicValue: number, roughnessValue: number) => Promise<void>;
        update3DGeometry?: (geomType: string) => void;
    }
}
export {};
