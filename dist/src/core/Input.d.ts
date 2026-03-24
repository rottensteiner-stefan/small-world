import { Keys } from '../enums/Keys.js';
export declare class Input {
    private static keys;
    static mouse: {
        x: number;
        y: number;
        dx: number;
        dy: number;
        right: boolean;
    };
    static isPointerLocked: boolean;
    static debug: boolean;
    static init(): void;
    static requestPointerLock(element: HTMLElement): void;
    static isPressed(code: string | Keys): boolean;
    static getAxis(neg: string | Keys, pos: string | Keys): number;
}
